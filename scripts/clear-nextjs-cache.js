// Run this in browser console to clear Next.js runtime cache

console.log('='.repeat(80));
console.log('CLEARING NEXT.JS CACHE');
console.log('='.repeat(80));

// Check what's in the main Next.js script that loads chunks
const allScripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
console.log('\nAll loaded scripts:');
allScripts.forEach(src => {
  const filename = src.split('/').pop();
  console.log('  -', filename);
});

// Try to find the webpack manifest
console.log('\nLooking for Next.js build manifest...');

// Force reload without cache
console.log('\n📋 TO FIX THIS:');
console.log('1. Close this tab completely');
console.log('2. Open DevTools');
console.log('3. Go to Application tab → Storage → Clear site data');
console.log('4. Check "Cache storage" and click "Clear site data"');
console.log('5. Then hard refresh with Ctrl+Shift+R');
console.log('\nOR just run this:');
console.log('location.reload(true)');

console.log('='.repeat(80));
