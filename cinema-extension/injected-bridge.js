// Bridge script - Runs in PAGE context (same as cinema-player.html)
// Bridges between content script and page

(function() {
  if (window.__CINEMA_BRIDGE_ACTIVE__) {
    console.log('[Cinema Bridge] Already active, skipping duplicate initialization');
    return;
  }

  window.__CINEMA_BRIDGE_ACTIVE__ = true;
  console.log('[Cinema Bridge] Initializing in page context');

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ORDINALS_CONTRACT_CALL') {
      console.log('[Cinema Bridge] Intercepted call from page:', event.data.payload?.method);
      document.dispatchEvent(new CustomEvent('CINEMA_TO_EXTENSION', {
        detail: event.data
      }));
    }
  });

  function broadcastMessage(message) {
    window.postMessage(message, '*');

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(message, '*');
      } catch (e) {
        // Ignore cross-origin errors
      }
    }

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow.postMessage(message, '*');
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  }

  document.addEventListener('CINEMA_FROM_EXTENSION', (event) => {
    console.log('[Cinema Bridge] Received response from extension:', event.detail);

    const message = event.detail;
    const iframes = document.querySelectorAll('iframe');

    console.log('[Cinema Bridge] Broadcasting to all windows + parent + ' + iframes.length + ' iframes');

    broadcastMessage(message);

    console.log('[Cinema Bridge] Broadcast complete');
  });

  const observer = new MutationObserver(() => {
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
      setTimeout(() => {
        broadcastMessage({
          type: 'ORDINALS_BRIDGE_READY',
          timestamp: Date.now()
        });
      }, 100);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  console.log('[Cinema Bridge] Ready to bridge messages');
})();
