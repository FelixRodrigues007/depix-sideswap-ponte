// depix.js
import WebSocket from 'ws';
import axios from 'axios';

const WS_URL = 'wss://api.sideswap.io/json-rpc-ws';
const L_BTC_ASSET = '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d'; // base
const DEPIX_ASSET = '02f22f8d9c76ab41661a2729e4752e2c5d1a263012141b86ea98af5472df5189'; // quote
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;

// Validação da variável de ambiente
if (!N8N_WEBHOOK) {
  console.warn('⚠️  N8N_WEBHOOK_URL não configurado. Dados não serão enviados para N8N.');
}

let ws;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

function connectWebSocket() {
  try {
    ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      log('info', '✅ WebSocket conectado');
      reconnectAttempts = 0;
      
      // Subscrever aos dados de mercado
      const subscribeMessage = {
        id: 1,
        method: 'market',
        params: {
          chart_sub: {
            asset_pair: { base: L_BTC_ASSET, quote: DEPIX_ASSET }
          }
        }
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      log('info', 'Subscrição enviada', subscribeMessage);
    });
    
    ws.on('message', async (raw) => {
      try {
        const rawString = raw.toString();
        log('debug', '<<< Mensagem recebida', { size: rawString.length });
        
        const msg = JSON.parse(rawString);
        
        if (msg.method === 'market') {
          // Resposta inicial com histórico
          if (msg.result?.chart_sub?.data) {
            const candles = msg.result.chart_sub.data;
            if (candles.length > 0) {
              const last = candles[candles.length - 1];
              log('info', '[histórico] Último preço', { close: last.close });
              
              // Enviar para N8N se configurado
              if (N8N_WEBHOOK) {
                await sendToN8N({
                  pair: 'DePIX/L-BTC',
                  timestamp: new Date().toISOString(),
                  close: last.close,
                  type: 'historical'
                });
              }
            }
          }
          
          // Atualizações em tempo real
          if (msg.params?.chart_update) {
            const { timestamp, close } = msg.params.chart_update.update;
            log('info', '[tick] Atualização em tempo real', { timestamp, close });
            
            // Enviar para N8N
            if (N8N_WEBHOOK) {
              await sendToN8N({
                pair: 'DePIX/L-BTC',
                timestamp,
                close,
                type: 'realtime'
              });
            }
          }
        }
      } catch (error) {
        log('error', 'Erro ao processar mensagem', { error: error.message, stack: error.stack });
      }
    });
    
    ws.on('error', (err) => {
      log('error', 'Erro WebSocket', { error: err.message });
    });
    
    ws.on('close', (code, reason) => {
      log('warn', 'WebSocket fechado', { code, reason: reason?.toString() });
      
      // Tentar reconectar
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        log('info', `Tentando reconectar em ${RECONNECT_DELAY}ms`, { 
          attempt: reconnectAttempts, 
          maxAttempts: MAX_RECONNECT_ATTEMPTS 
        });
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      } else {
        log('error', 'Máximo de tentativas de reconexão atingido');
        process.exit(1);
      }
    });
    
  } catch (error) {
    log('error', 'Erro ao conectar WebSocket', { error: error.message });
  }
}

async function sendToN8N(data) {
  if (!N8N_WEBHOOK) {
    log('warn', 'N8N webhook não configurado, pulando envio');
    return;
  }
  
  try {
    log('debug', 'Enviando dados para N8N', { url: N8N_WEBHOOK, data });
    
    const response = await axios.post(N8N_WEBHOOK, data, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'depix-ws-client/1.0'
      }
    });
    
    log('info', 'Dados enviados para N8N com sucesso', { 
      status: response.status,
      statusText: response.statusText 
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      log('error', 'Timeout ao enviar para N8N', { timeout: '5000ms' });
    } else if (error.response) {
      log('error', 'Erro HTTP ao enviar para N8N', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      log('error', 'Erro de rede ao enviar para N8N', { error: error.message });
    }
  }
}

// Iniciar conexão
log('info', 'Iniciando cliente DePIX WebSocket');
connectWebSocket();

// Graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Recebido SIGINT, fechando conexão...');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, 'Shutdown graceful');
  }
  setTimeout(() => {
    log('info', 'Processo finalizado');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  log('info', 'Recebido SIGTERM, fechando conexão...');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, 'Shutdown graceful');
  }
  setTimeout(() => {
    log('info', 'Processo finalizado');
    process.exit(0);
  }, 1000);
});
