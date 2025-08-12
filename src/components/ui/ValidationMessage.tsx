'use client';

import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react';

interface ValidationMessageProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  className?: string;
}

export default function ValidationMessage({ type, message, className = '' }: ValidationMessageProps) {
  const icons = {
    error: X,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle
  };

  const colors = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200'
  };

  const darkColors = {
    error: 'text-red-400 bg-red-900/20 border-red-800',
    warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
    info: 'text-blue-400 bg-blue-900/20 border-blue-800',
    success: 'text-green-400 bg-green-900/20 border-green-800'
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${colors[type]} dark:${darkColors[type]} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
