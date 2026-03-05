export default async function handler(req, res) {
  // 1. Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Usamos la nueva variable de entorno de Google
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key de Google no configurada en Vercel' });
  }

  try {
    // 3. Configuración de Gemini 3.0 Flash
    const MODEL = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // Extraemos el mensaje que viene de tu página web
    // (Asumimos que tu frontend envía { messages: [ { content: "..." } ] })
    const lastMessage = req.body.messages?.[req.body.messages.length - 1]?.content || "Hola";

    const geminiBody = {
      system_instruction: {
        parts: [{ 
          text: "Eres un tutor de física experto y amable. Usa LaTeX para fórmulas y explica paso a paso sin dar la respuesta de inmediato." 
        }]
      },
      contents: [{
        parts: [{ text: lastMessage }]
      }]
    };

    // 4. Llamada a la API de Google
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Error desde Google API", details: data });
    }

    // 5. TRUCO FINAL: "Disfrazamos" la respuesta de Gemini como si fuera de Claude
    // para que tu frontend actual la entienda sin errores.
    const botText = data.candidates[0].content.parts[0].text;

    return res.status(200).json({
      id: "msg_" + Math.random().toString(36).substring(7),
      type: "message",
      role: "assistant",
      model: MODEL,
      content: [
        {
          type: "text",
          text: botText
        }
      ],
      stop_reason: "end_turn",
      stop_sequence: null
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: "Error interno", message: error.message });
  }
}
