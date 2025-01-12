const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ port: 8080 });
console.log('Servidor WebSocket en http://localhost:8080');

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

server.listen(3000, () => {
  console.log('Cliente en http://localhost:3000');
});

const users = new Map();

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'login':
          users.set(ws, data.username);
          broadcast({ type: 'userlist', users: Array.from(users.values()) });
          break;

        case 'chat':
          broadcast({ type: 'chat', username: users.get(ws), message: data.message, isImage: data.isImage});
          break;

        case 'draw':
          broadcast({ type: 'draw', username: users.get(ws), drawData: data.drawData }, ws);
          break;

        default:
          console.error('Tipo de mensaje desconocido:', data.type);
      }
    } catch (err) {
      console.error('Error procesando el mensaje:', err);
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    users.delete(ws);
    broadcast({ type: 'userlist', users: Array.from(users.values()) });
  });
});

function broadcast(data, excludeSocket) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(message);
    }
  });
}