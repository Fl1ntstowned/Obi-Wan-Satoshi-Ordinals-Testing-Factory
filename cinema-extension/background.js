console.log('[Cinema Extension] Background service worker started');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Cinema Extension] Extension installed/updated', details.reason);

  if (details.reason === 'install') {
    console.log('[Cinema Extension] First time installation');
    chrome.storage.local.set({
      backendUrl: 'http://localhost:3000'
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Cinema Extension] Browser startup - service worker active');
});

// WebSocket proxy (bypasses page CSP restrictions)
importScripts('socket.io.min.js');

let userId = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
let username = `User${userId.slice(5, 9)}`;

let socket = null;
let backendUrl = null;
let currentRoom = null;

const tabRooms = new Map();

console.log('[Background] User ID:', userId, 'Username:', username);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === 'PING') {
    sendResponse({ success: true });
    return true;
  }

  console.log('[Background] Message:', message.type, 'from tab:', tabId);

  if (message.type === 'CHAT_INIT') {
    handleChatInit(message.backendUrl, tabId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CHAT_JOIN_ROOM') {
    handleJoinRoom(message.roomId, tabId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CHAT_SEND_MESSAGE') {
    handleSendMessage(message.message, tabId);
    sendResponse({ success: true });
    return true;
  }
});

function handleChatInit(url, tabId) {
  console.log('[Background] CHAT_INIT for tab:', tabId, 'URL:', url);

  if (url && url !== backendUrl) {
    console.log('[Background] Updating backend URL to:', url);
    backendUrl = url;

    if (socket && socket.connected) {
      console.log('[Background] Backend URL changed, reconnecting...');
      socket.disconnect();
      socket = null;
    }
  }

  tabRooms.set(tabId, null);

  if (!socket) {
    initializeWebSocket();
  } else if (socket.connected) {
    sendToTab(tabId, { type: 'CHAT_CONNECTED' });
  }
}

function handleJoinRoom(roomId, tabId) {
  console.log('[Background] CHAT_JOIN_ROOM:', roomId, 'for tab:', tabId);

  tabRooms.set(tabId, roomId);
  currentRoom = roomId;

  if (socket && socket.connected) {
    socket.emit('join_room', { roomId, userId, username });
    console.log('[Background] Emitted join_room for:', roomId);
  } else {
    console.warn('[Background] Socket not ready, will join on connect');
  }
}

function handleSendMessage(message, tabId) {
  const roomId = tabRooms.get(tabId);

  if (!socket || !socket.connected) {
    console.error('[Background] Cannot send - socket not connected');
    sendToTab(tabId, {
      type: 'CHAT_ERROR',
      error: 'Not connected to chat server'
    });
    return;
  }

  if (!roomId) {
    console.error('[Background] Cannot send - tab not in a room');
    return;
  }

  console.log('[Background] Sending message to room:', roomId);
  socket.emit('send_message', { roomId, message });
}

function initializeWebSocket() {
  if (!backendUrl) {
    console.error('[Background] No backend URL set');
    return;
  }

  if (socket) {
    console.log('[Background] Socket already exists');
    return;
  }

  console.log('[Background] Connecting to WebSocket:', backendUrl);

  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10
  });

  socket.on('connect', () => {
    console.log('[Background] ✓ WebSocket connected, Socket ID:', socket.id);
    broadcastToAllTabs({ type: 'CHAT_CONNECTED' });

    // Rejoin room if we were in one
    if (currentRoom) {
      console.log('[Background] Reconnected - rejoining room:', currentRoom);
      socket.emit('join_room', { roomId: currentRoom, userId, username });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Background] ✗ WebSocket disconnected, reason:', reason);
    broadcastToAllTabs({ type: 'CHAT_DISCONNECTED' });

    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      console.log('[Background] Permanent disconnect detected');
      socket = null;
      currentRoom = null;
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[Background] Connection error:', error.message);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Background] Reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    console.error('[Background] Reconnection failed after max attempts');
    socket = null;
    currentRoom = null;
    broadcastToAllTabs({ type: 'CHAT_DISCONNECTED' });
  });

  socket.on('new_message', (msg) => {
    console.log('[Background] New message from:', msg.username);
    broadcastToAllTabs({ type: 'CHAT_MESSAGE', ...msg });
  });

  socket.on('user_joined', (data) => {
    console.log('[Background] User joined:', data.username, 'Count:', data.userCount);
    broadcastToAllTabs({ type: 'CHAT_USER_COUNT', count: data.userCount });
  });

  socket.on('user_left', (data) => {
    console.log('[Background] User left:', data.username, 'Count:', data.userCount);
    broadcastToAllTabs({ type: 'CHAT_USER_COUNT', count: data.userCount });
  });

  socket.on('message_history', (messages) => {
    console.log('[Background] Message history received:', messages.length, 'messages');
    broadcastToAllTabs({ type: 'CHAT_HISTORY', messages });
  });
}

async function sendToTab(tabId, data) {
  try {
    await chrome.tabs.sendMessage(tabId, data);
  } catch (error) {
    console.log('[Background] Failed to send to tab', tabId, '- tab may be closed');
    tabRooms.delete(tabId);
  }
}

async function broadcastToAllTabs(data) {
  const tabIds = Array.from(tabRooms.keys());

  for (const tabId of tabIds) {
    await sendToTab(tabId, data);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabRooms.has(tabId)) {
    console.log('[Background] Tab', tabId, 'closed, removing from tracking');
    tabRooms.delete(tabId);

    if (tabRooms.size === 0) {
      console.log('[Background] No more active chat tabs');
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tabRooms.has(tabId)) {
    console.log('[Background] Tab', tabId, 'is reloading, clearing room state');
    tabRooms.delete(tabId);
  }
});

console.log('[Cinema Extension] Background service worker ready');
