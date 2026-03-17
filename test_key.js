const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Read .env.local manually to get exactly what process.env would see
const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/FIREBASE_PRIVATE_KEY="(.*)"/);

if (!match) {
    console.error('FIREBASE_PRIVATE_KEY not found in .env.local');
    process.exit(1);
}

let privateKey = match[1];
console.log('Original length:', privateKey.length);

// Emulate firebase-admin.ts logic
privateKey = privateKey.replace(/\\n/g, '\n');
console.log('Processed length:', privateKey.length);
console.log('Start:', privateKey.substring(0, 50));
console.log('End:', privateKey.substring(privateKey.length - 50));

try {
    const key = crypto.createPrivateKey(privateKey);
    console.log('Success! Key parsed.');
} catch (e) {
    console.error('Error parsing key:', e.message);
}
