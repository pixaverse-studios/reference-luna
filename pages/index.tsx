import Head from 'next/head';
import Link from 'next/link';

/**
 * Luna Reference Implementation - Landing Page
 * 
 * Choose between WebRTC and Plivo integration demos.
 */

export default function Home() {
  return (
    <>
      <Head>
        <title>Luna Reference Implementation</title>
        <meta name="description" content="Luna Voice AI Integration Examples" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Luna Reference Implementation
            </h1>
            <p className="text-xl text-indigo-200">
              Enterprise-ready integration examples for Luna&apos;s Voice AI
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* WebRTC Card */}
            <Link href="/dashboard" className="group">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:border-indigo-400 transition-all hover:scale-[1.02] hover:bg-white/15">
                <div className="text-6xl mb-4">🎙️</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  WebRTC Dashboard
                </h2>
                <p className="text-indigo-200 mb-4">
                  Real-time voice conversations directly in the browser using WebRTC.
                </p>
                <ul className="text-gray-300 text-sm space-y-1 mb-4">
                  <li>✓ Ephemeral token authentication</li>
                  <li>✓ Live session configuration</li>
                  <li>✓ Server-side VAD</li>
                  <li>✓ Event logging</li>
                </ul>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-medium">
                  Open Dashboard →
                </span>
              </div>
            </Link>

            {/* Plivo Card */}
            <Link href="/plivo" className="group">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:border-green-400 transition-all hover:scale-[1.02] hover:bg-white/15">
                <div className="text-6xl mb-4">📞</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Plivo Telephony
                </h2>
                <p className="text-indigo-200 mb-4">
                  Connect phone calls to Luna&apos;s AI using Plivo Media Streams.
                </p>
                <ul className="text-gray-300 text-sm space-y-1 mb-4">
                  <li>✓ Config token generation</li>
                  <li>✓ Answer URL endpoint</li>
                  <li>✓ Outbound test calls</li>
                  <li>✓ Same prompt layer as WebRTC</li>
                </ul>
                <span className="text-green-400 group-hover:text-green-300 font-medium">
                  Test Plivo →
                </span>
              </div>
            </Link>
          </div>

          {/* Footer Links */}
          <div className="text-center mt-12 space-x-6 text-gray-400">
            <a href="https://github.com" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="/API_REFERENCE.md" className="hover:text-white transition-colors">
              API Docs
            </a>
            <a href="/PLIVO_INTEGRATION.md" className="hover:text-white transition-colors">
              Plivo Guide
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
