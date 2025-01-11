// Importar las dependencias necesarias
const http = require('http');
const WebSocket = require('ws');

// Crear el servidor HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.\n');
});

// Crear el servidor WebSocket
const wss = new WebSocket.Server({ server });

// Lista para almacenar usuarios conectados
const users = new Map(); // { socket: username }

// Manejar eventos de conexión
wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado');

  // Manejar mensajes recibidos de un cliente
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'login':
          // Registrar al usuario
          users.set(ws, data.username);
          broadcast({ type: 'userlist', users: Array.from(users.values()) });
          break;

        case 'chat':
          // Enviar mensaje de chat a todos los usuarios
          broadcast({ type: 'chat', username: users.get(ws), message: data.message });
          break;

        case 'draw':
          // Compartir actualizaciones del lienzo
          broadcast({ type: 'draw', username: users.get(ws), drawData: data.drawData }, ws);
          break;

        default:
          console.error('Tipo de mensaje desconocido:', data.type);
      }
    } catch (err) {
      console.error('Error procesando el mensaje:', err);
    }
  });

  // Manejar cierre de conexión
  ws.on('close', () => {
    console.log('Cliente desconectado');
    users.delete(ws);
    broadcast({ type: 'userlist', users: Array.from(users.values()) });
  });
});

// Función para enviar mensajes a todos los clientes
function broadcast(data, excludeSocket) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(message);
    }
  });
}

// Iniciar el servidor
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket funcionando en http://localhost:${PORT}`);
});
