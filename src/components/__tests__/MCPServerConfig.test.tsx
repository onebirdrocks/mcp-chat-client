import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import MCPServerConfig from '../MCPServerConfig'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock data
const mockServers = {
  mcpServers: {
    'filesystem': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      env: {},
      disabled: false,
      timeout: 30000,
      maxConcurrency: 5
    },
    'weather': {
      command: 'uvx',
      args: ['--directory', '/path/to/weather', 'run', 'weather.py'],
      env: { 'API_KEY': 'test' },
      disabled: true,
      timeout: 15000,
      maxConcurrency: 3
    }
  }
}

const mockStatuses = {
  'filesystem': {
    serverId: 'filesystem',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 150,
    toolCount: 5,
    uptime: 3600000
  },
  'weather': {
    serverId: 'weather',
    status: 'unhealthy',
    lastCheck: new Date().toISOString(),
    error: 'Connection failed',
    toolCount: 0,
    uptime: 0
  }
}

const mockTools = {
  'filesystem': [
    {
      name: 'filesystem.read_file',
      description: 'Read a file from the filesystem',
      category: 'filesystem',
      dangerous: false,
      requiresConfirmation: true,
      inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
    },
    {
      name: 'filesystem.write_file',
      description: 'Write a file to the filesystem',
      category: 'filesystem',
      dangerous: true,
      requiresConfirmation: true,
      inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } }
    }
  ],
  'weather': []
}

describe('MCPServerConfig', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    
    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/settings/mcp-servers/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatuses)
        })
      }
      if (url === '/api/settings/mcp-servers/tools') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTools)
        })
      }
      if (url === '/api/settings/mcp-servers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockServers)
        })
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<MCPServerConfig />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('loads and displays server configurations', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
      expect(screen.getByText('weather')).toBeInTheDocument()
    })
    
    // Check if API calls were made
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers')
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers/status')
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers/tools')
  })

  it('displays server status correctly', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument()
      expect(screen.getByText('Unhealthy')).toBeInTheDocument()
    })
  })

  it('shows server details', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('npx')).toBeInTheDocument()
      expect(screen.getByText('uvx')).toBeInTheDocument()
    })
  })

  it('displays available tools', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('read_file')).toBeInTheDocument()
      expect(screen.getByText('write_file')).toBeInTheDocument()
    })
  })

  it('handles server enable/disable', async () => {
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      }
      return mockFetch(url)
    })
    
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
    })
    
    const enableButton = screen.getAllByText('Disable')[0]
    fireEvent.click(enableButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"disabled":true')
      }))
    })
  })

  it('handles connection testing', async () => {
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/test') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            status: 'healthy',
            toolCount: 5,
            responseTime: 120
          })
        })
      }
      return mockFetch(url)
    })
    
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
    })
    
    const testButtons = screen.getAllByText('Test')
    fireEvent.click(testButtons[0])
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers/filesystem/test', {
        method: 'POST'
      })
    })
  })

  it('opens add server modal', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument()
    })
    
    const addButton = screen.getByText('Add Server')
    fireEvent.click(addButton)
    
    expect(screen.getByText('Server ID')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
  })

  it('handles server editing', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    expect(screen.getByText('JSON Configuration')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/npx/)).toBeInTheDocument()
  })

  it('handles server deletion with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      }
      return mockFetch(url)
    })
    
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])
    
    expect(window.confirm).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers/filesystem', {
        method: 'DELETE'
      })
    })
    
    // Restore window.confirm
    window.confirm = originalConfirm
  })

  it('shows troubleshooting tips for unhealthy servers', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument()
    })
    
    expect(screen.getByText(/Check if command path is correct/)).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    })
    
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500: Internal Server Error/)).toBeInTheDocument()
    })
  })

  it('supports Chinese language', async () => {
    render(<MCPServerConfig language="zh" />)
    
    await waitFor(() => {
      expect(screen.getByText('MCP 服务器配置')).toBeInTheDocument()
      expect(screen.getByText('添加服务器')).toBeInTheDocument()
    })
  })

  it('refreshes server statuses', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
    
    // Clear the call count after initial load
    mockFetch.mockClear()
    
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)
    
    // Should make additional API call for status refresh
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/mcp-servers/status')
    })
  })

  it('validates new server form', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument()
    })
    
    const addButton = screen.getByText('Add Server')
    fireEvent.click(addButton)
    
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Server ID and command are required')).toBeInTheDocument()
    })
  })

  it('formats uptime correctly', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('1 hours')).toBeInTheDocument() // 3600000ms = 1 hour
    })
  })

  it('handles JSON editing validation', async () => {
    render(<MCPServerConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    const textarea = screen.getByDisplayValue(/npx/)
    fireEvent.change(textarea, { target: { value: 'invalid json' } })
    
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON format')).toBeInTheDocument()
    })
  })
})