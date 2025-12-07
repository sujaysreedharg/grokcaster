# Grokcaster - Technical Architecture

## Overview

Grokcaster is a Chrome extension that transforms any webpage into an AI-generated podcast using xAI's Grok APIs. It features podcast generation, live voice conversations, and X (Twitter) personalization.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     CHROME EXTENSION                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │   Popup      │  │  Background  │  │     Content Script       │   │    │
│  │  │  (popup.js)  │  │ (background) │  │    (content.js)          │   │    │
│  │  │              │  │              │  │                          │   │    │
│  │  │ • Open Panel │  │ • Context    │  │ • Shadow DOM UI          │   │    │
│  │  │ • Stars anim │  │   Menu       │  │ • Podcast controls       │   │    │
│  │  └──────┬───────┘  │ • Messages   │  │ • Live Talk WebSocket    │   │    │
│  │         │          └──────┬───────┘  │ • Audio capture/playback │   │    │
│  │         │                 │          │ • Snipping tool          │   │    │
│  │         └─────────────────┼──────────┤                          │   │    │
│  │                           │          └────────────┬─────────────┘   │    │
│  └───────────────────────────┼───────────────────────┼─────────────────┘    │
│                              │                       │                       │
└──────────────────────────────┼───────────────────────┼───────────────────────┘
                               │                       │
                    Message    │          HTTP/WebSocket
                    Passing    │                       │
                               ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PYTHON BACKEND (FastAPI)                              │
│                              localhost:8001                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                            ENDPOINTS                                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │ GET /       │  │ GET /health │  │ POST        │  │ WS /live-ws     │ │ │
│  │  │             │  │             │  │ /generate   │  │                 │ │ │
│  │  │ Status page │  │ Health check│  │             │  │ WebSocket proxy │ │ │
│  │  └─────────────┘  └─────────────┘  │ • Script    │  │ to xAI realtime │ │ │
│  │                                    │   generation│  │                 │ │ │
│  │  ┌─────────────┐  ┌─────────────┐  │ • TTS audio │  │ • Auth handling │ │ │
│  │  │ GET         │  │ GET         │  │ • X persona │  │ • Bidirectional │ │ │
│  │  │ /x-user-data│  │ /live-token │  └─────────────┘  │   forwarding    │ │ │
│  │  │             │  │             │                   └─────────────────┘ │ │
│  │  │ X API fetch │  │ Ephemeral   │                                       │ │
│  │  │ user data   │  │ token gen   │                                       │ │
│  │  └─────────────┘  └─────────────┘                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           SERVICES                                       │ │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────────────┐   │ │
│  │  │    context_builder.py   │  │           grok_api.py               │   │ │
│  │  │                         │  │                                     │   │ │
│  │  │ • Build prompts         │  │ • grok_chat_outline() - Script gen │   │ │
│  │  │ • Duration configs      │  │ • grok_tts() - Edge TTS audio      │   │ │
│  │  │ • Mode handling         │  │ • Parse script by speaker          │   │ │
│  │  │ • X interests injection │  │ • Two voices: Jenny & Guy          │   │ │
│  │  └─────────────────────────┘  └─────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                               │                       │
                               │                       │
                               ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL APIs                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │    xAI Grok API     │  │   xAI Realtime API  │  │   X (Twitter) API   │   │
│  │                     │  │                     │  │                     │   │
│  │ api.x.ai/v1/chat/   │  │ wss://api.x.ai/v1/  │  │ api.twitter.com/2/  │   │
│  │ completions         │  │ realtime            │  │                     │   │
│  │                     │  │                     │  │ • User data         │   │
│  │ • Script generation │  │ • Voice WebSocket   │  │ • Liked tweets      │   │
│  │ • grok-3-mini-fast  │  │ • PCM16 audio       │  │ • Interests         │   │
│  └─────────────────────┘  │ • Server VAD        │  └─────────────────────┘   │
│                           └─────────────────────┘                             │
│  ┌─────────────────────┐                                                      │
│  │   xAI Grok TTS      │  ✅ NOW WORKING!                                     │
│  │                     │                                                      │
│  │ • Ara (Female/Alex) │  POST /v1/audio/speech                              │
│  │ • Rex (Male/Sam)    │  {input: "text", voice: "Ara", response_format: mp3}│
│  │ • Native Grok voice │                                                      │
│  └─────────────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Podcast Generation Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐
│  User   │    │   Content   │    │   Backend   │    │  Grok API   │    │Edge TTS │
│ Browser │    │   Script    │    │   FastAPI   │    │             │    │         │
└────┬────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └────┬────┘
     │                │                   │                  │                │
     │ 1. Click       │                   │                  │                │
     │ "Generate"     │                   │                  │                │
     │───────────────>│                   │                  │                │
     │                │                   │                  │                │
     │                │ 2. POST /generate │                  │                │
     │                │ {page_text,       │                  │                │
     │                │  duration, tone,  │                  │                │
     │                │  mode, x_enabled} │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │                  │                │
     │                │                   │ 3. Build prompt  │                │
     │                │                   │ with context     │                │
     │                │                   │─────────────────>│                │
     │                │                   │                  │                │
     │                │                   │ 4. Return script │                │
     │                │                   │ ALEX: ... SAM:.. │                │
     │                │                   │<─────────────────│                │
     │                │                   │                  │                │
     │                │                   │ 5. Generate TTS  │                │
     │                │                   │ for each speaker │                │
     │                │                   │─────────────────────────────────>│
     │                │                   │                  │                │
     │                │                   │ 6. Return MP3    │                │
     │                │                   │ audio bytes      │                │
     │                │                   │<─────────────────────────────────│
     │                │                   │                  │                │
     │                │ 7. Return {script,│                  │                │
     │                │ audio_url: base64}│                  │                │
     │                │<──────────────────│                  │                │
     │                │                   │                  │                │
     │ 8. Auto-play   │                   │                  │                │
     │ audio          │                   │                  │                │
     │<───────────────│                   │                  │                │
     │                │                   │                  │                │
