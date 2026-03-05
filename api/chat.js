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
    // 3. Modelo actual del free tier
    const MODEL = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // 4. Datos del frontend
    const messages = req.body.messages || [];
    const exerciseContext = req.body.exerciseContext || "";

    // 5. Inyectar el contexto del ejercicio como primer turno del historial
    //    Así Gemini siempre sabe de qué ejercicio se trata
    const contextTurn = [
      {
        role: "user",
        parts: [{ text: `Contexto del ejercicio que estamos trabajando:\n${exerciseContext}` }]
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Voy a guiar al alumno en este ejercicio con preguntas socráticas, sin dar la respuesta directa." }]
      }
    ];

    const historyTurns = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const contents = [...contextTurn, ...historyTurns];

    // 6. Cuerpo de la petición
    const geminiBody = {
      system_instruction: {
        parts: [{
          text: `Sos NewtonBot, tutor de física para alumnos de 4° año secundario (Argentina). Semana 1: Magnitudes, Unidades y Conversiones.

REGLAS ESTRICTAS que debés cumplir en cada respuesta:
- Respondé SIEMPRE en español rioplatense (tutear con "vos").
- NUNCA des la respuesta final ni parcialmente.
- Máximo 3 oraciones por respuesta. Terminá SIEMPRE con una pregunta.
- Si el alumno acierta, confirmá con una oración y preguntá el siguiente paso.
- Si se equivoca, hacé preguntas que lo lleven a notar el error por su cuenta, sin decirle que se equivocó directamente.
- Si pide la solución directa, decile amablemente que tu trabajo es ayudarlo a pensar.
- Usá texto plano. PROHIBIDO usar asteriscos, markdown, caracteres chinos o especiales.
- Para fórmulas usá texto simple: por ejemplo F = m * a, o 1 kg = 1000 g.
- Emojis: máximo 1 por mensaje.

CONVERSIONES QUE CONOCÉS: 1 km = 1000 m, 1 h = 3600 s, 1 min = 60 s, 1 ms = 0.001 s, 1 t = 1000 kg, 1 kg = 1000 g. Para km/h a m/s se divide por 3.6.`
        }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    };

    // 7. Llamada a la API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Google:", JSON.stringify(data));

      // Error de quota: devolver mensaje amigable en vez de romper la UI
      if (response.status === 429) {
        return res.status(200).json({
          id: Date.now().toString(),
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Recibí demasiadas consultas en poco tiempo. Esperá unos segundos y volvé a intentarlo." }]
        });
      }

      return res.status(response.status).json({ error: "Error en Gemini API", details: data });
    }

    // 8. Extraer texto y limpiar cualquier markdown residual
    let botText = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "No pude generar una respuesta.";

    botText = botText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .trim();

    // 9. Respuesta en el formato que espera el frontend
    return res.status(200).json({
      id: Date.now().toString(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: botText }]
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: "Error interno del servidor", message: error.message });
  }
}
