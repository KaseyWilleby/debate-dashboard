// Paste this in your browser console to capture ALL errors and promise rejections
// This will help us see what's actually failing

console.log('='.repeat(80));
console.log('ERROR CAPTURE STARTED');
console.log('='.repeat(80));

// Store all captured errors
window.capturedErrors = [];
window.capturedPromiseRejections = [];

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', event.reason);
  window.capturedPromiseRejections.push({
    timestamp: new Date().toISOString(),
    reason: event.reason,
    promise: event.promise,
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
  });
});

// Capture console errors
const originalError = console.error;
console.error = function(...args) {
  window.capturedErrors.push({
    timestamp: new Date().toISOString(),
    args: args,
    message: args.map(a => String(a)).join(' '),
  });
  originalError.apply(console, args);
};

console.log('✅ Error capture installed');
console.log('Now interact with the app (open notification bell, etc.)');
console.log('Then run: window.capturedErrors and window.capturedPromiseRejections');
console.log('='.repeat(80));

// Also immediately check for any Firestore permission errors
setTimeout(() => {
  console.log('\n' + '='.repeat(80));
  console.log('CURRENT ERROR STATUS:');
  console.log('='.repeat(80));
  console.log('Promise Rejections:', window.capturedPromiseRejections.length);
  console.log('Console Errors:', window.capturedErrors.length);

  if (window.capturedPromiseRejections.length > 0) {
    console.log('\n📋 PROMISE REJECTIONS:');
    window.capturedPromiseRejections.forEach((err, i) => {
      console.log(`\n${i + 1}.`, err.message);
      if (err.stack) console.log('   Stack:', err.stack.split('\n').slice(0, 3).join('\n   '));
    });
  }

  if (window.capturedErrors.length > 0) {
    console.log('\n📋 CONSOLE ERRORS:');
    window.capturedErrors.forEach((err, i) => {
      console.log(`${i + 1}.`, err.message);
    });
  }
}, 3000);
