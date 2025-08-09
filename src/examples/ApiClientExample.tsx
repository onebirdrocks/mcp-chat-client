import React, { useState } from 'react';
import { chatApi, settingsApi, healthApi } from '../services/apiClient';
import { useApiCall, useApiLoading, useApiErrorHandler } from '../hooks/useApiClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import type { ChatRequest, Settings } from '../types';

export function ApiClientExample() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string>('');
  
  const { execute: sendMessage, isLoading: isSending, error: sendError } = useApiCall();
  const { execute: getSettings, isLoading: isLoadingSettings, error: settingsError } = useApiCall<Settings>();
  const { execute: checkHealth, isLoading: isCheckingHealth, error: healthError } = useApiCall();
  
  const globalLoading = useApiLoading();
  const { handleError } = useApiErrorHandler();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const request: ChatRequest = {
        messages: [
          {
            id: '1',
            role: 'user',
            content: message,
            timestamp: new Date(),
          },
        ],
        sessionId: 'example-session',
        provider: 'openai',
        model: 'gpt-4',
      };

      const result = await sendMessage(() => chatApi.sendMessage(request));
      setResponse(result.reply || 'No response received');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleGetSettings = async () => {
    try {
      const settings = await getSettings(() => settingsApi.getSettings());
      console.log('Settings loaded:', settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const health = await checkHealth(() => healthApi.checkHealth());
      console.log('Health check result:', health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6">API Client Example</h1>

      {/* Global Loading State */}
      {globalLoading.isLoading && (
        <Alert variant="info">
          Global loading: {globalLoading.operation}
        </Alert>
      )}

      {/* Chat Example */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Chat API Example</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Message:
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter your message..."
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
            className="w-full"
          >
            {isSending ? 'Sending...' : 'Send Message'}
          </Button>

          {sendError && (
            <Alert variant="error">
              Error: {handleError(sendError)}
            </Alert>
          )}

          {response && (
            <div className="p-3 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Response:</h3>
              <p>{response}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Settings Example */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Settings API Example</h2>
        
        <Button
          onClick={handleGetSettings}
          disabled={isLoadingSettings}
          className="w-full"
        >
          {isLoadingSettings ? 'Loading...' : 'Load Settings'}
        </Button>

        {settingsError && (
          <Alert variant="error" className="mt-4">
            Error: {handleError(settingsError)}
          </Alert>
        )}
      </Card>

      {/* Health Check Example */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Health Check Example</h2>
        
        <Button
          onClick={handleHealthCheck}
          disabled={isCheckingHealth}
          className="w-full"
        >
          {isCheckingHealth ? 'Checking...' : 'Check Health'}
        </Button>

        {healthError && (
          <Alert variant="error" className="mt-4">
            Error: {handleError(healthError)}
          </Alert>
        )}
      </Card>

      {/* API Client Features */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">API Client Features</h2>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Automatic retry logic with exponential backoff</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Request/response interceptors</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Loading state management</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Type-safe API calls</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Comprehensive error handling</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Request timeout and cancellation</span>
          </div>
        </div>
      </Card>

      {/* Usage Instructions */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
        
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Basic Usage:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { chatApi } from '../services/apiClient';

// Simple API call
const response = await chatApi.sendMessage(request);

// With error handling
try {
  const response = await chatApi.sendMessage(request);
  console.log(response);
} catch (error) {
  console.error('API call failed:', error);
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">Using Hooks:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { useApiCall } from '../hooks/useApiClient';

const { execute, isLoading, error } = useApiCall();

const handleClick = async () => {
  try {
    const result = await execute(() => chatApi.sendMessage(request));
    // Handle success
  } catch (error) {
    // Handle error
  }
};`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">Global Loading State:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { useApiLoading } from '../hooks/useApiClient';

const loadingState = useApiLoading();

if (loadingState.isLoading) {
  return <div>Loading: {loadingState.operation}</div>;
}`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}