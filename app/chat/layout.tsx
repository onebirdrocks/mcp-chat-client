import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Chat',
    template: '%s | MCP Chat UI'
  },
  description: 'Chat with AI models through MCP servers',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col">
      {children}
    </div>
  )
}