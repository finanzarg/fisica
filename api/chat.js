export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Asegúrate de tener esta variable en los Environment Variables de Vercel
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key de Google no configurada' });
  }

  try {
    // Usamos el identificador de Gemini 3 Flash Preview (el estándar actual)
    const MODEL = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // Extraemos el último mensaje del alumno para el prompt
    const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || "Hola";

    const geminiBody = {
      // 1. Instrucciones de sistema para que sea un buen tutor
      system_instruction: {
        parts: [{ 
          text: "Eres un tutor de física amable y pedagógico. No des la respuesta directamente. Confirma si lo que dice el alumno es correcto, usa LaTeX para fórmulas (ej: $F = m \\cdot a$) y guía al alumno paso a paso." 
        }]
      },
      // 2. Contenido de la conversación
      contents: [{
        parts: [{ text: userMessage }]
      }],
      generationConfig: {
        temperature: 0.7, // Ideal para que no sea repetitivo pero mantenga precisión
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la API de Gemini');
    }

    // Devolvemos la respuesta formateada
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error en el tutor:", error);
    return res.status(500).json({ error: error.message });
  }
}
