// api/vercel-env.js
module.exports = (req, res) => {
  // Set CORS headers to allow requests from any origin
  // For production, you might want to restrict this to your frontend domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Vercel environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables not set.');
    return res.status(500).send({ error: 'Server configuration error.' });
  }

  res.status(200).send({
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey,
  });
}; 