```

### 2. Live Talk Flow (WebSocket)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
│  User   │    │   Content   │    │   Backend   │    │   xAI Realtime API  │
│ Browser │    │   Script    │    │  WebSocket  │    │  wss://api.x.ai     │
└────┬────┘    └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘
     │                │                   │                      │
     │ 1. Click       │                   │                      │
     │ "Live Talk"    │                   │                      │
     │───────────────>│                   │                      │
     │                │                   │                      │
     │                │ 2. Connect        │                      │
     │                │ ws://localhost    │                      │
     │                │ :8001/live-ws     │                      │
     │                │──────────────────>│                      │
     │                │                   │                      │
     │                │                   │ 3. Get ephemeral     │
     │                │                   │ token from           │
     │                │                   │ /client_secrets      │
     │                │                   │─────────────────────>│
     │                │                   │                      │
     │                │                   │ 4. Token returned    │
     │                │                   │<─────────────────────│
     │                │                   │                      │
     │                │                   │ 5. Connect to xAI    │
     │                │                   │ with Bearer token    │
     │                │                   │─────────────────────>│
     │                │                   │                      │
     │                │ 6. proxy.connected│                      │
     │                │<──────────────────│                      │
     │                │                   │                      │
     │                │ 7. session.update │                      │
     │                │ {voice, format,   │                      │
     │                │  instructions}    │                      │
     │                │──────────────────>│─────────────────────>│
     │                │                   │                      │
     │                │ 8. session.updated│                      │
     │                │<──────────────────│<─────────────────────│
     │                │                   │                      │
     │ 9. User speaks │                   │                      │
     │ into mic       │                   │                      │
     │───────────────>│                   │                      │
     │                │                   │                      │
     │                │ 10. input_audio   │                      │
     │                │ _buffer.append    │                      │
     │                │ {audio: base64}   │                      │
     │                │──────────────────>│─────────────────────>│
     │                │                   │                      │
     │                │                   │ 11. Server VAD       │
     │                │                   │ detects speech       │
     │                │                   │                      │
     │                │ 12. speech_started│                      │
     │                │<──────────────────│<─────────────────────│
     │                │                   │                      │
     │                │ 13. speech_stopped│                      │
     │                │<──────────────────│<─────────────────────│
     │                │                   │                      │
     │                │ 14. response.     │                      │
     │                │ output_audio.delta│                      │
     │                │ {delta: base64}   │                      │
     │                │<──────────────────│<─────────────────────│
     │                │                   │                      │
     │ 15. Playback   │                   │                      │
     │ Grok's voice   │                   │                      │
     │<───────────────│                   │                      │
     │                │                   │                      │
```

---

## Component Details

### Chrome Extension Structure

```
grokcaster-extension/
├── manifest.json          # Extension config (Manifest V3)
├── assets/
│   ├── grok-logo.jpeg     # Logo image
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── background/
│   └── background.js      # Service worker (context menu, messages)
├── content/
│   └── content.js         # Main UI (Shadow DOM injection)
└── popup/
    ├── popup.html         # Extension popup
    └── popup.js           # Popup logic
```

### Backend Structure

```
grokcaster-backend/
├── main.py                # FastAPI app, endpoints
├── services/
│   ├── context_builder.py # Prompt construction
│   └── grok_api.py        # xAI API integration, TTS
├── .env                   # API keys (XAI_API_KEY, X_BEARER_TOKEN)
├── requirements.txt       # Python dependencies
└── venv/                  # Virtual environment
```

---

## API Endpoints

