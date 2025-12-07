import os
import base64
import httpx
from typing import Optional

XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_BASE_URL = os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
CHAT_URL = f"{XAI_BASE_URL}/chat/completions"
TTS_URL = f"{XAI_BASE_URL}/audio/speech"

# xAI TTS voices
VOICE_ALEX = "Ara"   # Female (Alex)
VOICE_SAM = "Rex"    # Male (Sam)


async def grok_chat_outline(prompt: str, is_unhinged: bool = False) -> str:
    """Generate podcast script using Grok."""
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    if is_unhinged:
        system_msg = """You write UNHINGED podcast scripts. Alex and Sam have ZERO filter.

MANDATORY in EVERY response:
- Use ALL CAPS at least 3 times for EMPHASIS
- Include *sound effects* like *explosion* *chef's kiss* *record scratch*
- Make ABSURD comparisons ("like if a raccoon designed a nightclub")
- Fake statistics ("studies show 420% of tenants become nocturnal")
- Meme speak: "no cap" "it's giving" "lowkey" "deadass" "main character energy"
- Hosts ROAST each other or get competitive
- Wild tangents then "ANYWAY back to—"
- Break fourth wall "hey listener you still with us?"

BE CHAOTIC. BE FUNNY. Still cover the topic."""
        temp = 1.2
    else:
        system_msg = """You write concise podcast scripts for two hosts:
- Alex (female, curious, asks questions)
- Sam (male, knowledgeable, explains)
Keep lines SHORT (1 sentence each). Natural conversation."""
        temp = 0.8
    
    payload = {
        "model": "grok-4-1-fast-non-reasoning",
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        "temperature": temp,
    }
    
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(CHAT_URL, headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


def parse_script(script: str) -> list:
    """Parse script into [(speaker, text), ...]"""
    lines = []
    for line in script.split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.upper().startswith('ALEX:'):
            lines.append(('ALEX', line[5:].strip()))
        elif line.upper().startswith('SAM:'):
            lines.append(('SAM', line[4:].strip()))
    return lines


async def grok_tts(script: str) -> Optional[str]:
    """Generate TTS with two Grok voices (Ara for Alex, Rex for Sam)."""
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    segments = parse_script(script)
    
    if not segments:
        # Fallback - single voice for entire script
        clean = script.replace("ALEX:", "").replace("SAM:", "").strip()[:3000]
        try:
            payload = {"input": clean, "voice": VOICE_ALEX, "response_format": "mp3"}
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(TTS_URL, headers=headers, json=payload)
            if resp.status_code == 200 and len(resp.content) > 500:
                return f"data:audio/mpeg;base64,{base64.b64encode(resp.content).decode()}"
        except Exception as e:
            print(f"TTS error: {e}")
        return None
    
    # Generate each segment with appropriate voice
    all_audio = b''
    
    for speaker, text in segments:
        voice = VOICE_ALEX if speaker == 'ALEX' else VOICE_SAM
        
        # Clean text of sound effects for cleaner audio
        clean_text = text.replace('*', '').strip()
        if not clean_text:
            continue
        
        try:
            payload = {
                "input": clean_text,
                "voice": voice,
                "response_format": "mp3"
            }
            
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(TTS_URL, headers=headers, json=payload)
            
            if resp.status_code == 200 and len(resp.content) > 500:
                all_audio += resp.content
                print(f"  {speaker} ({voice}): {len(resp.content)} bytes")
            else:
                print(f"  {speaker} TTS failed: {resp.status_code}")
                
        except Exception as e:
            print(f"TTS segment error ({speaker}): {e}")
            continue
    
    if not all_audio:
        return None
    
    return f"data:audio/mpeg;base64,{base64.b64encode(all_audio).decode()}"
