console.log('[Cinema Extension] Content script loaded');

// Inject bridge script (top frame only to avoid duplicates)
if (window === window.top) {
  if (!window.__CINEMA_BRIDGE_INJECTED__) {
    window.__CINEMA_BRIDGE_INJECTED__ = true;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-bridge.js');
    script.onload = function() {
      console.log('[Cinema Extension] Bridge script injected in top frame');
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  } else {
    console.log('[Cinema Extension] Bridge already injected, skipping');
  }
} else {
  console.log('[Cinema Extension] Skipping bridge injection in iframe - will use top frame bridge');
}

// Backend URL configuration (set via popup, fallback to localhost)
let API_BASE_URL = null;

(async () => {
  try {
    const stored = await chrome.storage.local.get('backendUrl');

    if (stored.backendUrl) {
      API_BASE_URL = stored.backendUrl;
      console.log('[Cinema Extension] Using backend URL:', API_BASE_URL);
    } else {
      API_BASE_URL = 'http://localhost:3000';
      console.log('[Cinema Extension] No stored URL, using localhost');
    }
  } catch (error) {
    console.error('[Cinema Extension] Error loading backend URL:', error);
    API_BASE_URL = 'http://localhost:3000';
  }
})();

// Detect if extension was reloaded (invalidated context)
let extensionInvalidated = false;

chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('[Cinema Extension] Extension context invalidated - page needs reload');
    extensionInvalidated = true;

    if (confirm('Cinema extension was updated. Click OK to reload the page.')) {
      window.location.reload();
    }
  }
});

// Listen for contract calls (top frame only)
if (window === window.top) {
  console.log('[Cinema Extension] Setting up contract call listener in TOP FRAME');

  document.addEventListener('CINEMA_TO_EXTENSION', async (event) => {
    const data = event.detail;
    if (!data || data.type !== 'ORDINALS_CONTRACT_CALL') {
      return;
    }

    const { inscriptionId, method, params } = data.payload || {};

    if (inscriptionId !== 'cinema-player') {
      return;
    }

    console.log(`[Cinema Extension] Received: ${method}`, params);

    if (extensionInvalidated) {
      console.error('[Cinema Extension] Extension invalidated, cannot process request');
      sendResponse(inscriptionId, null, 'Extension was reloaded. Please refresh the page.');
      return;
    }

    try {
      let result;

      switch (method) {
        case 'listMedia':
          result = await listMediaFromBackend();
          break;

        case 'getMedia':
          result = await getMediaFromBackend(params.mediaId);
          break;

        case 'joinChatRoom':
          joinChatRoom(params.roomId);
          return; // No response needed

        case 'sendChatMessage':
          sendChatMessage(params.message);
          return;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      sendResponse(inscriptionId, result);

    } catch (error) {
      console.error('[Cinema Extension] Error:', error);
      sendResponse(inscriptionId, null, error.message);
    }
  });
} else {
  console.log('[Cinema Extension] Skipping contract call listener in iframe');
}

// IndexedDB cache configuration
const DB_NAME = 'CinemaMediaCache';
const DB_VERSION = 1;
const STORE_NAME = 'mediaFiles';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[Cinema Cache] Database error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[Cinema Cache] Database opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'mediaId' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[Cinema Cache] Object store created');
      }
    };
  });
}

async function getCachedMedia(mediaId) {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(mediaId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log(`[Cinema Cache] HIT - Found ${mediaId} in cache`);
          resolve(result);
        } else {
          console.log(`[Cinema Cache] MISS - ${mediaId} not in cache`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[Cinema Cache] Read error:', request.error);
        resolve(null);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[Cinema Cache] Error accessing cache:', error);
    return null;
  }
}

async function setCachedMedia(mediaId, metadata, blob) {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const cacheEntry = {
        mediaId: mediaId,
        metadata: metadata,
        blob: blob,
        timestamp: Date.now()
      };

      const request = objectStore.put(cacheEntry);

      request.onsuccess = () => {
        console.log(`[Cinema Cache] STORED - ${mediaId} cached (${formatBytes(metadata.size)})`);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[Cinema Cache] Write error:', request.error);
        resolve(false);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[Cinema Cache] Error storing in cache:', error);
    return false;
  }
}

async function listMediaFromBackend() {
  console.log('[Cinema Extension] Fetching media list from backend...');

  let retries = 0;
  while (!API_BASE_URL && retries < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!API_BASE_URL) {
    throw new Error('Backend URL not initialized');
  }

  const response = await fetch(`${API_BASE_URL}/api/media`);

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch media list');
  }

  console.log(`[Cinema Extension] Found ${data.media.length} media files`);

  return { media: data.media };
}

