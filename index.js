const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('API Ponte Sideswap Instant Online');
});

app.get('/instant', async (req, res) => {
  const { base, quote, amount } = req.query;
  if (!base || !quote || !amount) {
    return res.status(400).json({ error: 'Missing params: base, quote, amount' });
  }
  const url = `https://sideswap.io/instant/?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&amount=${encodeURIComponent(amount)}`;
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ error: 'Erro do proxy', status: err.response.status, body: err.response.data });
    }
    res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
