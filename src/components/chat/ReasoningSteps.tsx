'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ReasoningStepsProps {
  steps: string[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function ReasoningSteps({ steps, isCollapsed = true, onToggle }: ReasoningStepsProps) {
  const { isDarkMode } = useTheme();
  const [collapsed, setCollapsed] = useState(isCollapsed);

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  if (!steps || steps.length === 0) return null;

  return (
    <div className={`mt-2 rounded-lg border ${
      isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
    }`}>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <Brain className="w-4 h-4 text-blue-500" />
        <span className={`text-sm font-medium ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Reasoning Process ({steps.length} steps)
        </span>
      </button>
      
      {!collapsed && (
        <div className={`px-3 pb-3 border-t ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
          <div className={`mt-2 space-y-2 text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {steps.map((step, index) => (
              <div key={index} className={`p-2 rounded ${
                isDarkMode ? 'bg-gray-700' : 'bg-white'
              }`}>
                <div className="font-medium text-blue-500 mb-1">
                  Step {index + 1}:
                </div>
                <div className="whitespace-pre-wrap text-sm">{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
