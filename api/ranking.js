export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase no configurado' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  // GET: traer top 20 del ranking para una semana
  if (req.method === 'GET') {
    const semana = req.query.semana || 'semana1';
    const juego = req.query.juego || 'trivia';
    const response = await fetch(
      `${supabaseUrl}/rest/v1/ranking?semana=eq.${semana}&juego=eq.${juego}&order=score.desc&limit=20`,
      { headers }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  // POST: guardar un nuevo score
  if (req.method === 'POST') {
    const { nombre, score, semana, juego } = req.body;
    if (!nombre || score === undefined || !semana || !juego) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/ranking`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ nombre: nombre.trim().substring(0, 30), score, semana, juego, fecha: new Date().toISOString() })
    });
    if (response.ok) return res.status(200).json({ ok: true });
    const err = await response.json();
    return res.status(400).json({ error: err });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
