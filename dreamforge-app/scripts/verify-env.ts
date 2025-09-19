#!/usr/bin/env node

/**
 * Verify required environment variables are set
 * Run this during build to catch missing configs early
 */

const requiredEnvVars = [
  'RUNPOD_API_KEY',
  'RUNPOD_API_URL',
  // Training endpoint for LoRA jobs
  'RUNPOD_TRAIN_API_URL',
];

const optionalEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'STRIPE_SECRET_KEY',
  'NANO_BANANA_API_KEY',
];

console.log('🔍 Verifying environment variables...\n');

let hasErrors = false;

// Check required variables
console.log('Required Variables:');
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value || value.includes('YOUR_') || value.includes('your_') || value === '') {
    console.error(`❌ ${envVar}: Missing or placeholder value`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: Set`);
  }
}

console.log('\nOptional Variables:');
for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  if (!value || value.includes('YOUR_') || value.includes('your_') || value === '') {
    console.log(`⚠️  ${envVar}: Not configured (optional)`);
  } else {
    console.log(`✅ ${envVar}: Set`);
  }
}

// Security check - ensure no hardcoded secrets
console.log('\n🔒 Security Checks:');
const suspiciousPatterns = [
  { pattern: /rpa_[A-Za-z0-9]{40,}/, name: 'Runpod API key' },
  { pattern: /AIza[A-Za-z0-9-_]{35,}/, name: 'Google API key' },
  { pattern: /eyJ[A-Za-z0-9+/=]{100,}/, name: 'Supabase key' },
];

let securityIssues = false;
for (const envVar of Object.keys(process.env)) {
  const value = process.env[envVar];
  if (!value) continue;

  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(value) && !envVar.includes('RUNPOD') && !envVar.includes('SUPABASE') && !envVar.includes('NANO_BANANA')) {
      console.error(`❌ Potential ${name} found in unexpected variable: ${envVar}`);
      securityIssues = true;
    }
  }
}

if (!securityIssues) {
  console.log('✅ No suspicious patterns detected');
}

// Final result
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please set all required environment variables.');
  console.error('See SECURITY.md for setup instructions.\n');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed!\n');
  process.exit(0);
}