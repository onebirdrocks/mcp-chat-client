export default function AccountPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8 text-white">Account Settings</h1>
      
      {/* Profile Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-white">Profile</h2>
        
        {/* Avatar */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
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
              <p className="text-sm text-gray-400 mt-1">JPG, PNG or GIF. Max size 2MB.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Full Name
          </label>
          <input
            type="text"
            defaultValue="Ruan Yiming"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Email Address
          </label>
          <input
            type="email"
            defaultValue="ymruan@gmail.com"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Bio
          </label>
          <textarea
            rows={3}
            placeholder="Tell us a little about yourself..."
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Account Settings */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-white">Account Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-600">
            <div>
              <h3 className="font-medium text-white">Email Notifications</h3>
              <p className="text-sm text-gray-400">Receive email updates about your account</p>
            </div>
            <button className="w-12 h-6 rounded-full bg-gray-600">
              <div className="w-5 h-5 rounded-full bg-white shadow transform translate-x-1"></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-600">
            <div>
              <h3 className="font-medium text-white">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <button className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-white">Danger Zone</h2>
        
        <div className="p-4 rounded-lg border border-red-600 bg-red-900/20">
          <h3 className="font-medium text-red-400 mb-2">Delete Account</h3>
          <p className="text-sm text-gray-400 mb-4">
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
