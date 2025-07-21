import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with explicit path
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

console.log('🔧 Environment Variables Check');
console.log('================================');

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

let allValid = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ SET' : '❌ MISSING';
  console.log(`${varName}: ${status}`);
  
  if (value) {
    // Show first/last few characters for verification (but hide the middle for security)
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      const masked = value.length > 10 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : '***';
      console.log(`  Value: ${masked} (length: ${value.length})`);
    } else {
      console.log(`  Value: ${value}`);
    }
  }
  
  if (!value) {
    allValid = false;
  }
});

console.log('\n================================');
console.log(`Overall Status: ${allValid ? '✅ ALL GOOD' : '❌ MISSING VARIABLES'}`);

if (!allValid) {
  console.log('\n🚨 Fix these issues:');
  console.log('1. Make sure .env file exists in the api/ directory');
  console.log('2. Check that all required variables are set');
  console.log('3. Ensure no extra spaces around the = sign');
  console.log('4. Restart the server after making changes');
}

export default allValid;
