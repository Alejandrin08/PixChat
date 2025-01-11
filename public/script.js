//CONSTANTES
const MODES = {
  DRAW: 'draw',
  ERASE: 'erase',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  PICKER: 'picker',
  SAVE: 'save'
}

//UTILIDADES
const $ = selector => document.querySelector(selector)
const $$ = selector => document.querySelectorAll(selector)

//ELEMENTOS
const $canvas = $('#canvas')
const $colorPicker = $('#color-picker')
const $clearBtn = $('#clear-btn')
const $drawBtn = $('#draw-btn')
const $eraseBtn = $('#erase-btn')
const $rectangleBtn = $('#rectangle-btn')
const $ellipseBtn = $('#ellipse-btn')
const $pickerBtn = $('#picker-btn')
const $saveBtn = $('#save-btn')
const $loginPage = $('#login-page')
const $drawPage = $('#draw-page')
const $loginInput = $('#login-input')
const $loginButton = $('#login-button')
const $userList = $('#user-list')
const $chatBox = $('#chat-box')
const $messageInput = $('#message-input')
const $sendButton = $('#send-button')
const ctx = $canvas.getContext('2d')

// WebSocket
const socket = new WebSocket('ws://localhost:8080');

// Variables globales
let username = '';

// Función para enviar mensajes al servidor
function sendMessage(type, data) {
socket.send(JSON.stringify({ type, ...data }));
}

// Evento para manejar el inicio de sesión
$loginButton.addEventListener('click', () => {
if ($loginInput.value.trim()) {
  username = $loginInput.value.trim();
  sendMessage('login', { username });

  // Mostrar la página de dibujo y ocultar la de login
  $loginPage.style.display = 'none';
  $drawPage.style.display = 'block';
}
});

// Evento para enviar mensajes de chat
$sendButton.addEventListener('click', () => {
if ($messageInput.value.trim()) {
  sendMessage('chat', { message: $messageInput.value.trim() });
  $messageInput.value = '';
}
});

// Manejar mensajes recibidos del servidor
socket.addEventListener('message', (event) => {
const data = JSON.parse(event.data);

switch (data.type) {
  case 'userlist':
    // Actualizar la lista de usuarios conectados
    $userList.innerHTML = '';
    data.users.forEach((user) => {
      const li = document.createElement('li');
      li.textContent = user;
      $userList.appendChild(li);
    });
    break;

  case 'chat':
    // Mostrar mensajes de chat
    const message = document.createElement('div');
    message.textContent = `${data.username}: ${data.message}`;
    $chatBox.appendChild(message);
    $chatBox.scrollTop = $chatBox.scrollHeight;
    break;

  case 'draw':
    // Manejar actualizaciones del lienzo (implementar sincronización más adelante)
    console.log('Dibujo recibido de', data.username, data.drawData);
    break;

  default:
    console.error('Tipo de mensaje desconocido:', data.type);
}
});

// Manejar eventos de error o desconexión
socket.addEventListener('close', () => {
alert('Se perdió la conexión con el servidor.');
});

socket.addEventListener('error', (err) => {
console.error('Error en WebSocket:', err);
});

//ESTADOS
let isDrawing = false
let isShiftPressed = false
let startX, startY
let lastX = 0
let lastY = 0
let mode = MODES.DRAW
let imageData

//EVENTOS
$canvas.addEventListener('mousedown', startDrawing)
$canvas.addEventListener('mousemove', draw)
$canvas.addEventListener('mouseup', stopDrawing)
$canvas.addEventListener('mouseleave', stopDrawing)

$colorPicker.addEventListener('change', handleChangeColor)
$clearBtn.addEventListener('click', clearCanvas)

document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)

$pickerBtn.addEventListener('click', () => {
setMode(MODES.PICKER)
})

$eraseBtn.addEventListener('click', () => {
setMode(MODES.ERASE)
})

$rectangleBtn.addEventListener('click', () => {
setMode(MODES.RECTANGLE)
})

$ellipseBtn.addEventListener('click', () => {
setMode(MODES.ELLIPSE)
})

$drawBtn.addEventListener('click', () => {
setMode(MODES.DRAW)
})

