import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import TranscriptPanel from '../components/TranscriptPanel';

/**
 * WebRTC Voice AI Demo
 * 
 * This demonstrates OpenAI-compatible WebRTC API integration.
 * 
 * Features:
 * - WebRTC connection setup
 * - Real-time audio streaming
 * - Event-driven communication
 * - Session updates (change prompt/settings mid-conversation)
 * - Server-side VAD configuration
 * - Mute controls
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  isTyping?: boolean;
}

interface VADConfig {
  threshold: number;
  prefix_padding_ms: number;
  silence_duration_ms: number;
}

interface EventLog {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export default function Dashboard() {
  // UI State
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hint, setHint] = useState('Click Connect to start');
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isLunaMuted, setIsLunaMuted] = useState(false);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [showEvents, setShowEvents] = useState(true);

  // Session Configuration
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful and friendly AI assistant.');
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(50);
  
  // VAD Configuration
  const [vadThreshold, setVadThreshold] = useState(0.5);
  const [vadPrefixPadding, setVadPrefixPadding] = useState(300);
  const [vadSilenceDuration, setVadSilenceDuration] = useState(500);

  // Active Session State (what's currently running)
  const [activePrompt, setActivePrompt] = useState('');
  const [activeVAD, setActiveVAD] = useState<VADConfig>({ threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 });

  // WebRTC References
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const isInitializingRef = useRef(false);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if settings have changed
  const promptChanged = isConnected && systemPrompt !== activePrompt;
  const vadChanged = isConnected && (
    vadThreshold !== activeVAD.threshold ||
    vadPrefixPadding !== activeVAD.prefix_padding_ms ||
    vadSilenceDuration !== activeVAD.silence_duration_ms
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceDetectionIntervalRef.current) {
        clearInterval(silenceDetectionIntervalRef.current);
      }
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Fetch ICE servers from backend
   * Required for WebRTC connection establishment
   */
  const fetchIceServers = async () => {
    try {
      const response = await fetch('/api/ice-servers');
      if (!response.ok) throw new Error('Failed to fetch ICE servers');
      return await response.json();
    } catch (error) {
      console.error('ICE servers error:', error);
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  };

  /**
   * Typewriter effect for displaying messages
   */
  const typewriterEffect = (text: string, role: 'user' | 'assistant', callback?: () => void) => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    isTypingRef.current = true;

    setMessages(prev => [...prev, {
      role,
      content: '',
      timestamp: new Date(),
      isTyping: true
    }]);

    let currentIndex = 0;
    const typeSpeed = 30;

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        currentIndex++;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.isTyping) {
            lastMessage.content = text.substring(0, currentIndex);
          }
          return newMessages;
        });
        typewriterTimeoutRef.current = setTimeout(typeNextChar, typeSpeed);
      } else {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.isTyping) {
            lastMessage.isTyping = false;
          }
          return newMessages;
        });
        
        isTypingRef.current = false;
        if (callback) callback();
      }
    };

    typeNextChar();
  };

  /**
   * Silence detection for stopping speaking animation
   */
  const startSilenceDetection = () => {
    if (silenceDetectionIntervalRef.current) {
      clearInterval(silenceDetectionIntervalRef.current);
    }

    let retries = 0;
    const maxRetries = 20;

    const tryStart = () => {
      if (!analyserRef.current && retries < maxRetries) {
        retries++;
        setTimeout(tryStart, 100);
        return;
      }

      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let silenceFrames = 0;
      const silenceThreshold = 2;
      const requiredSilenceFrames = 8;

      silenceDetectionIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average < silenceThreshold) {
          silenceFrames++;
          if (silenceFrames >= requiredSilenceFrames) {
            setIsAISpeaking(false);
          }
        } else {
          silenceFrames = 0;
        }
      }, 100);
    };

    tryStart();
  };

  /**
   * Add event to log
   */
  const addEventLog = (eventType: string, eventData: any) => {
    const newEvent: EventLog = {
      id: `${Date.now()}-${Math.random()}`,
      type: eventType,
      timestamp: new Date(),
      data: eventData
    };
    
    setEventLogs(prev => {
      const updated = [newEvent, ...prev];
      return updated.slice(0, 50); // Keep last 50 events
    });
  };

  /**
   * Handle incoming WebRTC data channel messages
   * These are OpenAI-compatible server events
   */
  const handleDataChannelMessage = (data: string) => {
    try {
      const event = JSON.parse(data);
      console.log('📨 Server Event:', event.type, event);
      
      // Add to event log
      addEventLog(event.type, event);

      switch (event.type) {
        case 'session.created':
          console.log('✅ Session created:', event.session?.id);
          break;

        case 'session.updated':
          console.log('✅ Session updated successfully');
          // Update active state to reflect what's now running
          if (event.session?.instructions) {
            setActivePrompt(event.session.instructions);
          }
          if (event.session?.turn_detection) {
            setActiveVAD({
              threshold: event.session.turn_detection.threshold,
              prefix_padding_ms: event.session.turn_detection.prefix_padding_ms,
              silence_duration_ms: event.session.turn_detection.silence_duration_ms,
            });
          }
          break;

        case 'input_audio_buffer.speech_started':
          setIsUserSpeaking(true);
          setIsAISpeaking(false);
          break;

        case 'input_audio_buffer.speech_stopped':
          setIsUserSpeaking(false);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          const userTranscript = event.transcript;
          if (userTranscript && isTypingRef.current) {
            const checkAndType = () => {
              if (!isTypingRef.current) {
                typewriterEffect(userTranscript, 'user');
              } else {
                setTimeout(checkAndType, 100);
              }
            };
            checkAndType();
          } else if (userTranscript) {
            typewriterEffect(userTranscript, 'user');
          }
          break;

        case 'response.audio_transcript.done':
          const assistantTranscript = event.transcript;
          if (assistantTranscript) {
            // Wait for user transcript to finish, then display AI response
            const displayAssistant = () => {
              if (!isTypingRef.current) {
                typewriterEffect(assistantTranscript, 'assistant');
              } else {
                setTimeout(displayAssistant, 100);
              }
            };
            // Small delay to ensure user transcript is complete
            setTimeout(displayAssistant, 500);
          }
          setIsUserSpeaking(false);
          setIsAISpeaking(true);
          startSilenceDetection();
          break;

        case 'response.done':
          setIsAISpeaking(false);
          break;

        case 'error':
          console.error('❌ Server Error:', event.error);
          setIsUserSpeaking(false);
          setIsAISpeaking(false);
          break;

        default:
          // Log other events for debugging
          break;
      }
    } catch (err) {
      console.error('Error parsing event:', err);
    }
  };

  /**
   * Send session.update event to change configuration mid-conversation
   * This demonstrates real-time configuration updates
   */
  const updateSession = () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('❌ Cannot update session: Data channel not ready');
      return;
    }

    const updateEvent = {
      type: 'session.update',
      session: {
        instructions: systemPrompt,
        temperature: temperature,
        top_p: topP,
        top_k: topK,
        turn_detection: {
          type: 'server_vad',
          threshold: vadThreshold,
          prefix_padding_ms: vadPrefixPadding,
          silence_duration_ms: vadSilenceDuration,
        }
      }
    };

    console.log('📤 Sending session.update:', updateEvent);
    
    // Add to event log for visibility
    addEventLog('session.update (sent)', {
      type: 'session.update',
      session: {
        instructions: systemPrompt.substring(0, 100) + '...',
        temperature,
        top_p: topP,
        top_k: topK,
      }
    });
    
    dataChannelRef.current.send(JSON.stringify(updateEvent));
    
    setHint('🔄 Session update sent - watch Event Log!');
    setTimeout(() => {
      setHint('Speak naturally • AI is listening');
    }, 3000);
  };

  /**
   * Mute/unmute controls
   */
  const toggleUserMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsUserMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleLunaMute = () => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !audioElementRef.current.muted;
      setIsLunaMuted(audioElementRef.current.muted);
    }
  };

  /**
   * Close WebRTC connection and cleanup resources
   */
  const closeConnection = () => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
      typewriterTimeoutRef.current = null;
    }
    
    if (silenceDetectionIntervalRef.current) {
      clearInterval(silenceDetectionIntervalRef.current);
      silenceDetectionIntervalRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    isTypingRef.current = false;
    setIsUserMuted(false);
    setIsLunaMuted(false);
    setIsUserSpeaking(false);
    setIsAISpeaking(false);
    setIsConnected(false);
    setHint('Click Connect to start');
  };

  /**
   * Initialize WebRTC connection
   * This follows the OpenAI Realtime API pattern
   */
  const initWebRTC = async () => {
    if (isInitializingRef.current) return;

    isInitializingRef.current = true;
    setHint('Connecting...');
    setActivePrompt(systemPrompt);
    setActiveVAD({ threshold: vadThreshold, prefix_padding_ms: vadPrefixPadding, silence_duration_ms: vadSilenceDuration });

    try {
      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Connection state handling
      pc.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setHint('Speak naturally • AI is listening');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setIsConnected(false);
          if (pc.connectionState === 'failed') {
            setHint('Connection failed • Try again');
          }
        }
      };

      // Create data channel for events (OpenAI-compatible)
      const dataChannel = pc.createDataChannel('oai-events', { ordered: true });
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('✅ Data channel opened');
        setHint('Speak naturally • AI is listening');
      };

      dataChannel.onmessage = (event) => {
        handleDataChannelMessage(event.data);
      };

      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
      };

      dataChannel.onclose = () => {
        console.log('📪 Data channel closed');
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          // ICE gathering complete, send offer to backend
          if (!pc.localDescription) return;

          const config = {
            sdp: pc.localDescription.sdp,
            custom_prompt: systemPrompt.trim() || '',
            temperature: temperature,
            top_p: topP,
            top_k: topK,
            vad_threshold: vadThreshold,
            vad_prefix_padding_ms: vadPrefixPadding,
            vad_silence_duration_ms: vadSilenceDuration,
          };

          console.log('📤 Sending offer to backend API');

          fetch('/api/offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          })
            .then(response => {
              if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
              }
              return response.text();
            })
            .then(answerSDP => {
              return pc.setRemoteDescription({ 
                type: 'answer', 
                sdp: answerSDP 
              });
            })
            .then(() => {
              console.log('✅ WebRTC connection established');
            })
            .catch((error) => {
              console.error('❌ Connection error:', error);
              setHint('Connection failed • Try again');
            })
            .finally(() => {
              isInitializingRef.current = false;
            });
        }
      };

      // Handle incoming audio track
      pc.ontrack = (event) => {
        if (event.track.kind === 'audio') {
          console.log('🔊 Audio track received');
          const audioEl = document.createElement('audio');
          audioEl.srcObject = event.streams[0];
          audioEl.autoplay = true;
          audioEl.style.display = 'none';
          audioEl.muted = isLunaMuted;
          document.body.appendChild(audioEl);
          audioElementRef.current = audioEl;

          // Setup audio analyser for silence detection
          try {
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;
          } catch (e) {
            console.error('Audio analyser setup failed:', e);
          }
        }
      };

      // Get user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;

      const [audioTrack] = stream.getAudioTracks();
      if (audioTrack) {
        audioTrack.enabled = !isUserMuted;
        
        // Set audio constraints
        try {
          await audioTrack.applyConstraints({
            channelCount: 1,
            sampleRate: 48000
          });
        } catch (e) {
          console.warn('Could not apply audio constraints:', e);
        }

        const sender = pc.addTrack(audioTrack, stream);
        
        // Set bitrate
        try {
          const params = sender.getParameters();
          const target = 32000;
          if (!params.encodings || !params.encodings.length) {
            params.encodings = [{ maxBitrate: target }];
          } else {
            params.encodings = params.encodings.map(e => ({ ...e, maxBitrate: target }));
          }
          await sender.setParameters(params);
        } catch (e) {
          console.warn('Could not set bitrate:', e);
        }
      }

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

    } catch (error) {
      console.error('❌ WebRTC initialization error:', error);
      setHint('Please allow microphone access and reload');
      isInitializingRef.current = false;
      setIsConnected(false);
    }
  };

  const handleConnect = () => {
    if (!pcRef.current || pcRef.current.connectionState === 'closed' || pcRef.current.connectionState === 'failed') {
      if (!isInitializingRef.current) {
        setMessages([]);
        setEventLogs([]);
        initWebRTC();
      }
    }
  };

  const handleDisconnect = () => {
    closeConnection();
  };

  return (
    <>
      <Head>
        <title>WebRTC Voice AI Demo</title>
        <meta name="description" content="Real-time voice AI integration demo" />
      </Head>

      {/* Main Layout */}
      <div className="h-screen bg-black flex flex-col">
        {/* Top Navigation */}
        <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm z-30">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-medium text-white/90">Voice AI Demo</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Mute Controls */}
              {isConnected && (
                <>
                  <button
                    onClick={toggleUserMute}
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isUserMuted 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isUserMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {isUserMuted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                    <span className="hidden md:inline">{isUserMuted ? 'Mic Off' : 'Mic On'}</span>
                  </button>

                  <button
                    onClick={toggleLunaMute}
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isLunaMuted 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isLunaMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isLunaMuted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                    <span className="hidden md:inline">{isLunaMuted ? 'Audio Off' : 'Audio On'}</span>
                  </button>
                </>
              )}

              {/* Show/Hide Events Toggle */}
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{showEvents ? 'Hide Events' : 'Show Events'}</span>
              </button>

              {/* Connection Status */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-sm text-white/70">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Mobile Config Toggle */}
              <button
                onClick={() => setIsConfigVisible(true)}
                className="md:hidden p-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Side - Transcript & Events */}
          <div className="w-full md:w-[60%] border-r border-white/10 bg-black/20 flex flex-col">
            {/* Transcript Panel */}
            <div className={`${showEvents ? 'h-1/2' : 'h-full'} border-b border-white/10`}>
              <TranscriptPanel messages={messages} />
            </div>
            
            {/* Event Log Panel */}
            {showEvents && (
              <div className="h-1/2 flex flex-col">
                {/* Header */}
                <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Event Log</h2>
                    <p className="text-sm text-white/50 mt-0.5">Real-time WebRTC events</p>
                  </div>
                  <button
                    onClick={() => setShowEvents(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white/70 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors"
                  >
                    Hide
                  </button>
                </div>

                {/* Events */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                  {eventLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-white/70 text-sm font-medium mb-2">No events yet</h3>
                        <p className="text-white/40 text-xs leading-relaxed">
                          Connect to start seeing WebRTC events
                        </p>
                      </div>
                    </div>
                  ) : (
                    eventLogs.map((log) => (
                      <div key={log.id} className="group bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              log.type.includes('error') ? 'bg-red-500' :
                              log.type.includes('session') ? 'bg-blue-500' :
                              log.type.includes('response') ? 'bg-purple-500' :
                              log.type.includes('input') ? 'bg-green-500' :
                              'bg-gray-500'
                            }`}></div>
                            <span className="text-xs font-mono text-white/90 font-medium">
                              {log.type}
                            </span>
                          </div>
                          <span className="text-xs text-white/40">
                            {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* Event Details */}
                        {log.type === 'conversation.item.input_audio_transcription.completed' && log.data.transcript && (
                          <div className="mt-2 pl-4 border-l-2 border-green-500/50 bg-green-500/5 rounded-r p-2">
                            <div className="text-xs font-semibold text-green-400 mb-1">User Said:</div>
                            <div className="text-sm text-white/80 leading-relaxed">{log.data.transcript}</div>
                          </div>
                        )}
                        
                        {log.type === 'response.audio_transcript.done' && log.data.transcript && (
                          <div className="mt-2 pl-4 border-l-2 border-purple-500/50 bg-purple-500/5 rounded-r p-2">
                            <div className="text-xs font-semibold text-purple-400 mb-1">AI Response:</div>
                            <div className="text-sm text-white/80 leading-relaxed">{log.data.transcript}</div>
                          </div>
                        )}
                        
                        {log.type === 'session.created' && (
                          <div className="mt-2 pl-4 border-l-2 border-blue-500/50 bg-blue-500/5 rounded-r p-2">
                            <div className="text-xs text-blue-400">
                              Session ID: <span className="font-mono">{log.data.session?.id || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                        
                        {log.type === 'error' && log.data.error && (
                          <div className="mt-2 pl-4 border-l-2 border-red-500/50 bg-red-500/5 rounded-r p-2">
                            <div className="text-xs font-semibold text-red-400 mb-1">Error:</div>
                            <div className="text-xs text-red-300">{log.data.error.message || JSON.stringify(log.data.error)}</div>
                          </div>
                        )}
                        
                        {log.type === 'session.update (sent)' && (
                          <div className="mt-2 pl-4 border-l-2 border-blue-500/50 bg-blue-500/5 rounded-r p-2">
                            <div className="text-xs font-semibold text-blue-400 mb-1">📤 Sent to Server:</div>
                            <div className="text-xs text-blue-300">
                              Temperature: {log.data.session?.temperature}, 
                              Top P: {log.data.session?.top_p}, 
                              Top K: {log.data.session?.top_k}
                            </div>
                            {log.data.session?.instructions && (
                              <div className="text-xs text-white/60 mt-1">
                                Prompt: {log.data.session.instructions}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {log.type === 'session.updated' && (
                          <div className="mt-2 pl-4 border-l-2 border-blue-500/50 bg-blue-500/5 rounded-r p-2">
                            <div className="text-xs text-blue-400">✅ Server confirmed: Session updated successfully!</div>
                          </div>
                        )}
                        
                        {log.type === 'input_audio_buffer.speech_started' && (
                          <div className="mt-2 pl-4 border-l-2 border-green-500/50 bg-green-500/5 rounded-r p-2">
                            <div className="text-xs text-green-400">🎤 User started speaking</div>
                          </div>
                        )}
                        
                        {log.type === 'input_audio_buffer.speech_stopped' && (
                          <div className="mt-2 pl-4 border-l-2 border-green-500/50 bg-green-500/5 rounded-r p-2">
                            <div className="text-xs text-green-400">🔇 User stopped speaking</div>
                          </div>
                        )}
                        
                        {log.type === 'response.created' && (
                          <div className="mt-2 pl-4 border-l-2 border-purple-500/50 bg-purple-500/5 rounded-r p-2">
                            <div className="text-xs text-purple-400">💬 AI started generating response</div>
                          </div>
                        )}
                        
                        {log.type === 'response.done' && (
                          <div className="mt-2 pl-4 border-l-2 border-purple-500/50 bg-purple-500/5 rounded-r p-2">
                            <div className="text-xs text-purple-400">✅ AI finished responding</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-white/10 px-6 py-3">
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{eventLogs.length} events</span>
                    <button
                      onClick={() => setEventLogs([])}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          <div className={`absolute top-0 right-0 h-full w-full max-w-md md:max-w-none md:w-[40%] md:relative transform ${isConfigVisible ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col bg-black z-20 border-l border-white/10`}>
            {/* Mobile Header */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 p-4 md:hidden">
              <h2 className="text-lg font-semibold text-white">Configuration</h2>
              <button onClick={() => setIsConfigVisible(false)} className="p-2 text-white/70 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Config */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* System Prompt */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  System Prompt
                  {isConnected && (
                    <span className="ml-2 text-xs font-normal text-white/50">(Live updates via session.update)</span>
                  )}
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define AI personality and behavior..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-white/20 focus:bg-white/10 placeholder-white/30 transition-all"
                />
                {promptChanged && (
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2 mt-2">
                    Prompt changed. Click "Update Session" to apply.
                  </div>
                )}
                
                {/* Quick Preset Prompts */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-white/50">Quick Presets:</label>
                    {isConnected && (
                      <span className="text-xs text-blue-400">👉 Try changing personality live!</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSystemPrompt('You are a cheerful and enthusiastic AI assistant. Be upbeat, use exclamation marks, and spread positive energy!')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      😊 Cheerful
                    </button>
                    <button
                      onClick={() => setSystemPrompt('You are a professional and formal AI assistant. Be concise, precise, and maintain a business-like tone.')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      👔 Professional
                    </button>
                    <button
                      onClick={() => setSystemPrompt('You are a witty and sarcastic AI assistant. Use humor, clever wordplay, and don\'t take things too seriously.')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      😏 Sarcastic
                    </button>
                    <button
                      onClick={() => setSystemPrompt('You are a wise and calm AI mentor. Speak thoughtfully, share insights, and guide users with patience and wisdom.')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      🧘 Zen Master
                    </button>
                    <button
                      onClick={() => setSystemPrompt('You are an energetic pirate captain! Speak with pirate slang, say "arr" and "matey", and be adventurous!')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      🏴‍☠️ Pirate
                    </button>
                    <button
                      onClick={() => setSystemPrompt('You are a Shakespeare-style poet. Speak in eloquent, dramatic language with poetic flair and classical references.')}
                      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-2 text-xs text-white/70 hover:text-white transition-all"
                    >
                      🎭 Shakespearean
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10"></div>

              {/* Generation Parameters */}
              <div>
                <label className="block text-sm font-semibold text-white mb-4">
                  Generation Parameters
                </label>

                <div className="space-y-5">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">Temperature</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Lower = focused, Higher = creative</p>
                  </div>

                  {/* Top P */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">Top P</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {topP.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Nucleus sampling threshold</p>
                  </div>

                  {/* Top K */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">Top K</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {topK}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Number of top tokens to consider</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10"></div>

              {/* Server-Side VAD Settings */}
              <div>
                <label className="block text-sm font-semibold text-white mb-4">
                  Server-Side VAD Settings
                </label>

                <div className="space-y-5">
                  {/* VAD Threshold */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">VAD Threshold</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {vadThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={vadThreshold}
                      onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Speech detection sensitivity</p>
                  </div>

                  {/* Prefix Padding */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">Prefix Padding (ms)</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {vadPrefixPadding}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={vadPrefixPadding}
                      onChange={(e) => setVadPrefixPadding(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Audio included before speech starts</p>
                  </div>

                  {/* Silence Duration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/70">Silence Duration (ms)</label>
                      <span className="text-xs font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                        {vadSilenceDuration}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={vadSilenceDuration}
                      onChange={(e) => setVadSilenceDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <p className="text-[10px] text-white/40 mt-1">Silence duration to detect turn end</p>
                  </div>
                </div>

                {vadChanged && (
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2 mt-3">
                    VAD settings changed. Click "Update Session" to apply.
                  </div>
                )}
              </div>

              <div className="border-t border-white/10"></div>

              {/* Actions */}
              <div className="space-y-3">
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={isInitializingRef.current}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-white hover:bg-gray-100 text-black shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInitializingRef.current ? 'Connecting...' : 'Connect'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Update Session Button */}
                    {(promptChanged || vadChanged) && (
                      <div className="space-y-2">
                        <button
                          onClick={updateSession}
                          className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform hover:-translate-y-0.5 transition-all"
                        >
                          🔄 Update Session (Live)
                        </button>
                        <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2">
                          💡 This sends a <code className="font-mono bg-blue-500/20 px-1 rounded">session.update</code> event. Watch it in the Event Log below!
                        </div>
                      </div>
                    )}

                    {/* Mute Controls - Mobile */}
                    <div className="grid grid-cols-2 gap-3 md:hidden">
                      <button
                        onClick={toggleUserMute}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isUserMuted 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-white/5 text-white/70 border border-white/10'
                        }`}
                      >
                        {isUserMuted ? 'Mic Off' : 'Mic On'}
                      </button>
                      <button
                        onClick={toggleLunaMute}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isLunaMuted 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-white/5 text-white/70 border border-white/10'
                        }`}
                      >
                        {isLunaMuted ? 'Luna Off' : 'Luna On'}
                      </button>
                    </div>

                    <button
                      onClick={handleDisconnect}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Status Hint */}
              <div className="text-center pt-4">
                <p className="text-xs text-white/50">{hint}</p>
                {isUserSpeaking && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-blue-400 text-sm font-medium">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    Listening...
                  </div>
                )}
                {isAISpeaking && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-purple-400 text-sm font-medium">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    Speaking...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
