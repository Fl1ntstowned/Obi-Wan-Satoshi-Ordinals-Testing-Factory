# 🔗 Ordinals Smart Extensions

> Bringing Smart Contract-Like Functionality to Bitcoin Ordinals

[![Status](https://img.shields.io/badge/status-alpha-orange)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

Transform immutable Bitcoin Ordinals inscriptions into dynamic, interactive experiences with real-time data, multi-user sync, and external connectivity.

---

## 🎯 What Is This?

**Ordinals Smart Extensions** allows Bitcoin Ordinals inscriptions to break out of the sandbox and interact with external services, all while keeping the core inscription decentralized and immutable on Bitcoin.

**Current Implementation:** Cinema Player (community shared media library with live chat)
**Future Vision:** Interactive art, games, social features, live data feeds, and more

---

## 🚀 Quick Start for Testers

**Want to try it?** → See **[INSTALLATION GUIDE](./cinema-extension/README.md)**

```bash
git clone https://github.com/Fl1ntstowned/Ordinals--Testing-facility-Obi-Wan-Satoshi.git
cd Ordinals--Testing-facility-Obi-Wan-Satoshi
```

1. Load `cinema-extension` in Chrome
2. Upload a video via extension icon
3. Open test inscription or `inscription/cinema-player.html`
4. Watch your video! 🎬

**Test Inscription URL:**
```
https://ordinals.com/inscription/ae65be2498d3541f9c4c97565a474286c05cf816780e3591f13d02861d525d1bi0
```

### 🎥 Live Demo

![Cinema Player in Action](Screenshot%202025-10-28%20202316.png)

*The Cinema Player running live with synchronized video playback and real-time chat*

---

## 📊 System Architecture

![System Architecture](Screenshot%202025-10-28%20200853.png)

### Three-Layer Design

**Layer 1: Bitcoin Blockchain (Inscription Layer)**
- Small HTML file (~10KB) permanently inscribed on Bitcoin
- Immutable & decentralized
- References extension ID for dynamic content
- Cost: ~$5 to inscribe

**Layer 2: Browser Extension (Bridge Layer)**
- Installed by user, runs locally
- Content script + bridge intercepts messages
- Routes requests to backend
- Manages permissions & caching

**Layer 3: Backend Server (Data Layer)**
- Stores media files (videos, images)
- Manages shared state across users
- Real-time updates via WebSocket
- SQLite/PostgreSQL database

**Communication Flow:**
```
Bitcoin Inscription → postMessage API → Extension → HTTP/API → Backend
                                          ↓                       ↓
                                     Returns data ← JSON ← Database
```

---

## 💡 The Problem & Solution

### Problem
Bitcoin Ordinals are sandboxed and expensive:
- ❌ Cannot fetch external data
- ❌ Cannot interact between users
- ❌ Expensive to inscribe large files ($5,000 for 50MB video)
- ❌ Immutable - can't update after inscription

### Solution
Three-layer architecture that keeps inscriptions on Bitcoin while adding optional functionality:

```
Bitcoin (Inscription)  →  Browser Extension  →  Backend Server
    ~10KB HTML              Bridges requests        Stores data
   Decentralized               Local               Centralized
```

**Result:** 1000x cost savings + dynamic features + real-time updates + multi-user interaction

---

## 🎬 Current Use Case: Cinema Player

### What It Does
- **Tiny inscription** (~10KB HTML on Bitcoin)
- **Large media** stored on backend (videos up to 500MB+)
- **Upload once** → Everyone with extension sees it
- **Live chat** → Real-time messaging with other viewers
- **Real-time sync** → New content appears automatically
- **Smart caching** → IndexedDB caching prevents re-downloads

### How It Works
1. User visits cinema player inscription on ordinals.com
2. Inscription calls extension via `postMessage`
3. Extension fetches media from backend API
4. Extension returns data to inscription
5. Video plays synchronized for all viewers
6. Chat updates in real-time via WebSocket

### Features
- 📺 Shared playlist (videos & images)
- 💬 Live chat with user count
- ⚡ Auto-advance on video end
- 🎮 Keyboard shortcuts (←/→/F)
- 📱 Responsive design (all screen sizes)
- 🔄 IndexedDB caching (bandwidth savings)

---

## 🌟 Future Applications

![Future Applications](Screenshot%202025-10-28%20200905.png)

This technology unlocks entirely new Ordinals use cases:

### 🎨 Interactive Art
- Live prices, provenance, dynamic displays
- Market data integration
- Collector activity feeds
- Time-based transformations

### 🎮 Gaming
- PvP battles, leaderboards, achievements
- Turn-based multiplayer games
- Real-time scoreboards
- Persistent game state

### 💬 Social
- Community sync, chat, live auctions
- Social profiles and feeds
- Voting and governance
- Event coordination

### 📊 Data Feeds
- Oracles, market data, analytics
- Portfolio dashboards
- Price tickers and alerts
- Blockchain data visualization

**The extension bridge pattern allows any inscription to access dynamic data while remaining immutable on Bitcoin.**

---

## 📁 Project Structure

```
Ordinals--Testing-facility-Obi-Wan-Satoshi/
├── cinema-extension/          # Browser extension (MAIN)
│   ├── manifest.json         # Extension configuration
│   ├── content.js            # Content script (bridge layer)
│   ├── injected-bridge.js    # Page-context message bridge
│   ├── background.js         # Service worker (WebSocket)
│   ├── popup.html/js         # Upload interface
│   ├── chat-bridge.js        # Chat message router
│   └── README.md             # Installation guide
│
├── inscription/              # Inscription HTML
│   └── cinema-player.html   # Cinema player (~10KB, inscribe this)
│
├── backend/                  # Node.js backend
│   ├── server.js            # Express + Socket.io server
│   ├── storage.js           # Media storage logic
│   ├── clear-media.js       # Cleanup utility
│   └── nixpacks.toml        # Railway deployment config
│
├── docs/                     # Documentation
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── RAILWAY_DEPLOYMENT.md
│   ├── TESTING_GUIDE.md
│   └── IMPLEMENTATION_PLAN.md
│
├── Screenshot *.png          # Architecture diagrams
└── README.md                # This file
```

---

## 🛠️ Installation & Setup

### For Testers

**See the complete guide:** [cinema-extension/README.md](./cinema-extension/README.md)

**Quick Steps:**
1. Download/clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → Select `cinema-extension` folder
5. Click extension icon to upload media
6. Visit test inscription or open `inscription/cinema-player.html`

---

### For Developers

**Backend Setup:**
```bash
cd backend
yarn install
yarn dev
# Server runs at http://localhost:3000
```

**Extension Setup:**
1. Open Chrome → `chrome://extensions/`
2. Enable Developer Mode
3. Load unpacked → Select `cinema-extension/` folder
4. Extension installed ✅

**Production Deployment:**
See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for Railway hosting guide.

---

## ✨ Key Benefits

| Feature | Traditional Ordinals | With Smart Extension |
|---------|---------------------|---------------------|
| **Cost** | $5,000 for 50MB video | ~$5 for 10KB HTML |
| **Dynamic** | ❌ Immutable only | ✅ Live updates |
| **External Data** | ❌ Sandboxed | ✅ API access |
| **Multi-User** | ❌ No interaction | ✅ Real-time sync |
| **Chat/Social** | ❌ Not possible | ✅ WebSocket chat |
| **Decentralized** | ✅ Fully | ⚠️ Hybrid (optional) |

---

## 🔧 Technical Details

### Message Protocol

**Request from Inscription:**
```javascript
window.postMessage({
  type: 'ORDINALS_CONTRACT_CALL',
  payload: {
    inscriptionId: 'cinema-player',
    method: 'listMedia',
    params: {}
  }
}, '*');
```

**Response from Extension:**
```javascript
{
  type: 'ORDINALS_CONTRACT_RESPONSE',
  inscriptionId: 'cinema-player',
  result: { media: [...] },
  error: null
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/stats` | GET | Library statistics |
| `/api/media` | GET | List all media |
| `/api/media/:id` | GET | Download media file |
| `/api/media/:id/metadata` | GET | Get metadata only |
| `/api/media/upload` | POST | Upload new media |

### Extension Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `listMedia` | - | `{ media: Array }` | Get all media files |
| `getMedia` | `{ mediaId }` | `{ data, metadata }` | Download specific file |
| `joinChatRoom` | `{ roomId }` | - | Join chat room |
| `sendChatMessage` | `{ message }` | - | Send chat message |

---

## 🗺️ Roadmap

- ✅ **Phase 1:** Cinema player proof of concept
- ✅ **Phase 1:** Multi-user sharing + live chat
- ✅ **Phase 1:** IndexedDB caching for bandwidth savings
- 🔄 **Phase 1:** Community testing (current)
- 🔜 **Phase 2:** Production deployment (Railway)
- 🔜 **Phase 2:** Authentication & content moderation
- 🔜 **Phase 3:** Template library (art, games, social)
- 🔜 **Phase 4:** IPFS/Arweave decentralized storage

---

## 🤔 FAQ

**Q: Does this change my inscription on Bitcoin?**
A: No. Your inscription remains exactly as inscribed. Extensions add functionality *around* it.

**Q: What if the backend goes down?**
A: Your inscription still loads and displays. Enhanced features return when backend is restored.

**Q: Do all users need the extension?**
A: No. Extensions are optional. Users without it see the basic inscription.

**Q: Is this secure?**
A: Extensions are open-source and use browser security sandboxing. Users choose which to trust.

**Q: Can this be decentralized?**
A: Yes! Future versions can use IPFS, Arweave, or P2P systems instead of centralized backend.

**Q: What browsers are supported?**
A: Chrome, Edge, Brave, and all Chromium-based browsers. Firefox/Safari coming soon.

---

## 📝 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | Project overview | Everyone |
| [cinema-extension/README.md](./cinema-extension/README.md) | **Installation guide** | **Testers** |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Testing instructions | Testers |
| [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) | Deployment guide | Developers |
| [backend/README.md](./backend/README.md) | Backend setup | Developers |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Technical details | Developers |

---

## 🤝 Contributing

We welcome contributions! Areas where you can help:

- 🐛 **Testing:** Install, test, and report bugs
- 📖 **Documentation:** Improve guides and explanations
- 🎨 **Templates:** Create new use case templates
- 🔧 **Code:** Backend features, extension improvements
- 💡 **Ideas:** Suggest new use cases and features
- 🌐 **Localization:** Translate to other languages

**Getting Started:**
1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 🔐 Security & Privacy

- **Extension runs locally** - No data sent to third parties
- **Media cached in browser** - IndexedDB storage (user-controlled)
- **No authentication required** - Public library by default
- **CORS protection** - Backend validates origins
- **Rate limiting** - Prevents spam uploads
- **File type validation** - Only videos/images allowed
- **Open source** - All code is auditable

**Adding authentication:** See backend documentation for API key implementation.

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

---

## 🌟 Vision

> We believe Bitcoin Ordinals can be both **permanent AND dynamic**, **decentralized AND interactive**, **immutable AND evolving**.

This project bridges Bitcoin's permanence with modern web functionality, giving creators and collectors the best of both worlds.

**The inscription stays on Bitcoin forever. The extension adds the magic.**

---

## 📞 Contact & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/Fl1ntstowned/Ordinals--Testing-facility-Obi-Wan-Satoshi/issues)
- **Repository:** [View source code](https://github.com/Fl1ntstowned/Ordinals--Testing-facility-Obi-Wan-Satoshi)
- **Test Inscription:** [Cinema Player Demo](https://ordinals.com/inscription/ae65be2498d3541f9c4c97565a474286c05cf816780e3591f13d02861d525d1bi0)

---

## 🙏 Acknowledgments

Built on the shoulders of:
- Bitcoin and Ordinals Protocol creators
- Open-source community
- Early testers and contributors
- Railway.app for hosting support

---

**Status:** Alpha Testing
**Version:** 1.0.0
**Last Updated:** October 2025

---

**Made with ⚡ for the Ordinals community**

*Upload once. Share forever. Watch together.* 🎬
