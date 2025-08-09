import { NextPage } from 'next';

const HomePage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          MCP Chat UI Backend
        </h1>
        <p className="text-gray-600 mb-6">
          Backend API server for the MCP Chat UI application.
        </p>
        
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h3 className="font-medium text-blue-900">API Endpoints</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• POST /api/chat - Send chat messages</li>
              <li>• GET/PUT /api/settings - Manage settings</li>
              <li>• GET/DELETE /api/chat-history - Chat history</li>
              <li>• POST /api/run-tool - Execute MCP tools</li>
              <li>• POST /api/cancel-tool - Cancel tool execution</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <h3 className="font-medium text-green-900">Status</h3>
            <p className="mt-1 text-sm text-green-700">
              ✅ Server is running on port 3001
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Frontend should be running on port 5173
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;