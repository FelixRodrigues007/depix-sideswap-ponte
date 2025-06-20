// index.js
const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// Altere para o endereço e porta onde o sideswap_manager está rodando
const SIDESWAP_WS_URL = process.env.SIDESWAP_WS_URL || 'ws://localhost:8080';

// Para armazenar a última cotação recebida
let lastQuote = null;

// Conecta ao WebSocket do sideswap_manager
const ws = new WebSocket(SIDESWAP_WS_URL);

ws.on('open', () => {
  // Envia mensagem para assinar as cotações do par desejado
  ws.send(JSON.stringify({
    id: 1,
    method: "market",
    params: {
      chart_sub: {
        asset_pair: { base: "LBTC", quote: "USDT" }
      }
    }
  }));
});

ws.on('message', (data) => {
  // Atualiza última cotação recebida
  lastQuote = data.toString();
});

ws.on('error', (err) => {
  console.error("Erro no WebSocket:", err);
});

// Rota REST para consultar cotação
app.get('/instant', (req, res) => {
  if (!lastQuote) {
    return res.status(503).json({ error: "Cotação não disponível ainda" });
  }
  res.type('json').send(lastQuote);
});

app.get('/', (req, res) => {
  res.send('SideSwap Ponte API online.');
});

app.listen(port, () => {
  console.log(`Servidor SideSwap Ponte rodando na porta ${port}`);
});
