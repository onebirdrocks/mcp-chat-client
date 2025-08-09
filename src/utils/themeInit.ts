/**
 * Theme initialization utility
 * This should be called as early as possible to prevent theme flashing
 */

export const initTheme = () => {
  // Get saved theme from localStorage
  const savedTheme = localStorage.getItem('mcp-chat-ui-theme') || 'system';
  
  const root = document.documentElement;
  
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  } else if (savedTheme === 'light') {
    root.classList.remove('dark');
  } else {
    // System theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
};

// Call immediately when this module is loaded
if (typeof window !== 'undefined') {
  initTheme();
}