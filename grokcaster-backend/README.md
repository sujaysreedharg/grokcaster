# Grokcaster Backend (FastAPI)

Endpoints:
- `GET /health` – health check
- `GET /client-secret` – ephemeral token for Grok realtime voice (frontend connects directly)
- `POST /generate` – build outline + ad blurb, returns outline + data-URL TTS

Env (.env):
```
XAI_API_KEY=your_xai_api_key
X_API_BEARER_TOKEN=your_x_bearer_token
PORT=8001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
DEFAULT_HOST_VOICE=ara
SECONDARY_HOST_VOICE=rex
```

Run:
```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Flow:
1) (Optional) `GET /client-secret` for realtime voice.
2) `POST /generate` with `page_text`, optional `page_title`, `user_id` (X), `include_ad`.
3) Response includes outline + data URL mp3 (`tts_audio_url`).
```
{
  "outline": "ALEX: ...\nSAM: ...",
  "ad_blurb": "...",
  "tts_audio_url": "data:audio/mp3;base64,..."
}
```
