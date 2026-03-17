const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/FIREBASE_PRIVATE_KEY="(.*)"/);

if (!match) {
    console.error('FIREBASE_PRIVATE_KEY not found');
    process.exit(1);
}

let raw = match[1];

function testKey(key, label) {
    try {
        crypto.createPrivateKey(key);
        console.log(`[${label}] SUCCESS`);
        return true;
    } catch (e) {
        console.log(`[${label}] FAILED: ${e.message}`);
        return false;
    }
}

console.log("Testing various sanitization methods...");

// Method 1: Current implementation
let key1 = raw.replace(/\\n/g, '\n');
testKey(key1, "Current (replace \\n with \n)");

// Method 2: Current + trim
let key2 = raw.replace(/\\n/g, '\n').trim();
testKey(key2, "Current + trim");

// Method 3: Ensure headers/footers are correct and remove extra newlines
let key3 = raw.replace(/\\n/g, '\n');
if (!key3.includes('-----BEGIN PRIVATE KEY-----')) {
    key3 = `-----BEGIN PRIVATE KEY-----\n${key3}\n-----END PRIVATE KEY-----`;
}
testKey(key3, "Ensure headers");

// Method 4: Strip headers, remove all whitespace, then re-wrap
let base64 = raw
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
let key4 = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
testKey(key4, "Strip and re-wrap (no internal newlines)");

// Method 5: Strip and re-wrap with 64-char lines
let base64_2 = raw
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
let wrapped = base64_2.match(/.{1,64}/g).join('\n');
let key5 = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
testKey(key5, "Strip and re-wrap with 64-char lines");

// Method 6: Just try the key from key.txt if it exists
try {
    const keyTxt = fs.readFileSync('key.txt', 'utf8').replace(/\\n/g, '\n').trim();
    testKey(keyTxt, "key.txt content");
} catch (e) {}
