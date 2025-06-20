const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('API Ponte Sideswap Instant Online');
});

// Endpoint proxy para sideswap.io/instant
app.get('/instant', async (req, res) => {
  const { base, quote, amount } = req.query;

  if (!base || !quote || !amount) {
    return res.status(400).json({ error: 'Missing params: base, quote, amount' });
  }

  const url = `https://sideswap.io/instant/?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&amount=${encodeURIComponent(amount)}`;

  try {
    // Use um User-Agent para evitar bloqueio
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    // Direto o retorno da API
    res.json(response.data);
  } catch (err) {
    // Log detalhado no Render
    console.error('Erro ao chamar sideswap.io/instant:', err.response?.status, err.response?.data);

    // Se a sideswap responder com erro
    if (err.response) {
      return res.status(502).json({
        error: 'Erro do proxy',
        status: err.response.status,
        body: err.response.data
      });
    }

    // Outro erro
    res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
