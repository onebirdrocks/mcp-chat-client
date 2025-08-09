import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">MCP Chat UI</h1>
        <p className="text-lg mb-8 text-gray-600">
          A modern chat interface for Model Context Protocol servers
        </p>
        <div className="space-x-4">
          <Link 
            href="/chat" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Chatting
          </Link>
          <Link 
            href="/settings" 
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}