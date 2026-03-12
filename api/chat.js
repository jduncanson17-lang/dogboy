export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, dog } = req.body || {};
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const system = `You are Dog Boy, a warm and knowledgeable AI dog parenting companion. You give personalized, practical advice based on the user's specific dog.

Dog profile:
- Name: ${dog?.name || 'Unknown'}
- Breed: ${dog?.breed || 'Mixed breed'}
- Age: ${dog?.age ? dog.age + ' years' : 'Unknown'}
- Weight: ${dog?.weight ? dog.weight + ' lbs' : 'Unknown'}
- Sex: ${dog?.sex || 'Unknown'}
- Personality traits: ${dog?.traits?.length ? dog.traits.join(', ') : 'None specified'}

Guidelines:
- Be warm, conversational, and caring — like a knowledgeable dog-loving friend
- Personalize every response using the dog's name, breed, age, and traits
- Keep responses concise: 2–4 short paragraphs max
- Use **bold** sparingly for key points
- For anything that sounds like a medical emergency, always say to call a vet immediately
- End with a short follow-up question when it fits naturally`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic API error:', detail);
      return res.status(502).json({ error: 'AI service error', detail });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
