import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure LLM providers, MCP servers, and application preferences',
}

export default function Settings() {
  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Settings
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Settings configuration will be implemented here.
          </p>
        </div>
      </div>
    </div>
  )
}