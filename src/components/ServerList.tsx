import React from 'react';
import { useTranslation } from 'react-i18next';

const ServerList: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('settings.mcpServers')}
      </h2>
      <div className="space-y-2">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-gray-600 dark:text-gray-300">
            {t('settings.serverStatus')}: {t('settings.disconnected')}
          </p>
        </div>
        <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {t('settings.addServer')}
        </button>
      </div>
    </div>
  );
};

export default ServerList;
