'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function CustomizationPage() {
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [newTrait, setNewTrait] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const { isDarkMode } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [mainTextFont, setMainTextFont] = useState('Inter');
  const [codeFont, setCodeFont] = useState('JetBrains Mono');
  const [hidePersonalInfo, setHidePersonalInfo] = useState(false);
  const [hideCustomization, setHideCustomization] = useState(false);
  const [menuFontSize, setMenuFontSize] = useState('medium');

  const predefinedTraits = ['friendly', 'witty', 'concise', 'curious', 'empathetic', 'creative', 'patient'];

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
  ];

  const fonts = [
    { name: 'Inter', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-inter)' },
    { name: 'Roboto', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-roboto)' },
    { name: 'Open Sans', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-open-sans)' },
    { name: 'Lato', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-lato)' },
    { name: 'Poppins', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-poppins)' },
    { name: 'Source Sans 3', category: 'Sans-serif', preview: 'The quick brown fox jumps over the lazy dog', variable: 'var(--font-source-sans-pro)' },
  ];

  const codeFonts = [
    { name: 'JetBrains Mono', category: 'Monospace', preview: 'const hello = "world";', variable: 'var(--font-jetbrains-mono)' },
    { name: 'Fira Code', category: 'Monospace', preview: 'const hello = "world";', variable: 'var(--font-fira-code)' },
    { name: 'Source Code Pro', category: 'Monospace', preview: 'const hello = "world";', variable: 'var(--font-source-code-pro)' },
    { name: 'Inconsolata', category: 'Monospace', preview: 'const hello = "world";', variable: 'var(--font-inconsolata)' },
  ];

  const fontSizes = [
    { value: 'small', label: 'Small', size: 'text-xs' },
    { value: 'medium', label: 'Medium', size: 'text-sm' },
    { value: 'large', label: 'Large', size: 'text-base' },
    { value: 'xlarge', label: 'Extra Large', size: 'text-lg' },
  ];

  const addTrait = (trait: string) => {
    if (trait && !traits.includes(trait)) {
      setTraits([...traits, trait]);
    }
  };

  const removeTrait = (traitToRemove: string) => {
    setTraits(traits.filter(trait => trait !== traitToRemove));
  };

  const handleTraitKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addTrait(newTrait);
      setNewTrait('');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className={`text-2xl font-bold mb-8 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>Customize MCP Chat Client</h1>

      {/* What should MCP Chat Client call you? */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          What should MCP Chat Client call you?
        </label>
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`absolute right-3 top-2 text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {name.length}/50
          </span>
        </div>
      </div>

      {/* What do you do? */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          What do you do?
        </label>
        <div className="relative">
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Engineer, student, etc."
            maxLength={100}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`absolute right-3 top-2 text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {occupation.length}/100
          </span>
        </div>
      </div>

      {/* What traits should MCP Chat Client have? */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          What traits should MCP Chat Client have?
        </label>
        <div className="relative">
          <input
            type="text"
            value={newTrait}
            onChange={(e) => setNewTrait(e.target.value)}
            onKeyDown={handleTraitKeyPress}
            placeholder="Type a trait and press Enter or Tab..."
            maxLength={50}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`absolute right-3 top-2 text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {newTrait.length}/50
          </span>
        </div>
        
        {/* Predefined traits */}
        <div className="mt-3 flex flex-wrap gap-2">
          {predefinedTraits.map((trait) => (
            <button
              key={trait}
              onClick={() => addTrait(trait)}
              disabled={traits.includes(trait)}
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                traits.includes(trait)
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-3 h-3" />
              {trait}
            </button>
          ))}
        </div>

        {/* Selected traits */}
        {traits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {traits.map((trait) => (
              <span
                key={trait}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {trait}
                <button
                  onClick={() => removeTrait(trait)}
                  className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Anything else MCP Cha Client Chat should know about you? */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Anything else MCP Chat Client should know about you?
        </label>
        <div className="relative">
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Interests, values, or preferences to keep in mind"
            maxLength={3000}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent resize-none ${
              isDarkMode 
                ? 'border-gray-600 text-white placeholder-gray-400' 
                : 'border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`absolute bottom-2 right-2 text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {additionalInfo.length}/3000
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button className={`px-4 py-2 rounded-lg border transition-colors ${
          isDarkMode 
            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}>
          Load Legacy Data
        </button>
        <button className={`px-4 py-2 rounded-lg transition-colors ${
          isDarkMode 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
          Save Preferences
        </button>
      </div>

      {/* Visual Options */}
      <div className="mt-12">
        <h2 className={`text-xl font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>Visual Options</h2>
        
        {/* Font Preview Section */}
        <div className="mb-8">
          <h3 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Font Preview</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Font Settings */}
            <div className="space-y-6">
              {/* Main Text Font */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Main Text Font
                </label>
                <p className={`text-xs mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Used in general text throughout the app.
                </p>
                <select
                  value={mainTextFont}
                  onChange={(e) => setMainTextFont(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                    isDarkMode 
                      ? 'border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {fonts.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.name} ({font.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Code Font */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Code Font
                </label>
                <p className={`text-xs mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Used in code blocks and inline code in chat messages.
                </p>
                <select
                  value={codeFont}
                  onChange={(e) => setCodeFont(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                    isDarkMode 
                      ? 'border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {codeFonts.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.name} ({font.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Menu Font Size */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Menu Font Size
                </label>
                <p className={`text-xs mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Controls the size of text in menus, navigation, and UI elements.
                </p>
                <select
                  value={menuFontSize}
                  onChange={(e) => setMenuFontSize(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                    isDarkMode 
                      ? 'border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {fontSizes.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

                          {/* Preview Area */}
              <div className={`border-2 border-dashed rounded-lg p-4 ${
                isDarkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Fonts Preview</h4>
                
                {/* Menu Font Size Preview */}
                <div className="mb-4">
                  <h5 className={`text-xs font-medium mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Menu Font Size Preview:</h5>
                  <div className={`p-2 rounded border ${
                    isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
                  }`}>
                    <div className={`${fontSizes.find(s => s.value === menuFontSize)?.size} ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} style={{ fontFamily: fonts.find(f => f.name === mainTextFont)?.variable }}>
                      Settings • Account • LLM • MCP • Customization
                    </div>
                  </div>
                </div>
              
              {/* Chat Message */}
              <div className="mb-4">
                <div className={`rounded-lg p-3 mb-2 ${
                  isDarkMode ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-blue-900'
                  }`} style={{ fontFamily: fonts.find(f => f.name === mainTextFont)?.variable }}>
                    Can you write me a simple hello world program? I'm learning TypeScript and would like to see a basic example with proper type annotations.
                  </p>
                </div>
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} style={{ fontFamily: fonts.find(f => f.name === mainTextFont)?.variable }}>
                  Sure, here you go. I'll create a TypeScript example with proper type annotations and show you how to use <code className={`px-1 py-0.5 rounded text-xs ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`} style={{ fontFamily: codeFonts.find(f => f.name === codeFont)?.variable }}>interfaces</code> and <code className={`px-1 py-0.5 rounded text-xs ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`} style={{ fontFamily: codeFonts.find(f => f.name === codeFont)?.variable }}>functions</code>:
                </p>
              </div>

              {/* Code Block */}
              <div className={`rounded-lg overflow-hidden ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className={`px-3 py-1 text-xs ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}>
                  typescript
                </div>
                <div className={`p-3 text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} style={{ fontFamily: codeFonts.find(f => f.name === codeFont)?.variable }}>
                  <span className="text-pink-400">interface</span> <span className="text-blue-400">User</span> {'{'}<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">id</span>: <span className="text-cyan-400">number</span>;<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">name</span>: <span className="text-cyan-400">string</span>;<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">email</span>?: <span className="text-cyan-400">string</span>;<br/>
                  {'}'}<br/><br/>
                  <span className="text-pink-400">function</span> <span className="text-blue-400">greet</span>(<span className="text-blue-400">user</span>: <span className="text-blue-400">User</span>): <span className="text-cyan-400">string</span> {'{'}<br/>
                  &nbsp;&nbsp;<span className="text-pink-400">return</span> <span className="text-green-400">`Hello, ${'{'}user.name{'}'}!`</span>;<br/>
                  {'}'}<br/><br/>
                  <span className="text-pink-400">const</span> <span className="text-blue-400">user</span>: <span className="text-blue-400">User</span> = {'{'}<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">id</span>: <span className="text-orange-400">1</span>,<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">name</span>: <span className="text-green-400">"John Doe"</span>,<br/>
                  &nbsp;&nbsp;<span className="text-blue-400">email</span>: <span className="text-green-400">"john@example.com"</span><br/>
                  {'}'};<br/><br/>
                  <span className="text-blue-400">console</span>.<span className="text-blue-400">log</span>(<span className="text-blue-400">greet</span>(<span className="text-blue-400">user</span>));
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Language Selection */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
              isDarkMode 
                ? 'border-gray-600 text-white' 
                : 'border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.name}>
                {lang.native} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* Privacy Settings */}
        <div className="mb-6">
          <h3 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Privacy Settings</h3>
          
          <div className="space-y-4">
            {/* Hide Personal Information */}
            <div className="flex items-center justify-between p-4 rounded-lg border ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }">
              <div>
                <h4 className={`font-medium mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Hide Personal Information</h4>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Hides your name and email from the UI.
                </p>
              </div>
              <button 
                onClick={() => setHidePersonalInfo(!hidePersonalInfo)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  hidePersonalInfo 
                    ? (isDarkMode ? 'bg-blue-600' : 'bg-blue-500')
                    : (isDarkMode ? 'bg-gray-600' : 'bg-gray-300')
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  hidePersonalInfo ? 'translate-x-6' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* Ignore Customization in Conversations */}
            <div className="flex items-center justify-between p-4 rounded-lg border ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }">
              <div>
                <h4 className={`font-medium mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Ignore Customization in Conversations</h4>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Ignores your personality traits and preferences during conversations.
                </p>
              </div>
              <button 
                onClick={() => setHideCustomization(!hideCustomization)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  hideCustomization 
                    ? (isDarkMode ? 'bg-blue-600' : 'bg-blue-500')
                    : (isDarkMode ? 'bg-gray-600' : 'bg-gray-300')
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  hideCustomization ? 'translate-x-6' : 'translate-x-1'
                }`}></div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-lg border ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }">
          <div>
            <h3 className={`font-medium mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Boring Theme</h3>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              If you think the pink is too much, turn this on to tone it down.
            </p>
          </div>
          <button className={`w-12 h-6 rounded-full transition-colors ${
            isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
              isDarkMode ? 'translate-x-1' : 'translate-x-6'
            }`}></div>
          </button>
        </div>
      </div>
    </div>
  );
}
