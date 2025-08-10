import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'MCP Chat UI - Home',
  description: 'Start a new conversation with AI models through MCP servers',
}

export default function HomePage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to MCP Chat UI
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            A secure, local-first chat interface that connects to your Model Context Protocol servers and supports multiple LLM providers with explicit tool execution control.
          </p>
        </div>

        {/* Quick Start Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Start New Chat</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Begin a conversation with your configured AI models. Choose from available providers and models configured on the server.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              New Chat Session
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Configure Settings</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Manage your LLM providers, MCP server connections, and customize your chat experience preferences.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Open Settings
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Local-first architecture with encrypted API key storage and no external data transmission.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tool Control</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Explicit confirmation required for all MCP tool executions with transparent operation flow.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Multi-Provider</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Support for OpenAI, DeepSeek, OpenRouter and other LLM providers with unified interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}