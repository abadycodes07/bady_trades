const fetch = require('node-fetch');
async function test() {
  const apiKey = "AIzaSyBnj8CZ4lKT9fyS9Gd0IiOo9MlKwBYd9H8";
  const prompt = "Reply with exactly JSON: {\"assessment\": \"test\", \"tips\": [\"yes\"], \"warnings\": [], \"score\": 100}";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      }
    );
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
