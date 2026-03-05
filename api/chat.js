export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Cambiamos el nombre de la variable de entorno
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key de Google no configurada', 
      env: Object.keys(process.env).filter(k => k.includes('GOOGLE')) 
    });
  }

  try {
    // 2. La URL de Gemini usa el modelo y la API Key como parámetro
    const MODEL = "gemini-1.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // 3. Adaptamos el cuerpo del mensaje. 
    // Claude usa 'messages', Gemini usa 'contents'.
    // Si tu frontend envía el formato de Claude, aquí lo "traducimos":
    const prompt = req.body.messages?.[0]?.content || "Hola, preséntate como tutor de física";

    const geminiBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    // 4. Devolvemos la respuesta formateada para que tu frontend no sufra
    // Gemini devuelve la respuesta en data.candidates[0].content.parts[0].text
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
