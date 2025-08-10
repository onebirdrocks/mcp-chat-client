import { Metadata } from 'next'
import { NavigationLayout } from '../../src/components/next'
import { getServerSettings } from '../../lib/server-data'
import { detectLanguage } from '../../lib/server-utils'
import SettingsPage from '../../src/components/SettingsPage'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure LLM providers, MCP servers, and application preferences',
}

export default async function Settings() {
  // Server-side data fetching
  const [serverSettings, language] = await Promise.all([
    getServerSettings(),
    detectLanguage()
  ])
  
  return (
    <NavigationLayout>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <SettingsPage language={language} serverSettings={serverSettings} />
        </div>
      </div>
    </NavigationLayout>
  )
}