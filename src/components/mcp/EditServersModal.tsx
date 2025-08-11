'use client';

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';

interface EditServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jsonContent: string) => void;
}

export default function EditServersModal({ isOpen, onClose, onSave }: EditServersModalProps) {
  const { isDarkMode } = useTheme();
  const [jsonContent, setJsonContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidJson, setIsValidJson] = useState(true);

  // Load current JSON content when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentJson();
    }
  }, [isOpen]);

  const loadCurrentJson = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mcp/raw-config');
      if (response.ok) {
        const data = await response.json();
        // Format the JSON nicely
        const formattedJson = JSON.stringify(data, null, 2);
        setJsonContent(formattedJson);
        setIsValidJson(true);
      } else {
        throw new Error('Failed to load current configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Set a default empty structure
      setJsonContent(`{
  "mcpServers": {}
}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isValidJson) {
      setError('Invalid JSON format. Please fix the syntax errors.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Validate JSON first
      const parsed = JSON.parse(jsonContent);
      
      // Call the save function
      await onSave(jsonContent);
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonContent(value);
      // Validate JSON syntax
      try {
        JSON.parse(value);
        setIsValidJson(true);
        setError(null);
      } catch {
        setIsValidJson(false);
      }
    }
  };

  const handleReset = () => {
    loadCurrentJson();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit MCP Servers Configuration</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50"
              title="Reset to current configuration"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
              <div className="text-gray-900 dark:text-white">Loading configuration...</div>
            </div>
          ) : (
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonContent}
              onChange={handleEditorChange}
              theme={isDarkMode ? "vs-dark" : "vs"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true,
                },
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {!isValidJson && (
              <span className="text-red-600 dark:text-red-400">⚠️ Invalid JSON format</span>
            )}
            {isValidJson && (
              <span className="text-green-600 dark:text-green-400">✓ Valid JSON</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
