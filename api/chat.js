export default async function handler(req, res) {
  // 1. Verificamos que sea una petición POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 2. Cargamos la API Key (Asegúrate de que se llame así en Vercel)
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Configuración incompleta', 
      message: 'Falta la variable GOOGLE_GENERATION_AI_API_KEY en Vercel.' 
    });
  }

  try {
    // 3. Configuración del modelo y URL (Gemini 3 Flash)
    const MODEL = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // Extraemos el mensaje del alumno
    const messages = req.body.messages || [];
    const lastUserMessage = messages[messages.length - 1]?.content || "Hola";

    // 4. Cuerpo de la petición con instrucciones de "Tutor Socrático"
    const geminiBody = {
      system_instruction: {
        parts: [{ 
          text: `Eres un tutor de física socrático y breve. 
           Tus reglas:
           - NUNCA des la respuesta final.
           - Respuestas de máximo 2 o 3 oraciones.
           - Si el alumno acierta, confíma brevemente y pregunta: "¿Cuál es el siguiente paso?" o "¿Cómo aplicarías esto al problema?".
           - Usa LaTeX para fórmulas: $E = m \\cdot c^2$.` 
        }]
      },
      contents: [{
        role: "user",
        parts: [{ text: lastUserMessage }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200, // Limita físicamente la longitud de la respuesta
      }
    };

    // 5. Llamada a la API
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

    // 6. Extracción del texto de la respuesta
    const botResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";

    // 7. Formato de salida compatible con tu frontend de Claude
    return res.status(200).json({
      id: Date.now().toString(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: botResponseText
        }
      ]
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: "Error interno del servidor", message: error.message });
  }
}
