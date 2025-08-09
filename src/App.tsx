import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components';
import { Home, ChatPage, SettingsPage } from '@/pages';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initializeSettings } from '@/store';

function App() {
  useEffect(() => {
    // Initialize settings when the app starts
    initializeSettings().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Catch all route - redirect to chat */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