### Backend REST API

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/` | GET | Status | - | `{service, status}` |
| `/health` | GET | Health check | - | `{status: "ok"}` |
| `/generate` | POST | Generate podcast | `{page_text, page_title, duration, tone, mode, x_enabled}` | `{script, audio_url, x_interests}` |
| `/x-user-data` | GET | Fetch X user interests | - | `{bio, interests[]}` |
| `/live-token` | GET | Get ephemeral token | - | `{client_secret, expires_at}` |
| `/live-ws` | WebSocket | Proxy to xAI realtime | Bidirectional JSON | Bidirectional JSON |

### xAI APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Chat Completions | `POST /v1/chat/completions` | Script generation |
| Realtime Secrets | `POST /v1/realtime/client_secrets` | Ephemeral tokens |
| Realtime WebSocket | `wss://api.x.ai/v1/realtime` | Live voice chat |

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  Chrome Extension (Manifest V3)                                  │
│  ├─ Vanilla JavaScript (ES6+)                                   │
│  ├─ Shadow DOM (CSS isolation)                                  │
│  ├─ Web Audio API (mic capture, playback)                       │
│  └─ WebSocket API (live talk)                                   │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  Python 3.9+                                                     │
│  ├─ FastAPI (REST + WebSocket)                                  │
│  ├─ httpx (async HTTP client)                                   │
│  ├─ websockets (xAI proxy)                                      │
│  ├─ edge-tts (Microsoft Azure TTS)                              │
│  ├─ python-dotenv (env management)                              │
│  └─ uvicorn (ASGI server)                                       │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  xAI APIs                                                        │
│  ├─ Grok Chat API (grok-4-1-fast-non-reasoning)                 │
│  └─ Grok Realtime Voice API (WebSocket)                         │
│                                                                  │
│  Microsoft Edge TTS (via edge-tts library)                       │
│  ├─ en-US-JennyNeural (Alex - female)                           │
│  └─ en-US-GuyNeural (Sam - male)                                │
│                                                                  │
│  X (Twitter) API v2                                              │
│  └─ User data, liked tweets for personalization                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Audio Processing

### Podcast Generation (TTS)

```
Script Text                    Edge TTS                    Audio Output
┌──────────────┐              ┌──────────────┐            ┌──────────────┐
│ ALEX: Hello  │   Parse by   │ JennyNeural  │  Concat    │              │
│ SAM: Hi!     │──speaker────>│ GuyNeural    │───────────>│ data:audio/  │
│ ALEX: How... │              │              │            │ mpeg;base64  │
└──────────────┘              └──────────────┘            └──────────────┘
```

### Live Talk (Realtime)

```
Microphone Input                    xAI Realtime                    Speaker Output
┌──────────────┐                   ┌──────────────┐                ┌──────────────┐
│ getUserMedia │   PCM16 24kHz    │  Server VAD  │   PCM16 24kHz  │ AudioContext │
│ ScriptProc   │───────────────-->│  Grok Voice  │───────────────>│ BufferSource │
│ Float32→Int16│   base64 JSON    │  sage voice  │   base64 JSON  │ Int16→Float32│
└──────────────┘                   └──────────────┘                └──────────────┘
```

---

## Configuration

### Duration Configs

| Duration | Target Words | Lines (Alex+Sam) |
|----------|-------------|------------------|
| 30sec | 60 | 4 |
| 45sec | 90 | 6 |
| 1min | 140 | 8 |
| 2min | 280 | 14 |
| 3min | 420 | 20 |
| 5min | 700 | 32 |
| 7min | 1000 | 44 |
| 10min | 1400 | 60 |

### Tone Modes

| Tone | Description | Temperature |
|------|-------------|-------------|
| Formal | Professional, structured | 0.6 |
| Professional | Business appropriate | 0.7 |
| Balanced | Natural conversation | 0.8 |
| Casual | Friendly, relaxed | 0.9 |
| Unhinged | Chaotic, meme-filled, ALL CAPS | 1.2 |

---

## Security Considerations

1. **API Keys**: Stored in `.env` file, never exposed to frontend
2. **WebSocket Proxy**: Backend handles xAI auth, frontend never sees tokens
3. **CORS**: Enabled for localhost development
4. **Shadow DOM**: CSS isolation prevents style conflicts
5. **Content Security Policy**: No inline scripts in popup

---

## Running the Project

### Backend

```bash
cd grokcaster-backend
source venv/bin/activate
uvicorn main:app --port 8001 --host 0.0.0.0
```

### Extension

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `grokcaster-extension` folder

---

## Future Improvements

- [x] ~~Switch to xAI TTS~~ ✅ DONE - Using Ara (female) and Rex (male) voices
- [ ] Replace ScriptProcessorNode with AudioWorklet (deprecated warning)
- [ ] Real X API OAuth flow (currently uses Bearer token)
- [ ] Contextual ad injection based on interests
- [ ] Podcast download/share functionality
- [ ] Multi-language support
- [ ] Transcript display option
- [ ] Caching for repeated content

---

*Generated for Grokcaster v0.1.0*

