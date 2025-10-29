const LOCAL_URL = 'http://localhost:3000';
const PRODUCTION_URL = 'https://ord-extension-backend-production.up.railway.app';

let backendUrl = PRODUCTION_URL;

const backendUrlInput = document.getElementById('backendUrl');
const saveBackendBtn = document.getElementById('saveBackendBtn');
const useLocalBtn = document.getElementById('useLocalBtn');
const useProductionBtn = document.getElementById('useProductionBtn');
const backendHelp = document.getElementById('backendHelp');
const connectionStatus = document.getElementById('connectionStatus');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
const totalFilesEl = document.getElementById('totalFiles');
const totalSizeEl = document.getElementById('totalSize');
const connectionIndicator = document.getElementById('connectionIndicator');
const connectionText = document.getElementById('connectionText');

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get('backendUrl');

  if (stored.backendUrl) {
    backendUrl = stored.backendUrl;
    backendUrlInput.value = backendUrl;
    console.log('[Popup] Using stored URL:', backendUrl);
  } else {
    console.log('[Popup] No stored URL, auto-detecting...');
    backendUrl = await detectEnvironment();
    backendUrlInput.value = backendUrl;
    await chrome.storage.local.set({ backendUrl });
  }

  await testConnection();
  await loadStats();
});

async function detectEnvironment() {
  console.log('[Popup] Testing local backend...');

  const isLocal = await testBackendHealth(LOCAL_URL);

  if (isLocal) {
    console.log('[Popup] ✓ Local backend detected');
    return LOCAL_URL;
  }

  console.log('[Popup] ✓ Using production backend');
  return PRODUCTION_URL;
}

async function testBackendHealth(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${url}/health`, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch (error) {
    return false;
  }
}

useLocalBtn.addEventListener('click', async () => {
  backendUrl = LOCAL_URL;
  backendUrlInput.value = LOCAL_URL;
  backendHelp.textContent = 'localhost:3000 - for development';

  await chrome.storage.local.set({ backendUrl: LOCAL_URL });
  showConnectionStatus('info', 'Switched to local backend. Testing...');

  await testConnection();
  await loadStats();
});

// Quick switch to production
useProductionBtn.addEventListener('click', async () => {
  backendUrl = PRODUCTION_URL;
  backendUrlInput.value = PRODUCTION_URL;
  backendHelp.textContent = 'Railway production - shared by all users';

  await chrome.storage.local.set({ backendUrl: PRODUCTION_URL });
  showConnectionStatus('info', 'Switched to production backend. Testing...');

  await testConnection();
  await loadStats();
});

// Test connection button
saveBackendBtn.addEventListener('click', async () => {
  showConnectionStatus('info', 'Testing connection...');
  await testConnection();
  await loadStats();
});

fileInput.addEventListener('change', () => {
  uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
});

uploadBtn.addEventListener('click', async () => {
  await uploadFile();
});

refreshStatsBtn.addEventListener('click', async () => {
  await loadStats();
});

// ===== FUNCTIONS =====

async function testConnection() {
  connectionText.textContent = 'Testing connection...';
  connectionIndicator.className = 'connection-indicator';

  try {
    const response = await fetch(`${backendUrl}/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ok') {
      showConnectionStatus('success', `✓ Connected to backend!\nUptime: ${Math.round(data.uptime)}s`);
      connectionIndicator.className = 'connection-indicator online';
      connectionText.textContent = 'Backend Online';
      uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
      return true;
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    showConnectionStatus('error', `✗ Connection failed: ${error.message}\n\nMake sure backend is running:\n  cd backend\n  yarn dev`);
    connectionIndicator.className = 'connection-indicator offline';
    connectionText.textContent = 'Backend Offline';
    uploadBtn.disabled = true;
    return false;
  }
}

async function uploadFile() {
  const file = fileInput.files[0];

  if (!file) {
    showUploadStatus('error', 'Please select a file');
    return;
  }

  showUploadStatus('loading', `Uploading ${file.name}...`);
  uploadBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      uploadedVia: 'Cinema Extension',
      uploadedAt: Date.now()
    }));

    const response = await fetch(`${backendUrl}/api/media/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      showUploadStatus('success', `✓ Upload successful!\n\nMedia ID: ${data.media.id}\nName: ${data.media.metadata.name}\nSize: ${formatBytes(data.media.metadata.size)}\n\n✨ Now available to all users!`);

      // Clear file input
      fileInput.value = '';

      // Refresh stats
      await loadStats();
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error) {
    showUploadStatus('error', `✗ Upload failed: ${error.message}`);
  } finally {
    uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
  }
}

async function loadStats() {
  try {
    const response = await fetch(`${backendUrl}/api/stats`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      totalFilesEl.textContent = data.stats.totalFiles || 0;
      totalSizeEl.textContent = formatBytes(data.stats.totalSize || 0);
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
    totalFilesEl.textContent = '?';
    totalSizeEl.textContent = '?';
  }
}

function showConnectionStatus(type, message) {
  connectionStatus.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function showUploadStatus(type, message) {
  uploadStatus.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== MEDIA MANAGEMENT =====
const mediaList = document.getElementById('mediaList');
const loadMediaBtn = document.getElementById('loadMediaBtn');

loadMediaBtn.addEventListener('click', loadMediaList);

async function loadMediaList() {
  try {
    loadMediaBtn.disabled = true;
    loadMediaBtn.textContent = 'Loading...';

    const response = await fetch(`${backendUrl}/api/media`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.media.length > 0) {
      renderMediaList(data.media);
    } else {
      mediaList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No media files yet</div>';
    }

  } catch (error) {
    console.error('Failed to load media list:', error);
    mediaList.innerHTML = '<div style="text-align: center; color: #f44336; padding: 20px;">Failed to load media</div>';
  } finally {
    loadMediaBtn.disabled = false;
    loadMediaBtn.textContent = 'Reload Media List';
  }
}

function renderMediaList(media) {
  mediaList.innerHTML = '';

  media.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'media-item';
    itemEl.innerHTML = `
      <div class="media-info">
        <div class="media-name" title="${item.metadata.name}">${item.metadata.name}</div>
        <div class="media-size">${formatBytes(item.metadata.size)}</div>
      </div>
      <button class="delete-btn" data-id="${item.id}">Delete</button>
    `;

    // Add delete handler
    const deleteBtn = itemEl.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteMedia(item.id, item.metadata.name));

    mediaList.appendChild(itemEl);
  });
}

async function deleteMedia(mediaId, mediaName) {
  if (!confirm(`Delete "${mediaName}"?\n\nThis will permanently remove the file from the backend.`)) {
    return;
  }

  try {
    const response = await fetch(`${backendUrl}/api/media/${mediaId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // Reload list and stats
      await loadMediaList();
      await loadStats();
      showConnectionStatus('success', `✓ Deleted "${mediaName}"`);
      setTimeout(() => {
        connectionStatus.innerHTML = '';
      }, 3000);
    } else {
      throw new Error(data.error || 'Delete failed');
    }

  } catch (error) {
    console.error('Failed to delete media:', error);
    showConnectionStatus('error', `✗ Delete failed: ${error.message}`);
  }
}