$saveBtn.addEventListener('click', () => {
setMode(MODES.SAVE)
})

//METODOS
function startDrawing(event) {
isDrawing = true

const { offsetX, offsetY } = event;

//Guardar las coordenadas iniciales
[startX, startY] = [offsetX, offsetY];
[lastX, lastY] = [offsetX, offsetY];

imageData = ctx.getImageData(
  0, 0, canvas.width, canvas.height
);
}

function draw(event) {
if (!isDrawing) return

const { offsetX, offsetY } = event

if (mode === MODES.DRAW || mode === MODES.ERASE) {
  //Comenzar un trazado
  ctx.beginPath()

  //Mover el trazado a las coordenadas actuales
  ctx.moveTo(lastX, lastY)

  //Dibujar una línea entre coordenadas actuales y las nuevas
  ctx.lineTo(offsetX, offsetY)

  ctx.stroke();

  //Actualizar la última coordenada utilizada
  [lastX, lastY] = [offsetX, offsetY]

  return
}

if (mode === MODES.RECTANGLE || mode === MODES.ELLIPSE) {
  ctx.putImageData(imageData, 0, 0);

  //StartX -> coordenada inicial del click
  let width = offsetX - startX
  let height = offsetY - startY

  if (isShiftPressed) {
    const sideLength = Math.min(
      Math.abs(width),
      Math.abs(height)
    )

    width = width > 0 ? sideLength : -sideLength
    height = height > 0 ? sideLength : -sideLength
  }

  ctx.beginPath()
  if (mode === MODES.RECTANGLE) {
    ctx.rect(startX, startY, width, height)
  } else if (mode === MODES.ELLIPSE) {
    const centerX = startX + width / 2
    const centerY = startY + height / 2
    const radiusX = Math.abs(width / 2)
    const radiusY = Math.abs(height / 2)
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
  }
  ctx.stroke()
  return
}
}

function stopDrawing(event) {
isDrawing = false
}

function handleChangeColor() {
const { value } = $colorPicker
ctx.strokeStyle = value
}

function clearCanvas() {
//Ayudaría a limpiar parte del canvas con la herramienta de selección
ctx.clearRect(0, 0, canvas.width, canvas.height)
}

async function setMode(newMode) {
let previousMode = mode
mode = newMode
//para limpiar el botón activo actual
$('button.active')?.classList.remove('active')

if (mode === MODES.DRAW) {
  $drawBtn.classList.add('active')
  canvas.style.cursor = 'crosshair'
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 2
  return
}

if (mode === MODES.RECTANGLE) {
  $rectangleBtn.classList.add('active')
  canvas.style.cursor = 'nw-resize'
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 2
  return
}

if (mode === MODES.ELLIPSE) {
  $ellipseBtn.classList.add('active')
  canvas.style.cursor = 'nw-resize'
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 2
  return
}

if (mode === MODES.ERASE) {
  $eraseBtn.classList.add('active')
  canvas.style.cursor = 'url("./cursors/erase.png") 0 24, auto';
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = 20
  return
}

if (mode === MODES.PICKER) {
  $pickerBtn.classList.add('active')
  const eyeDropper = new window.EyeDropper()

  try {
    const result = await eyeDropper.open()
    const { sRGBHex } = result
    ctx.strokeStyle = sRGBHex
    $colorPicker.value = sRGBHex
    setMode(previousMode)
  } catch (e) {
    //Si ha habido un error o el usuario no ha recuperado ningún color
  }

  return
}

if (mode === MODES.SAVE) {
  ctx.globalCompositeOperation='destination-over';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const link = document.createElement('a');
  link.href = canvas.toDataURL()
  link.download = 'My Draw.png';
  link.click()
  setMode(previousMode)
  return
}
}

function handleKeyDown({ key }) {
isShiftPressed = key === 'Shift'
}

function handleKeyUp({ key }) {
if (key === 'Shift') isShiftPressed = false
}

//INICIAR
setMode(MODES.DRAW)

//show Picker if browser has support
if (typeof window.EyeDropper !== 'undefined') {
$pickerBtn.removeAttribute('disabled')
}

ctx.lineJoin = 'round'
ctx.lineCap = 'round'
