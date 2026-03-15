
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

async function testFetch() {
    console.log('--- Testing Fetch Connectivity ---');

    // Load .env.local manually
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
        console.log('.env.local loaded');
    } else {
        console.log('.env.local NOT found at', envPath);
    }

    const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
    console.log('NEWSAPI_KEY exists:', !!NEWSAPI_KEY);

    const url = `https://newsapi.org/v2/top-headlines?country=us&category=general&apiKey=${NEWSAPI_KEY}`;

    try {
        console.log('Fetching from NewsAPI...');
        const response = await fetch(url);
        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Response Data Status:', data.status);
        if (data.status === 'ok') {
            console.log('SUCCESS: Fetched', data.articles.length, 'articles');
        } else {
            console.log('ERROR Data:', data.message);
        }
    } catch (err) {
        console.error('FETCH FAILED:', err.message);
        if (err.cause) console.error('CAUSE:', err.cause);
    }
}

testFetch();
