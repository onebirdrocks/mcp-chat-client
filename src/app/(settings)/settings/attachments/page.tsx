'use client';

import { useTheme } from '@/hooks/useTheme';

export default function AttachmentsPage() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="max-w-2xl">
      <h1 className={`text-2xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attachments</h1>
      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>File attachment settings coming soon...</p>
    </div>
  );
}
