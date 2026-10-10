// Paste this in your browser console when logged in as coach
// This will show your user ID and check for notifications

console.log('='.repeat(60));
console.log('CHECKING YOUR USER ID AND NOTIFICATIONS');
console.log('='.repeat(60));

// Get the auth context
const authData = JSON.parse(localStorage.getItem('authUser') || '{}');
console.log('\n1. Your User Data:');
console.log('   User ID:', authData.id || 'Not found');
console.log('   Email:', authData.email || 'Not found');
console.log('   Role:', authData.role || 'Not found');

// Check what the provider ID should be
console.log('\n2. Provider ID from booking log: bxAa8Hr1o6OCVpqvPzvaOs60xJo1');

console.log('\n3. Do they match?', authData.id === 'bxAa8Hr1o6OCVpqvPzvaOs60xJo1');

if (authData.id !== 'bxAa8Hr1o6OCVpqvPzvaOs60xJo1') {
  console.log('\n⚠️ WARNING: User IDs DO NOT MATCH!');
  console.log('   The notification was sent to:', 'bxAa8Hr1o6OCVpqvPzvaOs60xJo1');
  console.log('   But your user ID is:', authData.id);
  console.log('   This is why you are not seeing the notification!');
}

console.log('\n' + '='.repeat(60));
