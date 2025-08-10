import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Chat History',
  description: 'View and manage your chat sessions and conversation history',
}

export default function HistoryPage() {
  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Chat History
          </h1>
          
          {/* Empty State */}
          <div className="mt-8 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Chat Sessions</h3>
            <p className="text-sm mb-4">You don't have any chat sessions yet. Start a new conversation to see history here.</p>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Start New Chat
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}