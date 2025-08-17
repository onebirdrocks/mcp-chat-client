'use client';

import { useTheme } from '@/hooks/useTheme';

export default function AccountPage() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="max-w-2xl">
      <h1 className={`text-2xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Settings</h1>
      
      {/* Profile Section */}
      <div className="mb-8">
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile</h2>
        
        {/* Avatar */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Profile Picture
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">🐦</span>
            </div>
            <div>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Change Photo
              </button>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>JPG, PNG or GIF. Max size 2MB.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Full Name
          </label>
          <input
            type="text"
            defaultValue="Ruan Yiming"
            className={`w-full px-3 py-2 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Email Address
          </label>
          <input
            type="email"
            defaultValue="ymruan@gmail.com"
            className={`w-full px-3 py-2 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Bio
          </label>
          <textarea
            rows={3}
            placeholder="Tell us a little about yourself..."
            className={`w-full px-3 py-2 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>

      {/* Account Settings */}
      <div className="mb-8">
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Settings</h2>
        
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            isDarkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Email Notifications</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Receive email updates about your account</p>
            </div>
            <button className={`w-12 h-6 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow transform translate-x-1"></div>
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            isDarkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Two-Factor Authentication</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Add an extra layer of security to your account</p>
            </div>
            <button className={`px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}>
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Danger Zone</h2>
        
        <div className={`p-4 rounded-lg border border-red-600 ${
          isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
        }`}>
          <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Delete Account</h3>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
