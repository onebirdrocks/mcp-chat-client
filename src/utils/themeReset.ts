/**
 * Theme reset utility to fix theme switching issues
 */

export const forceResetTheme = () => {
  console.log('🔄 Force resetting theme...');
  
  // Clear all existing theme classes
  document.documentElement.classList.remove('dark');
  document.documentElement.className = document.documentElement.className
    .split(' ')
    .filter(cls => !cls.includes('theme') && !cls.includes('dark'))
    .join(' ');
  
  // Clear localStorage
  localStorage.removeItem('mcp-chat-ui-theme');
  
  // Force reflow
  document.documentElement.offsetHeight;
  
  console.log('✅ Theme reset complete');
};

export const forceApplyLightTheme = () => {
  console.log('☀️ Force applying light theme...');
  
  // Remove dark class
  document.documentElement.classList.remove('dark');
  
  // Set localStorage
  localStorage.setItem('mcp-chat-ui-theme', 'light');
  
  // Force styles
  document.documentElement.style.backgroundColor = '#ffffff';
  document.documentElement.style.color = '#1f2937';
  
  // Force reflow
  document.documentElement.offsetHeight;
  
  console.log('✅ Light theme applied');
};

export const forceApplyDarkTheme = () => {
  console.log('🌙 Force applying dark theme...');
  
  // Add dark class
  document.documentElement.classList.add('dark');
  
  // Set localStorage
  localStorage.setItem('mcp-chat-ui-theme', 'dark');
  
  // Force styles
  document.documentElement.style.backgroundColor = '#111827';
  document.documentElement.style.color = '#f9fafb';
  
  // Force reflow
  document.documentElement.offsetHeight;
  
  console.log('✅ Dark theme applied');
};

export const debugThemeState = () => {
  const info = {
    localStorage: localStorage.getItem('mcp-chat-ui-theme'),
    documentClass: document.documentElement.className,
    hasDarkClass: document.documentElement.classList.contains('dark'),
    systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches,
    computedBgColor: window.getComputedStyle(document.documentElement).backgroundColor,
    computedColor: window.getComputedStyle(document.documentElement).color,
  };
  
  console.log('🐛 Theme Debug Info:', info);
  return info;
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).themeDebug = {
    reset: forceResetTheme,
    light: forceApplyLightTheme,
    dark: forceApplyDarkTheme,
    debug: debugThemeState,
  };
}