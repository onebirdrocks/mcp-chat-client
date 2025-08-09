import { NextRequest } from 'next/server'
import { POST as chatPOST } from '../chat/route'
import { POST as runToolPOST } from '../run-tool/route'
import { POST as cancelToolPOST } from '../cancel-tool/route'
import { vi } from 'vitest'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { describe } from 'node:test'

// Mock the MCP utilities
vi.mock('@/lib/mcp-utils', () => ({
  getEnabledMCPServerIds: vi.fn().mockResolvedValue(['filesystem', 'weather']),
  getMCPServerConfig: vi.fn().mockResolvedValue({
    id: 'filesystem',
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    enabled: true,
    disabled: false
  })
}))

describe('Chat API Routes', () => {
  describe('/api/chat', () => {
    it('should return a text response for regular messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'Hello, how are you?',
              timestamp: new Date().toISOString()
            }
          ],
          sessionId: 'test-session',
          provider: 'openai',
          model: 'gpt-4'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await chatPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('test-session')
      expect(data.reply).toContain('Hello, how are you?')
      expect(data.usage).toBeDefined()
      expect(data.messageId).toBeDefined()
    })

    it('should return tool calls for file-related messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'Can you read a file for me?',
              timestamp: new Date().toISOString()
            }
          ],
          sessionId: 'test-session',
          provider: 'openai',
          model: 'gpt-4',
          mcpServers: ['filesystem']
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await chatPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('test-session')
      expect(data.toolCalls).toBeDefined()
      expect(data.toolCalls).toHaveLength(1)
      expect(data.toolCalls[0].function.name).toBe('filesystem.read_file')
      expect(data.usage).toBeDefined()
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: []
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await chatPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('/api/run-tool', () => {
    it('should execute approved tool calls', async () => {
      const request = new NextRequest('http://localhost:3000/api/run-tool', {
        method: 'POST',
        body: JSON.stringify({
          toolCall: {
            id: 'test-tool-call',
            type: 'function',
            function: {
              name: 'filesystem.read_file',
              arguments: JSON.stringify({ path: '/test/file.txt' })
            },
            serverId: 'filesystem'
          },
          sessionId: 'test-session',
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'Read the file',
              timestamp: new Date().toISOString()
            }
          ],
          approved: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await runToolPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.reply).toBeDefined()
      expect(data.executionTime).toBeGreaterThan(0)
      expect(data.messageId).toBeDefined()
    })

    it('should handle cancelled tool calls', async () => {
      const request = new NextRequest('http://localhost:3000/api/run-tool', {
        method: 'POST',
        body: JSON.stringify({
          toolCall: {
            id: 'test-tool-call',
            type: 'function',
            function: {
              name: 'filesystem.read_file',
              arguments: JSON.stringify({ path: '/test/file.txt' })
            },
            serverId: 'filesystem'
          },
          sessionId: 'test-session',
          messages: [],
          approved: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await runToolPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('Tool execution cancelled by user')
      expect(data.executionTime).toBe(0)
    })
  })

  describe('/api/cancel-tool', () => {
    it('should handle tool cancellation requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/cancel-tool', {
        method: 'POST',
        body: JSON.stringify({
          toolCallId: 'test-tool-call',
          sessionId: 'test-session',
          reason: 'User cancelled'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await cancelToolPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBeDefined()
      expect(data.message).toBeDefined()
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/cancel-tool', {
        method: 'POST',
        body: JSON.stringify({
          toolCallId: 'test-tool-call'
          // Missing sessionId
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await cancelToolPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required')
    })
  })
})