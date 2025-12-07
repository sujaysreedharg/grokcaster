import os
import asyncio
import json
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

import httpx
import websockets
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.context_builder import build_outline_prompt
from services.grok_api import grok_chat_outline, grok_tts

XAI_API_KEY = os.getenv("XAI_API_KEY")
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN", "AAAAAAAAAAAAAAAAAAAAANhz5wEAAAAA8K65P2BDo3Bt5Fb49upEEc%2Bny3Q%3D6oCwJDnr5r0gQZkbXNbigoy4z0t58WvKg48QprSvffgjhgZuiu")
PORT = int(os.getenv("PORT", "8001"))

if not XAI_API_KEY:
    raise RuntimeError("XAI_API_KEY required")

app = FastAPI(title="Grokcaster")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    page_text: str
    page_title: Optional[str] = None
    duration: str = "1min"
    tone: str = "balanced"
    mode: str = "podcast"
    x_enabled: bool = False
    x_user_data: Optional[Dict[str, Any]] = None
    x_influence: str = "medium"


class GenerateResponse(BaseModel):
    script: str
    audio_url: Optional[str] = None
    x_interests: Optional[List[str]] = None


@app.get("/")
async def root():
    return {"service": "Grokcaster", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/x-user-data")
async def get_x_user_data():
    """Fetch user data from X API."""
    try:
        headers = {"Authorization": f"Bearer {X_BEARER_TOKEN}"}
        
        # Get authenticated user
        async with httpx.AsyncClient(timeout=15) as client:
            # Get user info
            user_resp = await client.get(
                "https://api.twitter.com/2/users/me",
                headers=headers,
                params={"user.fields": "description,public_metrics"}
            )
            
            if user_resp.status_code != 200:
                return {"error": "Could not fetch user", "interests": ["technology", "AI", "startups"]}
            
            user_data = user_resp.json().get("data", {})
            user_id = user_data.get("id")
            bio = user_data.get("description", "")
            
            # Get recent likes for interests
            likes_resp = await client.get(
                f"https://api.twitter.com/2/users/{user_id}/liked_tweets",
                headers=headers,
                params={"max_results": 10, "tweet.fields": "text"}
            )
            
            interests = []
            if likes_resp.status_code == 200:
                tweets = likes_resp.json().get("data", [])
                for tweet in tweets[:5]:
                    text = tweet.get("text", "")[:50]
                    if text:
                        interests.append(text)
            
            return {
                "bio": bio,
                "interests": interests if interests else ["technology", "news", "trends"]
            }
            
    except Exception as e:
        print(f"X API error: {e}")
        # Return mock data on error
        return {
            "bio": "Tech enthusiast",
            "interests": ["AI", "technology", "startups", "design", "innovation"]
        }


@app.get("/live-token")
async def get_live_token():
    """Get ephemeral token for xAI realtime WebSocket."""
    try:
        url = "https://api.x.ai/v1/realtime/client_secrets"
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url, 
                headers=headers, 
                json={"expires_after": {"seconds": 300}}
            )
        
        if resp.status_code != 200:
            print(f"Realtime token error: {resp.text}")
            raise HTTPException(500, "Could not get realtime token")
        
        data = resp.json()
        return {
            "client_secret": data.get("value"),
            "expires_at": data.get("expires_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Live token error: {e}")
        raise HTTPException(500, str(e))


@app.websocket("/live-ws")
async def live_websocket_proxy(ws: WebSocket):
    """Proxy WebSocket to xAI realtime API."""
    await ws.accept()
    print("Client connected to /live-ws")
    
    xai_ws = None
    
    try:
        # Get ephemeral token
        print("Getting xAI token...")
        url = "https://api.x.ai/v1/realtime/client_secrets"
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=headers, json={"expires_after": {"seconds": 300}})
        
        if resp.status_code != 200:
            print(f"Token error: {resp.text}")
            await ws.send_json({"type": "error", "error": {"message": "Could not get token"}})
            return
        
        token = resp.json().get("value")
        print(f"Got token: {token[:30]}...")
        
        # Connect to xAI
        print("Connecting to xAI realtime...")
        xai_url = "wss://api.x.ai/v1/realtime"
        auth_headers = [("Authorization", f"Bearer {token}")]
        
        xai_ws = await websockets.connect(xai_url, additional_headers=auth_headers, ping_interval=20)
        print("Connected to xAI!")
        
        # Notify client we're connected
        await ws.send_json({"type": "proxy.connected"})
        
        # Create tasks for bidirectional forwarding
        stop_event = asyncio.Event()
        
        async def forward_to_xai():
            try:
                while not stop_event.is_set():
                    try:
                        data = await asyncio.wait_for(ws.receive_text(), timeout=1.0)
                        await xai_ws.send(data)
                    except asyncio.TimeoutError:
                        continue
                    except WebSocketDisconnect:
                        print("Client disconnected")
                        stop_event.set()
                        break
            except Exception as e:
                print(f"Forward to xAI error: {e}")
                stop_event.set()
        
        async def forward_to_client():
            try:
                async for msg in xai_ws:
                    if stop_event.is_set():
                        break
                    await ws.send_text(msg)
            except websockets.exceptions.ConnectionClosed as e:
                print(f"xAI closed: {e}")
            except Exception as e:
                print(f"Forward to client error: {e}")
            stop_event.set()
        
        # Run both directions concurrently
        tasks = [
            asyncio.create_task(forward_to_xai()),
            asyncio.create_task(forward_to_client()),
        ]
        
        # Wait for either to complete
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            
    except WebSocketDisconnect:
        print("Client disconnected during setup")
    except Exception as e:
        print(f"Live WS error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await ws.send_json({"type": "error", "error": {"message": str(e)}})
        except:
            pass
    finally:
        if xai_ws:
            try:
                await xai_ws.close()
            except:
                pass
        try:
            await ws.close()
        except:
            pass
        print("Live WS session ended")


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    print(f"📝 Generate: duration={req.duration}, tone={req.tone}, mode={req.mode}")
    
    # Get X user data if enabled
    user_signals = {}
    x_interests = None
    
    if req.x_enabled:
        if req.x_user_data:
            user_signals = req.x_user_data
            x_interests = req.x_user_data.get("interests", [])
        else:
            # Fetch from X API
            try:
                x_data = await get_x_user_data()
                user_signals = x_data
                x_interests = x_data.get("interests", [])
            except:
                pass
    
    prompt, is_unhinged = build_outline_prompt(
        page_text=req.page_text,
        page_title=req.page_title,
        user_signals=user_signals,
        tone=req.tone,
        target_duration=req.duration,
        mode=req.mode,
        x_influence=req.x_influence if req.x_enabled else "minimal",
    )
    
    print(f"🤖 Generating script (unhinged={is_unhinged})...")
    script = await grok_chat_outline(prompt, is_unhinged=is_unhinged)
    print(f"✅ Script: {len(script.split())} words")
    
    audio_url = None
    try:
        print("🔊 Generating audio...")
        audio_url = await grok_tts(script)
        if audio_url:
            print(f"✅ Audio: {len(audio_url)//1000}KB")
    except Exception as e:
        print(f"⚠️ TTS error: {e}")
    
    return GenerateResponse(script=script, audio_url=audio_url, x_interests=x_interests)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
