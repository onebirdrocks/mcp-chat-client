/**
 * Theme Fix Script
 * Run this in your browser console to fix theme switching issues
 */

console.log('🔧 Starting theme fix...');

// Step 1: Clear all existing theme state
console.log('1️⃣ Clearing existing theme state...');
document.documentElement.classList.remove('dark');
document.documentElement.className = document.documentElement.className
  .split(' ')
  .filter(cls => !cls.includes('theme') && !cls.includes('dark'))
  .join(' ');

// Step 2: Clear localStorage
console.log('2️⃣ Clearing localStorage...');
localStorage.removeItem('mcp-chat-ui-theme');

// Step 3: Force reflow
document.documentElement.offsetHeight;

// Step 4: Apply light theme forcefully
console.log('3️⃣ Applying light theme...');
document.documentElement.classList.remove('dark');
localStorage.setItem('mcp-chat-ui-theme', 'light');

// Step 5: Force inline styles as backup
document.documentElement.style.backgroundColor = '#ffffff';
document.documentElement.style.color = '#1f2937';

// Step 6: Force another reflow
document.documentElement.offsetHeight;

// Step 7: Debug current state
console.log('4️⃣ Current theme state:');
const debugInfo = {
  localStorage: localStorage.getItem('mcp-chat-ui-theme'),
  documentClass: document.documentElement.className,
  hasDarkClass: document.documentElement.classList.contains('dark'),
  systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches,
  computedBgColor: window.getComputedStyle(document.documentElement).backgroundColor,
  computedColor: window.getComputedStyle(document.documentElement).color,
  inlineStyles: {
    backgroundColor: document.documentElement.style.backgroundColor,
    color: document.documentElement.style.color,
  }
};

console.table(debugInfo);

// Step 8: Create helper functions
window.fixTheme = {
  light: () => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('mcp-chat-ui-theme', 'light');
    document.documentElement.style.backgroundColor = '#ffffff';
    document.documentElement.style.color = '#1f2937';
    console.log('☀️ Light theme applied');
  },
  dark: () => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('mcp-chat-ui-theme', 'dark');
    document.documentElement.style.backgroundColor = '#111827';
    document.documentElement.style.color = '#f9fafb';
    console.log('🌙 Dark theme applied');
  },
  debug: () => {
    const info = {
      localStorage: localStorage.getItem('mcp-chat-ui-theme'),
      documentClass: document.documentElement.className,
      hasDarkClass: document.documentElement.classList.contains('dark'),
      systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches,
      computedBgColor: window.getComputedStyle(document.documentElement).backgroundColor,
      computedColor: window.getComputedStyle(document.documentElement).color,
    };
    console.table(info);
    return info;
  }
};

console.log('✅ Theme fix complete!');
console.log('💡 You can now use:');
console.log('   - fixTheme.light() to apply light theme');
console.log('   - fixTheme.dark() to apply dark theme');
console.log('   - fixTheme.debug() to check current state');

// Step 9: Reload the page to ensure changes take effect
console.log('🔄 Reloading page in 2 seconds...');
setTimeout(() => {
  window.location.reload();
}, 2000);