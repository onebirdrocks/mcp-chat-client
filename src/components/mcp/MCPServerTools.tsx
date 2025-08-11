'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Info } from 'lucide-react';
import { MCPTool } from '@/types/mcp';

interface MCPServerToolsProps {
  tools: MCPTool[];
}

export default function MCPServerTools({ tools }: MCPServerToolsProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (toolName: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName);
    } else {
      newExpanded.add(toolName);
    }
    setExpandedTools(newExpanded);
  };

  const formatSchema = (schema: Record<string, unknown> | undefined): string => {
    if (!schema) return 'None';
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return 'Invalid format';
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Code className="w-4 h-4" />
        Available Tools ({tools.length})
      </h4>
      
      <div className="space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <button
              onClick={() => toggleTool(tool.name)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-white font-medium">{tool.name}</span>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-500 dark:text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 dark:bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {tool.description}
                  </div>
                </div>
              </div>
              {expandedTools.has(tool.name) ? (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            
            {expandedTools.has(tool.name) && (
              <div className="px-3 pb-3 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Description:</p>
                  <p className="text-xs text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    {tool.description || 'No description'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Input Parameters:</p>
                  <pre className="text-xs text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                    {formatSchema(tool.inputSchema)}
                  </pre>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Output Format:</p>
                  <pre className="text-xs text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                    {formatSchema(tool.outputSchema)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