async function getMediaFromBackend(mediaId) {
  console.log(`[Cinema Extension] Fetching media: ${mediaId}`);

  const cached = await getCachedMedia(mediaId);
  if (cached) {
    const base64 = await blobToBase64(cached.blob);
    console.log(`[Cinema Extension] ✓ Served from cache: ${cached.metadata.name} (${formatBytes(cached.metadata.size)}) - NO BANDWIDTH COST!`);
    return {
      data: base64,
      metadata: cached.metadata,
      isBase64: true
    };
  }

  console.log(`[Cinema Extension] Not in cache, fetching from backend...`);

  let retries = 0;
  while (!API_BASE_URL && retries < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!API_BASE_URL) {
    throw new Error('Backend URL not initialized');
  }

  const metadataResponse = await fetch(`${API_BASE_URL}/api/media/${mediaId}/metadata`);

  if (!metadataResponse.ok) {
    throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
  }

  const metadataData = await metadataResponse.json();

  if (!metadataData.success) {
    throw new Error(metadataData.error || 'Failed to fetch metadata');
  }

  const fileResponse = await fetch(`${API_BASE_URL}/api/media/${mediaId}`);

  if (!fileResponse.ok) {
    throw new Error(`Failed to fetch file: ${fileResponse.status}`);
  }

  const blob = await fileResponse.blob();
  const base64 = await blobToBase64(blob);

  console.log(`[Cinema Extension] Downloaded ${metadataData.metadata.name} (${formatBytes(metadataData.metadata.size)})`);

  await setCachedMedia(mediaId, metadataData.metadata, blob);

  return {
    data: base64,
    metadata: metadataData.metadata,
    isBase64: true
  };
}

function sendResponse(inscriptionId, result, error = null) {
  const response = {
    type: 'ORDINALS_CONTRACT_RESPONSE',
    inscriptionId: inscriptionId,
    result: result,
    error: error
  };

  document.dispatchEvent(new CustomEvent('CINEMA_FROM_EXTENSION', {
    detail: response
  }));

  console.log('[Cinema Extension] Response sent to bridge:', JSON.stringify(response).substring(0, 200));
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

setTimeout(() => {
  document.dispatchEvent(new CustomEvent('CINEMA_FROM_EXTENSION', {
    detail: {
      type: 'ORDINALS_BRIDGE_READY',
      timestamp: Date.now()
    }
  }));
  console.log('[Cinema Extension] Ready signal sent via bridge');
}, 200);

console.log('[Cinema Extension] Listening for cinema player messages via bridge...');

// Initialize chat (top frame only)
if (window === window.top) {
  console.log('[Cinema Chat] Initializing chat system in top frame...');

  (async () => {
    let retries = 0;
    while (!API_BASE_URL && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (API_BASE_URL) {
      chrome.runtime.sendMessage({
        type: 'CHAT_INIT',
        backendUrl: API_BASE_URL
      }, (response) => {
        if (response && response.success) {
          console.log('[Cinema Chat] Background WebSocket initialized');
        }
      });
    }
  })();
} else {
  console.log('[Cinema Chat] Skipping chat init - running in iframe');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Cinema Chat] Received from background:', message.type, 'in frame:', window === window.top ? 'top' : 'iframe');

  if (message.type.startsWith('CHAT_')) {
    document.dispatchEvent(new CustomEvent('ORDINALS_MESSAGE', {
      detail: message
    }));
  }

  sendResponse({ received: true });
  return true;
});

function joinChatRoom(roomId) {
  if (window !== window.top) {
    console.log('[Cinema Chat] Ignoring joinChatRoom - not in top frame');
    return;
  }

  console.log('[Cinema Chat] Sending joinChatRoom to background');

  try {
    chrome.runtime.sendMessage({
      type: 'CHAT_JOIN_ROOM',
      roomId: roomId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Cinema Chat] Failed to join room:', chrome.runtime.lastError.message);

        if (chrome.runtime.lastError.message.includes('Extension context')) {
          extensionInvalidated = true;
          alert('Extension was reloaded. Please refresh the page to continue.');
        }
      }
    });
  } catch (error) {
    console.error('[Cinema Chat] Error joining room:', error);
  }
}

function sendChatMessage(message) {
  if (window !== window.top) {
    console.log('[Cinema Chat] Ignoring sendChatMessage - not in top frame');
    return;
  }

  console.log('[Cinema Chat] Sending sendChatMessage to background');

  try {
    chrome.runtime.sendMessage({
      type: 'CHAT_SEND_MESSAGE',
      message: message
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Cinema Chat] Failed to send message:', chrome.runtime.lastError.message);

        if (chrome.runtime.lastError.message.includes('Extension context')) {
          extensionInvalidated = true;
          alert('Extension was reloaded. Please refresh the page to continue chatting.');
        }
      }
    });
  } catch (error) {
    console.error('[Cinema Chat] Error sending message:', error);
  }
}
