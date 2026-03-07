const socket = io();
let allData = [];
let allUsers = [];
let currentSelectedData = null;

// DOM Elements
const usernameInput = document.getElementById('username');
const statusElement = document.getElementById('status');
const userCountElement = document.getElementById('userCount');
const usersList = document.getElementById('usersList');
const dataList = document.getElementById('dataList');
const totalCountElement = document.getElementById('totalCount');
const todayCountElement = document.getElementById('todayCount');
const activeUsersElement = document.getElementById('activeUsers');
const filterType = document.getElementById('filterType');
const filterUser = document.getElementById('filterUser');
const refreshBtn = document.getElementById('refreshBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const notificationDiv = document.getElementById('notification');
const detailsModal = document.getElementById('detailsModal');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const closeModal = document.querySelector('.close');

// VERIFICAR LOGIN AL INICIO
const storedUser = localStorage.getItem('soderia_username');
if (!storedUser) {
  window.location.href = '/'; // Redirigir al login
} else {
  usernameInput.value = storedUser;
  usernameInput.readOnly = true;
}

// Conectar
socket.on('connect', () => {
  console.log('Conectado como Desktop');
  updateStatus(true);
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
  updateStatus(false);
});

function updateStatus(connected) {
  statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
  statusElement.className = connected ? 'status connected' : 'status disconnected';
  
  if (connected && usernameInput.value) {
    registerUser();
  }
}

// Registrarse
function registerUser() {
  const username = usernameInput.value.trim();
  if (!username) {
    showNotification('Por favor ingresa tu nombre', 'error');
    return;
  }
  
  socket.emit('register', {
    username: username,
    role: 'desktop'
  });
  
  loadData();
}

// Eventos de WebSocket
socket.on('user_connected', (response) => {
  allUsers = response.users;
  updateUsersList();
  updateStats();
  console.log(response.message);
});

socket.on('user_disconnected', (response) => {
  allUsers = response.users;
  updateUsersList();
  updateStats();
});

socket.on('new_data', (data) => {
  allData.unshift(data);
  renderData();
  updateStats();
});

socket.on('data_deleted', (response) => {
  allData = allData.filter(d => d.id !== response.id);
  renderData();
  updateStats();
});

socket.on('data_updated', (data) => {
  const index = allData.findIndex(d => d.id === data.id);
  if (index !== -1) {
    allData[index] = data;
  }
  renderData();
});

socket.on('success', (response) => {
  showNotification(response.message, 'success');
});

socket.on('error', (response) => {
  showNotification(response.message, 'error');
});

// Cargar datos
async function loadData() {
  try {
    const response = await fetch('/api/data');
    allData = await response.json();
    renderData();
    updateStats();
  } catch (err) {
    console.error('Error cargando datos:', err);
    showNotification('Error al cargar datos', 'error');
  }
}

// Renderizar datos con filtros
function renderData() {
  const typeFilter = filterType.value;
  const userFilter = filterUser.value;

  let filtered = allData;

  if (typeFilter !== 'all') {
    filtered = filtered.filter(d => d.data_type === typeFilter);
  }

  if (userFilter !== 'all') {
    filtered = filtered.filter(d => d.username === userFilter);
  }

  if (filtered.length === 0) {
    dataList.innerHTML = '<p class="empty-state">No hay datos para mostrar</p>';
    return;
  }

  dataList.innerHTML = filtered.map(item => `
    <div class="data-card" onclick="showDetails(${item.id})">
      <div class="data-card-header">
        <span class="data-card-type">${getIcon(item.data_type)} ${item.data_type.toUpperCase()}</span>
        <span class="data-card-user">👤 ${item.username}</span>
      </div>
      <div class="data-card-content">${escapeHtml(item.content).substring(0, 150)}${item.content.length > 150 ? '...' : ''}</div>
      <div class="data-card-meta">
        <span>${new Date(item.created_at).toLocaleDateString('es-ES')}</span>
        <span>${new Date(item.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
    </div>
  `).join('');
}

// Mostrar detalles
function showDetails(dataId) {
  const data = allData.find(d => d.id === dataId);
  if (!data) return;

  currentSelectedData = data;
  
  const detailsTitle = document.getElementById('detailsTitle');
  const detailsBody = document.getElementById('detailsBody');

  detailsTitle.textContent = `${getIcon(data.data_type)} ${data.data_type.toUpperCase()} - ${data.username}`;

  let html = `<strong>Contenido:</strong><p>${escapeHtml(data.content)}</p>`;
  
  if (data.coordinates) {
    try {
      const coords = JSON.parse(data.coordinates);
      html += `
        <hr>
        <strong>📍 Ubicación:</strong><br>
        Latitud: ${coords.latitude.toFixed(6)}<br>
        Longitud: ${coords.longitude.toFixed(6)}<br>
        Precisión: ${coords.accuracy.toFixed(0)}m<br>
        <a href="https://maps.google.com/maps?q=${coords.latitude},${coords.longitude}" target="_blank" class="btn btn-primary" style="margin-top: 10px;">Ver en Google Maps</a>
      `;
    } catch (e) {
      html += `<hr><strong>Ubicación:</strong> ${data.coordinates}`;
    }
  }

  html += `<hr><small><strong>Creado:</strong> ${new Date(data.created_at).toLocaleString('es-ES')}</small>`;

  detailsBody.innerHTML = html;
  detailsModal.showModal();
}

// Eliminar datos
deleteBtn.addEventListener('click', () => {
  if (!currentSelectedData) return;

  if (confirm('¿Estás seguro de que deseas eliminar este dato?')) {
    socket.emit('delete_data', currentSelectedData.id);
    detailsModal.close();
  }
});

// Editar datos
editBtn.addEventListener('click', () => {
  if (!currentSelectedData) return;

  const newContent = prompt('Editar contenido:', currentSelectedData.content);
  if (newContent !== null) {
    socket.emit('update_data', {
      id: currentSelectedData.id,
      content: newContent,
      coordinates: currentSelectedData.coordinates
    });
    detailsModal.close();
  }
});

// Cerrar modal
closeModal.addEventListener('click', () => detailsModal.close());

// Actualizar lista de usuarios
function updateUsersList() {
  if (allUsers.length === 0) {
    usersList.innerHTML = '<p class="empty-state">Sin usuarios conectados</p>';
    return;
  }

  usersList.innerHTML = allUsers.map(user => `
    <span class="user-badge">${user.role === 'mobile' ? '📱' : '🖥️'} ${user.username}</span>
  `).join('');
}

// Actualizar estadísticas
function updateStats() {
  totalCountElement.textContent = allData.length;
  userCountElement.textContent = `Usuarios: ${allUsers.length}`;
  activeUsersElement.textContent = allUsers.length;

  // Contar datos de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = allData.filter(d => new Date(d.created_at) >= today).length;
  todayCountElement.textContent = todayCount;

  // Actualizar filtro de usuarios
  const currentUserFilter = filterUser.value;
  const uniqueUsers = [...new Set(allData.map(d => d.username))];
  
  const userOptions = '<option value="all">Todos los usuarios</option>' + 
    uniqueUsers.map(u => `<option value="${u}">${u}</option>`).join('');
  
  filterUser.innerHTML = userOptions;
  filterUser.value = currentUserFilter;
}

// Botones de acción
refreshBtn.addEventListener('click', () => {
  loadData();
  showNotification('Datos actualizado', 'info');
});

clearAllBtn.addEventListener('click', () => {
  if (confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
    allData.forEach(data => {
      socket.emit('delete_data', data.id);
    });
  }
});

// Filtros
filterType.addEventListener('change', renderData);
filterUser.addEventListener('change', renderData);

// Funciones auxiliares
function getIcon(type) {
  const icons = {
    text: '📝',
    command: '⚙️',
    location: '📍',
    image: '🖼️'
  };
  return icons[type] || '📄';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  notificationDiv.textContent = message;
  notificationDiv.className = `notification show ${type}`;
  
  setTimeout(() => {
    notificationDiv.classList.remove('show');
  }, 4000);
}

// Cargar datos al iniciar
loadData();

// Recargar datos cada 10 segundos
setInterval(loadData, 10000);
