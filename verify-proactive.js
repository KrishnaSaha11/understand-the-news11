
const admin = require('firebase-admin');

// Initialize Admin SDK for verification
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'understandnewsapp'
    });
}
const db = admin.firestore();

async function verifyProactiveGeneration() {
    console.log('--- Verifying Proactive AI Generation ---');

    // 1. Get initial count
    const initialSnapshot = await db.collection('explanations_cache_v4').get();
    const initialCount = initialSnapshot.size;
    console.log('Initial cache entries:', initialCount);

    // 2. Trigger News API (Proactive Generation)
    console.log('Calling News API to trigger proactive generation...');
    try {
        const res = await fetch('http://localhost:3000/api/news?category=technology');
        const articles = await res.json();
        console.log('Fetched', articles.length, 'articles');
    } catch (e) {
        console.error('Failed to call news API:', e.message);
        return;
    }

    // 3. Wait for background tasks to settle
    console.log('Waiting 15 seconds for background AI generation...');
    await new Promise(r => setTimeout(r, 15000));

    // 4. Check new count
    const finalSnapshot = await db.collection('explanations_cache_v4').get();
    const finalCount = finalSnapshot.size;
    console.log('Final cache entries:', finalCount);

    if (finalCount > initialCount) {
        console.log(`SUCCESS: Proactive generation worked! Added ${finalCount - initialCount} new entries.`);
    } else {
        console.log('NOTICE: No new entries added (might already be cached or generation is slow).');
    }
}

verifyProactiveGeneration();
