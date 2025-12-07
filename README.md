# Grokcaster

Turn any webpage into a podcast. Grokcaster is a Chrome extension that reads the page you're on and generates a two-host audio conversation about it, completely powered by xAI's Grok.

Live Youtube demo: https://www.youtube.com/watch?v=sRLpiC4mraE

## What it does

You're reading an article. You don't have time to finish it. Click the extension, hit generate, and Grokcaster creates a short podcast where two AI hosts (Alex and Sam) discuss the content in a natural back-and-forth conversation. Plug in your headphones and listen while you do something else.

The whole thing runs on Grok. Three different xAI APIs working together:

1. **Grok Chat** generates the script (who says what)
2. **Grok TTS** converts the script to audio with two distinct voices
3. **Grok Realtime** powers the live voice chat feature

No OpenAI. No ElevenLabs. No third-party AI. Just Grok.

## Features

- **Podcast generation** from any webpage content
- **Two distinct voices** (Ara and Rex) for realistic conversation
- **Snipping tool** to select specific parts of a page
- **Duration control** from 45 seconds to 10 minutes
- **Tone slider** from formal to completely unhinged
- **Live Talk** for real-time voice conversation with Grok about the page
- **X integration** to personalize content based on your Twitter/X interests

## X API Integration

When you enable "X Personalize" in the extension, Grokcaster fetches data from your Twitter/X account to customize the podcast:

**What we fetch:**
- Your bio/description
- Your recent liked tweets (up to 10)

**How it works:**
We call the Twitter API v2 endpoints:
- `GET https://api.twitter.com/2/users/me` for your profile
- `GET https://api.twitter.com/2/users/{id}/liked_tweets` for your likes

From your likes, we extract topics and themes you care about. If you've been liking tweets about AI, startups, or basketball, the podcast will naturally weave in those interests when relevant.

**Example:** You're reading an article about apartments in Austin. With X personalization enabled, the podcast might say:

> ALEX: This neighborhood looks perfect for someone in tech.
> SAM: Exactly, it's a 10 minute drive to the startup corridor.

Instead of generic commentary, you get content that connects to what you actually care about.

**Influence slider:** Controls how heavily your X interests affect the output. Set it to minimal for subtle references, or strong to make your interests a central part of the conversation.

## How it works

The extension extracts text from the current page, sends it to the backend, which constructs a prompt and hits the Grok Chat API. The response is a dialogue script formatted like:

```
ALEX: Did you see what this article is saying about...
SAM: Yeah, the interesting part is...
```

We parse this script, send each line to Grok TTS with the appropriate voice (Ara for Alex, Rex for Sam), concatenate the audio, and send it back to the browser as a base64 data URL. The whole process takes a few seconds.

Live Talk works differently. It opens a WebSocket to Grok's Realtime API, captures your microphone at 24kHz, streams PCM audio to Grok, and plays back the response in real time. You can have an actual conversation about what you're reading.

## Setup

### Backend

```bash
cd grokcaster-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```
XAI_API_KEY=your_xai_api_key
X_BEARER_TOKEN=your_twitter_bearer_token
```

Get your xAI API key at [x.ai](https://x.ai). For X personalization, you need a Twitter/X Bearer Token from the [Twitter Developer Portal](https://developer.twitter.com/).

Run the server:

```bash
uvicorn main:app --port 8001 --host 0.0.0.0
```

### Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `grokcaster-extension` folder

## Usage

1. Navigate to any webpage
2. Click the Grokcaster extension icon (or right-click and select "Generate Grokcaster")
3. Configure your preferences (duration, tone, mode)
4. Click "Generate Podcast"
5. Listen

For Live Talk, click the microphone button and start speaking. Grok will respond based on the page content.

## Project structure

```
grokcaster-backend/
  main.py              # FastAPI server
  services/
    grok_api.py        # Grok Chat and TTS integration
    context_builder.py # Prompt construction
    x_api.py           # Twitter/X integration

grokcaster-extension/
  manifest.json
  content/
    content.js         # Main extension UI and logic
  background/
    background.js      # Service worker
  popup/
    popup.html         # Extension popup
  assets/
    icons/             # Extension icons
```

## Tech stack

- Python 3.11+ with FastAPI
- Chrome Extension Manifest V3
- xAI Grok APIs (Chat, TTS, Realtime)
- Web Audio API for microphone capture and playback
- WebSocket for real-time communication

## API usage

This project uses three xAI endpoints:

- `POST https://api.x.ai/v1/chat/completions` (script generation)
- `POST https://api.x.ai/v1/audio/speech` (text to speech)
- `WSS wss://api.x.ai/v1/realtime` (live voice)

You need an xAI API key from [x.ai](https://x.ai).

## Why I built this

I wanted to consume web content without staring at a screen. Podcasts are great for that, but nobody is making podcasts about the random articles I find interesting. So I built something that does.

The two-voice format matters. A single narrator reading text is boring. Two people having a conversation is engaging. That's why Grokcaster generates dialogue, not monologue.

## License

MIT

