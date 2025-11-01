import React, { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  isTyping?: boolean;
}

interface TranscriptPanelProps {
  messages: Message[];
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy JSON');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const conversationJson = JSON.stringify(
    messages.map(({ isTyping, ...rest }) => rest),
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(conversationJson);
    setCopyButtonText('Copied!');
    setTimeout(() => {
      setCopyButtonText('Copy JSON');
    }, 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([conversationJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Conversation</h2>
            <p className="text-sm text-white/50 mt-0.5">Real-time transcript of your conversation with Luna</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white/70 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors"
          >
            Export
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-white/70 text-sm font-medium mb-2">No messages yet</h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  Enter a prompt and connect to start talking.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="group">
                {/* Message Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    message.role === 'user' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {message.role === 'user' ? 'U' : 'L'}
                  </div>
                  <span className="text-sm font-medium text-white/90">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-xs text-white/30 ml-auto">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Content */}
                <div className={`pl-8 text-sm leading-relaxed ${
                  message.role === 'user' ? 'text-white/80' : 'text-white/90'
                }`}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Info */}
        <div className="border-t border-white/10 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{messages.length} messages</span>
            <span>Live transcript</span>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Conversation Transcript</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-black/30 max-h-[60vh] overflow-y-auto">
              {messages.length > 0 ? (
                <pre className="text-sm text-white/80 whitespace-pre-wrap break-all">
                  <code>{conversationJson}</code>
                </pre>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/60">Start a conversation to view the transcript.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={handleDownload}
                disabled={messages.length === 0}
                className="px-4 py-2 text-sm font-semibold bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download
              </button>
              <button
                onClick={handleCopy}
                disabled={messages.length === 0}
                className="px-4 py-2 text-sm font-semibold bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copyButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

