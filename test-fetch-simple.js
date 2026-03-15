
const NEWSAPI_KEY = '6f4caba1bc7a4222b6d0710d747e3559';
console.log('Testing NewsAPI with key:', NEWSAPI_KEY.substring(0, 5) + '...');

async function testFetch() {
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
        if (err.cause) console.log('CAUSE:', err.cause);
    }
}

testFetch();
