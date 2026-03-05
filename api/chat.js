export default async function handler(req, res) {
  // 1. Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 2. API Key
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Configuración incompleta',
      message: 'Falta la variable GOOGLE_GENERATION_AI_API_KEY en Vercel.'
    });
  }

  try {
    // 3. Modelo y URL — gemini-2.0-flash es estable y rápido
    const MODEL = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // 4. Historial completo desde el frontend
    const messages = req.body.messages || [];

    // Gemini usa "model" en vez de "assistant"
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // 5. Cuerpo con system prompt + historial completo
    const geminiBody = {
      system_instruction: {
        parts: [{
          text: `Eres un tutor de física socrático. Responde SIEMPRE en español.

REGLAS ESTRICTAS que debes seguir en cada respuesta:
- NUNCA des la respuesta final directamente.
- Máximo 2 o 3 oraciones por respuesta.
- Guiá al alumno con preguntas simples como: "¿Cuántos gramos hay en 1 kg?" o "¿Cuál sería el siguiente paso?".
- Si el alumno acierta, confirmá brevemente con una sola oración y preguntá el siguiente paso.
- Si el alumno está equivocado, no lo digas directamente: hacé una pregunta que lo lleve a descubrirlo.
- Usá texto plano, SIN asteriscos, SIN markdown, SIN caracteres especiales ni chinos.
- Para fórmulas usá texto simple, por ejemplo: F = m * a, o bien 1 kg = 1000 g.`
        }]
      },
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 150,
      }
    };

    // 6. Llamada a la API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Google:", data);
      return res.status(response.status).json({ error: "Error en Gemini API", details: data });
    }

    // 7. Extraer texto y limpiar cualquier markdown residual
    let botText = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "No pude generar una respuesta.";

    botText = botText
      .replace(/\*\*(.*?)\*\*/g, '$1')  // quitar negrita **texto**
      .replace(/\*(.*?)\*/g, '$1')       // quitar cursiva *texto*
      .replace(/`(.*?)`/g, '$1')         // quitar código `texto`
      .replace(/#{1,6}\s/g, '')          // quitar encabezados ## texto
      .trim();

    // 8. Respuesta compatible con el frontend
    return res.status(200).json({
      id: Date.now().toString(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: botText
        }
      ]
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: "Error interno del servidor", message: error.message });
  }
}
