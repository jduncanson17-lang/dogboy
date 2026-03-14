export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { symptoms, dog } = req.body || {};
  if (!symptoms) return res.status(400).json({ error: 'No symptoms provided' });

  const system = `You are a veterinary triage assistant for Dog Boy, an AI dog parenting app. Your job is to assess symptom descriptions and provide a triage level and advice.

Dog profile:
- Name: ${dog?.name || 'Unknown'}
- Breed: ${dog?.breed || 'Mixed breed'}
- Age: ${dog?.age ? dog.age + ' years' : 'Unknown'}
- Weight: ${dog?.weight ? dog.weight + ' lbs' : 'Unknown'}
- Sex: ${dog?.sex || 'Unknown'}

You MUST respond with valid JSON in exactly this format:
{
  "level": "watch" | "vet_soon" | "vet_today" | "emergency",
  "headline": "Short 5-8 word summary",
  "advice": "2-3 sentences of clear, practical advice personalized to this dog",
  "signs_to_watch": ["sign 1", "sign 2", "sign 3"]
}

Level definitions:
- "watch": Minor, monitor at home for 24-48 hours
- "vet_soon": Not urgent, schedule a vet visit within a few days
- "vet_today": Should be seen by a vet today or tomorrow
- "emergency": Go to emergency vet immediately

Always err on the side of caution. When in doubt, go one level higher.`;

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
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: symptoms }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content[0].text;
    try {
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ level: 'watch', headline: 'Review with your vet', advice: text, signs_to_watch: [] });
    }
  } catch (err) {
    console.error('Symptoms handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
