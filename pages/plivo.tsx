import React, { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * Plivo Telephony Integration Test Page
 * 
 * This page allows you to:
 * 1. Configure session settings (instructions, temperature, etc.)
 * 2. Generate config tokens
 * 3. Test the answer URL
 * 4. Make outbound test calls (if Plivo credentials configured)
 * 
 * Use this to verify your Luna + Plivo integration before deploying.
 */

interface ConfigToken {
  config_token: string;
  expires_at: number;
}

interface CallResult {
  success: boolean;
  call_uuid?: string;
  message?: string;
  error?: string;
  details?: any;
}

export default function PlivoTestPage() {
  // Session Configuration
  const [instructions, setInstructions] = useState(
    `You are a helpful phone assistant. Keep your responses brief and conversational - remember this is a phone call, not a text chat.`
  );
  const [temperature, setTemperature] = useState(0.8);
  const [silenceTimeout, setSilenceTimeout] = useState(30);
  const [vadThreshold, setVadThreshold] = useState(0.5);

  // Call Configuration
  const [toNumber, setToNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');

  // State
  const [configToken, setConfigToken] = useState<ConfigToken | null>(null);
  const [answerUrl, setAnswerUrl] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isMakingCall, setIsMakingCall] = useState(false);
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // Generate answer URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setAnswerUrl(`${baseUrl}/api/plivo/answer`);
    }
  }, []);

  // Generate config token
  const generateToken = async () => {
    setIsGeneratingToken(true);
    setError('');
    setConfigToken(null);

    try {
      const response = await fetch('/api/plivo/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions,
          temperature,
          silence_timeout: silenceTimeout,
          vad_threshold: vadThreshold,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Failed to generate token');
      }

      const data = await response.json();
      setConfigToken(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Make outbound call
  const makeCall = async () => {
    if (!toNumber || !fromNumber) {
      setError('Please enter both To and From phone numbers');
      return;
    }

    setIsMakingCall(true);
    setError('');
    setCallResult(null);

    try {
      const response = await fetch('/api/plivo/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: toNumber,
          from_number: fromNumber,
          instructions,
          temperature,
          silence_timeout: silenceTimeout,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setCallResult({ success: false, error: data.error, details: data.details });
      } else {
        setCallResult(data);
      }
    } catch (err: any) {
      setCallResult({ success: false, error: err.message });
    } finally {
      setIsMakingCall(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  // Format timestamp
  const formatExpiry = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // Get answer URL with token
  const getAnswerUrlWithToken = () => {
    if (!configToken) return answerUrl;
    return `${answerUrl}?config_token=${encodeURIComponent(configToken.config_token)}`;
  };

  return (
    <>
      <Head>
        <title>Plivo Integration Test | Luna Reference</title>
        <meta name="description" content="Test Luna + Plivo telephony integration" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              📞 Plivo Integration Test
            </h1>
            <p className="text-purple-200">
              Test your Luna + Plivo telephony integration
            </p>
            <a 
              href="/dashboard" 
              className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
            >
              ← Back to WebRTC Dashboard
            </a>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="grid gap-6">
            {/* Session Configuration */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>⚙️</span> Session Configuration
              </h2>

              <div className="space-y-4">
                {/* Instructions */}
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">
                    System Instructions
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter system instructions for the AI..."
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Tip: Keep prompts concise for phone - users can&apos;t see long responses
                  </p>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      Temperature: {temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      Silence Timeout: {silenceTimeout}s
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="5"
                      value={silenceTimeout}
                      onChange={(e) => setSilenceTimeout(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      VAD Threshold: {vadThreshold}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={vadThreshold}
                      onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>

                {/* Generate Token Button */}
                <button
                  onClick={generateToken}
                  disabled={isGeneratingToken}
                  className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isGeneratingToken ? '⏳ Generating...' : '🎫 Generate Config Token'}
                </button>
              </div>
            </div>

            {/* Config Token Result */}
            {configToken && (
              <div className="bg-green-500/10 backdrop-blur rounded-xl p-6 border border-green-500/30">
                <h2 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <span>✅</span> Config Token Generated
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-green-200 text-sm font-medium mb-1">
                      Token (expires at {formatExpiry(configToken.expires_at)})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={configToken.config_token}
                        readOnly
                        className="flex-1 px-4 py-2 bg-black/30 border border-green-500/30 rounded-lg text-green-200 text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(configToken.config_token, 'token')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        {copied === 'token' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-200 text-sm font-medium mb-1">
                      Answer URL (with token)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={getAnswerUrlWithToken()}
                        readOnly
                        className="flex-1 px-4 py-2 bg-black/30 border border-green-500/30 rounded-lg text-green-200 text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(getAnswerUrlWithToken(), 'url')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        {copied === 'url' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Answer URL Info */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔗</span> Plivo Answer URL
              </h2>

              <p className="text-gray-300 text-sm mb-4">
                Configure this URL as your Plivo Application&apos;s Answer URL. When a call is answered, 
                Plivo will fetch XML from this endpoint to connect to Luna.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={answerUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-purple-200 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(answerUrl, 'answer')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                >
                  {copied === 'answer' ? '✓' : 'Copy'}
                </button>
              </div>

              <p className="text-yellow-400 text-xs mt-3">
                ⚠️ For testing, you may need to use ngrok or similar to expose this URL publicly.
              </p>
            </div>

            {/* Make Outbound Call */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>📱</span> Make Test Call
              </h2>

              <p className="text-gray-300 text-sm mb-4">
                Initiate an outbound call to test the integration. Requires Plivo credentials in .env.local
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">
                    To Number (recipient)
                  </label>
                  <input
                    type="tel"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    placeholder="+14155551234"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">
                    From Number (your Plivo number)
                  </label>
                  <input
                    type="tel"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="+14155559876"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={makeCall}
                disabled={isMakingCall || !toNumber || !fromNumber}
                className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isMakingCall ? '📞 Calling...' : '📞 Make Call'}
              </button>

              {/* Call Result */}
              {callResult && (
                <div className={`mt-4 p-4 rounded-lg ${callResult.success ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
                  {callResult.success ? (
                    <div className="text-green-200">
                      <strong>✅ Call Initiated!</strong>
                      <p className="text-sm mt-1">UUID: {callResult.call_uuid}</p>
                      <p className="text-sm">{callResult.message}</p>
                    </div>
                  ) : (
                    <div className="text-red-200">
                      <strong>❌ Call Failed</strong>
                      <p className="text-sm mt-1">{callResult.error}</p>
                      {callResult.details && (
                        <pre className="text-xs mt-2 overflow-auto">
                          {JSON.stringify(callResult.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documentation */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>📚</span> Integration Steps
              </h2>

              <ol className="text-gray-300 space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span>
                    <strong>Configure Environment:</strong> Add <code className="bg-black/30 px-1 rounded">PLIVO_AUTH_ID</code> and <code className="bg-black/30 px-1 rounded">PLIVO_AUTH_TOKEN</code> to your .env.local
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span>
                    <strong>Expose URL:</strong> Use ngrok or deploy to make Answer URL publicly accessible
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span>
                    <strong>Configure Plivo:</strong> Set the Answer URL in your Plivo Application settings
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">4.</span>
                  <span>
                    <strong>Test:</strong> Make a test call or call your Plivo number
                  </span>
                </li>
              </ol>

              <div className="mt-4 p-4 bg-purple-500/20 rounded-lg">
                <h3 className="text-purple-200 font-medium mb-2">Quick ngrok Setup:</h3>
                <code className="text-purple-300 text-sm">
                  ngrok http 3000
                </code>
                <p className="text-gray-400 text-xs mt-2">
                  Then use the ngrok URL as your Answer URL base.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

