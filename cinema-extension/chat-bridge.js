// ===== CHAT WEBSOCKET BRIDGE =====
// Runs in page context where Socket.io is accessible
// Bridges between inscription and WebSocket server

(function() {
  console.log('[Chat Bridge] Initializing in page context...');

  let socket = null;
  let currentRoom = null;

  // Generate user ID (handle sandboxed environments without localStorage)
  let userId;
  let username;

  try {
    userId = localStorage.getItem('cinema_user_id') || generateUserId();
    localStorage.setItem('cinema_user_id', userId);
    username = localStorage.getItem('cinema_username') || `User${userId.slice(5, 9)}`;
  } catch (error) {
    // Sandboxed environment - generate temporary IDs
    console.log('[Chat Bridge] localStorage blocked, using temporary ID');
    userId = generateUserId();
    username = `User${userId.slice(5, 9)}`;
  }

  function generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  // Wait for backend URL from content script
  let backendUrl = null;

  // Listen for backend URL from content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHAT_BACKEND_URL') {
      backendUrl = event.data.url;
      console.log('[Chat Bridge] Received backend URL:', backendUrl);
      initializeWebSocket();
    }
  });

  // Request backend URL
  window.postMessage({ type: 'CHAT_REQUEST_BACKEND_URL' }, '*');

  function initializeWebSocket() {
    if (!backendUrl) {
      console.error('[Chat Bridge] No backend URL');
      return;
    }

    if (!window.io) {
      console.error('[Chat Bridge] Socket.io not available');
      return;
    }

    console.log('[Chat Bridge] Connecting to:', backendUrl);

    socket = window.io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('[Chat Bridge] ✓ Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('[Chat Bridge] ✗ Disconnected');
    });

    socket.on('new_message', (msg) => {
      console.log('[Chat Bridge] New message:', msg);
      sendToInscription('CHAT_MESSAGE', msg);
    });

    socket.on('user_joined', (data) => {
      console.log('[Chat Bridge] User joined:', data);
      sendToInscription('CHAT_USER_COUNT', { count: data.userCount });
    });

    socket.on('user_left', (data) => {
      console.log('[Chat Bridge] User left:', data);
      sendToInscription('CHAT_USER_COUNT', { count: data.userCount });
    });

    socket.on('message_history', (messages) => {
      console.log('[Chat Bridge] Message history:', messages.length);
      sendToInscription('CHAT_HISTORY', { messages });
    });
  }

  function sendToInscription(type, data) {
    const event = new CustomEvent('ORDINALS_MESSAGE', {
      detail: { type, ...data }
    });
    document.dispatchEvent(event);
  }

  // Listen for chat commands from inscription
  document.addEventListener('ORDINALS_MESSAGE', (event) => {
    const data = event.detail;

    if (data.type === 'CHAT_JOIN_ROOM') {
      joinRoom(data.roomId);
    } else if (data.type === 'CHAT_SEND_MESSAGE') {
      sendMessage(data.message);
    }
  });

  function joinRoom(roomId) {
    if (!socket || !socket.connected) {
      console.warn('[Chat Bridge] Socket not connected, retrying in 1s...');
      setTimeout(() => joinRoom(roomId), 1000);
      return;
    }

    currentRoom = roomId;
    socket.emit('join_room', { roomId, userId, username });
    console.log('[Chat Bridge] Joined room:', roomId);
  }

  function sendMessage(message) {
    if (!socket || !currentRoom) {
      console.warn('[Chat Bridge] Cannot send message');
      return;
    }

    socket.emit('send_message', { roomId: currentRoom, message });
    console.log('[Chat Bridge] Message sent:', message);
  }

  console.log('[Chat Bridge] Ready');
})();
