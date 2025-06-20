import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

// Teste de rota principal
app.get('/', (req, res) => {
  res.send('API Ponte Sideswap Instant Online');
});

// Proxy para Sideswap Instant
// Use: /instant?base=LBTC&quote=USDT&amount=0.001
app.get('/instant', async (req, res) => {
  try {
    const { base, quote, amount } = req.query;
    if (!base || !quote || !amount) {
      return res.status(400).json({ error: 'Parâmetros base, quote e amount são obrigatórios' });
    }
    const apiUrl = `https://sideswap.io/api/instant?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&amount=${encodeURIComponent(amount)}`;
    const response = await axios.get(apiUrl);
    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
