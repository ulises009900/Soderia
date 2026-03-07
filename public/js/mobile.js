const socket = io();
let userCoordinates = null;

// DOM Elements
const usernameInput = document.getElementById('username');
const statusElement = document.getElementById('status');
const dataTypeSelect = document.getElementById('dataType');
const contentInput = document.getElementById('content');
const getLocationBtn = document.getElementById('getLocationBtn');
const locationDisplay = document.getElementById('locationDisplay');
const submitBtn = document.getElementById('submitBtn');
const notificationDiv = document.getElementById('notification');
const historyContainer = document.getElementById('historyContainer');

// VERIFICAR LOGIN AL INICIO
const storedUser = localStorage.getItem('soderia_username');
if (!storedUser) {
  window.location.href = '/'; // Redirigir al login si no hay usuario
} else {
  usernameInput.value = storedUser;
  usernameInput.readOnly = true; // Bloquear edición
}

// Conectar y registrarse
socket.on('connect', () => {
  console.log('Conectado al servidor');
  updateStatus(true);
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
  updateStatus(false);
});

// Actualizar estado de conexión
function updateStatus(connected) {
  statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
  statusElement.className = connected ? 'status connected' : 'status disconnected';
  
  if (connected && usernameInput.value) {
    registerUser();
  }
}

// Registrarse como usuario móvil
function registerUser() {
  const username = usernameInput.value.trim();
  if (!username) {
    showNotification('Por favor ingresa tu nombre', 'error');
    return;
  }
  
  socket.emit('register', {
    username: username,
    role: 'mobile'
  });
}

// Obtener ubicación GPS
getLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showNotification('Tu navegador no soporta GPS', 'error');
    return;
  }

  getLocationBtn.disabled = true;
  getLocationBtn.textContent = '📍 Obteniendo...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      userCoordinates = { latitude, longitude, accuracy };
      
      locationDisplay.innerHTML = `
        <strong>Ubicación obtenida:</strong><br>
        Latitud: ${latitude.toFixed(6)}<br>
        Longitud: ${longitude.toFixed(6)}<br>
        Precisión: ${accuracy.toFixed(0)}m
      `;
      
      getLocationBtn.disabled = false;
      getLocationBtn.textContent = '📍 Obtener GPS';
      showNotification('Ubicación obtenida correctamente', 'success');
    },
    (error) => {
      getLocationBtn.disabled = false;
      getLocationBtn.textContent = '📍 Obtener GPS';
      showNotification(`Error al obtener ubicación: ${error.message}`, 'error');
    }
  );
});

// Enviar datos
submitBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const type = dataTypeSelect.value;
  const content = contentInput.value.trim();

  if (!username) {
    showNotification('Por favor ingresa tu nombre', 'error');
    return;
  }

  if (!content) {
    showNotification('Por favor ingresa contenido', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  const data = {
    type: type,
    content: content,
    coordinates: userCoordinates
  };

  socket.emit('submit_data', data);
});

// Respuestas del servidor
socket.on('success', (response) => {
  showNotification(response.message, 'success');
  contentInput.value = '';
  userCoordinates = null;
  locationDisplay.innerHTML = '';
  
  submitBtn.disabled = false;
  submitBtn.textContent = 'Enviar Datos';
  
  // Refrescar historial
  loadHistory();
});

socket.on('error', (response) => {
  showNotification(response.message, 'error');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Enviar Datos';
});

socket.on('new_data', (data) => {
  loadHistory();
});

socket.on('user_connected', (response) => {
  console.log(response.message);
});

// Cargar historial de datos actuales
async function loadHistory() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Mostrar solo últimos 5 datos del usuario actual
    const userHistory = data.filter(d => d.username === usernameInput.value).slice(0, 5);
    
    if (userHistory.length === 0) {
      historyContainer.innerHTML = '<p class="empty-state">Sin datos aún...</p>';
      return;
    }

    historyContainer.innerHTML = userHistory.map(item => `
      <div class="history-item">
        <strong>📝 ${item.data_type.toUpperCase()}</strong>
        <p>${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}</p>
        <small class="time">${new Date(item.created_at).toLocaleString('es-ES')}</small>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error cargando historial:', err);
  }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
  notificationDiv.textContent = message;
  notificationDiv.className = `notification show ${type}`;
  
  setTimeout(() => {
    notificationDiv.classList.remove('show');
  }, 4000);
}

// Cargar historial al iniciar
loadHistory();
setInterval(() => {
  if (usernameInput.value) {
    loadHistory();
  }
}, 5000);
