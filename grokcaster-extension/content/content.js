// Grokcaster Extension
(function() {
  if (window.__grokcasterLoaded) return;
  window.__grokcasterLoaded = true;

  const BACKEND = 'http://localhost:8001';

  // Create shadow DOM container
  const container = document.createElement('div');
  container.id = 'grokcaster-container';
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject HTML and CSS
  shadow.innerHTML = `
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

.panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  background: #000;
  border: 2px solid #333;
  border-radius: 16px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  color: #fff;
  display: none;
  flex-direction: column;
  z-index: 2147483647;
  overflow: hidden;
}
.panel.show { display: flex; }
.panel.playing { animation: glow 2s ease-in-out infinite; }
@keyframes glow {
  0%, 100% { border-color: #ff6b6b; }
  50% { border-color: #48dbfb; }
}

/* Stars covering entire panel */
.stars {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  animation: twinkle 3s infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.6; }
}
.shooting-star {
  position: absolute;
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, #fff, transparent);
  animation: shoot 4s linear infinite;
  opacity: 0;
}
@keyframes shoot {
  0% { transform: translateX(-100px); opacity: 0; }
  5% { opacity: 0.8; }
  20% { transform: translateX(400px) translateY(100px); opacity: 0; }
  100% { opacity: 0; }
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #222;
  cursor: grab;
  position: relative;
  z-index: 1;
}
.logo { width: 24px; height: 24px; border-radius: 6px; margin-right: 10px; }
.title { flex: 1; font-size: 15px; font-weight: 600; }
.close { background: none; border: none; color: #666; font-size: 20px; cursor: pointer; }
.close:hover { color: #fff; }

.body { padding: 14px; display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; position: relative; z-index: 1; }

.modes { display: flex; gap: 6px; }
.mode { flex: 1; padding: 10px; background: #111; border: 1px solid #333; border-radius: 8px; color: #888; font-size: 11px; cursor: pointer; text-align: center; }
.mode:hover { background: #1a1a1a; }
.mode.on { background: #1a1a1a; border-color: #555; color: #fff; }

.live-btn { display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(255,50,50,0.1); border: 1px solid rgba(255,50,50,0.3); border-radius: 10px; color: #fff; font-size: 13px; cursor: pointer; }
.live-btn:hover { background: rgba(255,50,50,0.2); }
.live-dot { width: 8px; height: 8px; background: #ff4444; border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }

.snip-btn { display: flex; align-items: center; gap: 8px; padding: 10px; background: #111; border: 1px solid #333; border-radius: 8px; color: #aaa; font-size: 12px; cursor: pointer; }
.snip-btn:hover { background: #1a1a1a; color: #fff; }

.control { display: flex; flex-direction: column; gap: 6px; }
.ctrl-row { display: flex; justify-content: space-between; }
.label { color: #666; font-size: 10px; text-transform: uppercase; }
.value { color: #fff; font-size: 11px; }
input[type="range"] { width: 100%; height: 4px; background: #333; border-radius: 2px; -webkit-appearance: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #fff; border-radius: 50%; cursor: pointer; }

.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #111; border-radius: 8px; }
.toggle-label { color: #fff; font-size: 12px; }
.toggle-sub { color: #666; font-size: 10px; }
.toggle { width: 40px; height: 22px; background: #333; border-radius: 11px; cursor: pointer; position: relative; }
.toggle.on { background: #10b981; }
.toggle-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: 0.2s; }
.toggle.on .toggle-knob { transform: translateX(18px); }

.status { display: flex; align-items: center; gap: 8px; color: #666; font-size: 12px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #333; }
.status.loading .status-dot { background: #fff; animation: pulse 0.8s infinite; }
.status.ready .status-dot { background: #10b981; }
.status.error .status-dot { background: #ef4444; }

.gen-btn { padding: 14px; background: #fff; border: none; border-radius: 10px; color: #000; font-size: 14px; font-weight: 600; cursor: pointer; }
.gen-btn:hover { opacity: 0.9; }
.gen-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.audio-wrap { display: none; }
.audio-wrap.show { display: block; }
audio { width: 100%; height: 40px; }

.live-widget { position: fixed; bottom: 20px; left: 20px; background: #111; border: 1px solid #333; border-radius: 12px; padding: 12px 16px; display: none; align-items: center; gap: 12px; z-index: 2147483648; }
.live-widget.show { display: flex; }
.live-widget.connected { border-color: #10b981; }
.live-orb { width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(#ff6b6b, #ff4757); animation: orb 1.5s infinite; }
@keyframes orb { 50% { transform: scale(1.1); } }
.live-widget.connected .live-orb { background: radial-gradient(#10b981, #059669); }
.live-info { display: flex; flex-direction: column; }
.live-title { color: #fff; font-size: 13px; }
.live-status { color: #888; font-size: 11px; }
.live-end { padding: 6px 12px; background: #222; border: none; border-radius: 6px; color: #fff; font-size: 11px; cursor: pointer; }

.snip-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); cursor: crosshair; z-index: 2147483646; display: none; }
.snip-overlay.show { display: block; }
.snip-box { position: absolute; border: 2px dashed #48dbfb; background: rgba(72,219,251,0.1); }
</style>

<div class="panel" id="panel">
  <div class="stars" id="stars"></div>
  <div class="header" id="header">
    <img class="logo" src="${chrome.runtime.getURL('assets/grok-logo.jpeg')}" alt="">
    <span class="title">Grokcaster</span>
    <button class="close" id="close">&times;</button>
  </div>
  <div class="body">
    <div class="modes">
      <button class="mode on" data-m="podcast">Podcast</button>
      <button class="mode" data-m="summary">Summary</button>
      <button class="mode" data-m="debate">Debate</button>
    </div>
    <button class="live-btn" id="liveBtn"><span class="live-dot"></span>Live Talk with Grok</button>
    <button class="snip-btn" id="snipBtn">✂️ Select Content</button>
    <div class="control">
      <div class="ctrl-row"><span class="label">Duration</span><span class="value" id="durVal">1 min</span></div>
      <input type="range" id="durSlider" min="0" max="7" value="2">
    </div>
    <div class="control">
      <div class="ctrl-row"><span class="label">Tone</span><span class="value" id="toneVal">Balanced</span></div>
      <input type="range" id="toneSlider" min="0" max="4" value="2">
    </div>
    <div class="toggle-row">
      <div><div class="toggle-label">𝕏 Personalize</div><div class="toggle-sub" id="xStatus">Off</div></div>
      <div class="toggle" id="xToggle"><div class="toggle-knob"></div></div>
    </div>
    <div class="status" id="status"><span class="status-dot"></span><span id="statusTxt">Ready</span></div>
    <button class="gen-btn" id="genBtn">Generate Podcast</button>
    <div class="audio-wrap" id="audioWrap"><audio id="audio" controls></audio></div>
  </div>
</div>
<div class="live-widget" id="liveWidget">
  <div class="live-orb"></div>
  <div class="live-info"><div class="live-title">Live Talk</div><div class="live-status" id="liveStatus">Connecting...</div></div>
  <button class="live-end" id="liveEnd">End</button>
</div>
<div class="snip-overlay" id="snipOverlay"><div class="snip-box" id="snipBox"></div></div>
`;

  // Get elements
  const $ = id => shadow.getElementById(id);
  const panel = $('panel');
  const header = $('header');
  const stars = $('stars');
  const closeBtn = $('close');
  const durSlider = $('durSlider');
  const durVal = $('durVal');
  const toneSlider = $('toneSlider');
  const toneVal = $('toneVal');
  const xToggle = $('xToggle');
  const xStatus = $('xStatus');
  const status = $('status');
  const statusTxt = $('statusTxt');
  const genBtn = $('genBtn');
  const audioWrap = $('audioWrap');
  const audio = $('audio');
  const liveBtn = $('liveBtn');
  const liveWidget = $('liveWidget');
  const liveStatus = $('liveStatus');
  const liveEnd = $('liveEnd');
  const snipBtn = $('snipBtn');
  const snipOverlay = $('snipOverlay');
  const snipBox = $('snipBox');

  // Config
  const DURS = ['30sec','45sec','1min','2min','3min','5min','7min','10min'];
  const DUR_LABELS = ['30s','45s','1m','2m','3m','5m','7m','10m'];
  const TONES = ['Formal','Professional','Balanced','Casual','Unhinged'];

  let mode = 'podcast';
  let xEnabled = false;
  let snipped = '';

  // Create stars across entire panel
  function makeStars() {
    stars.innerHTML = '';
    // Create ~30 twinkling stars
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      s.style.left = Math.random()*100+'%';
      s.style.top = Math.random()*100+'%';
      s.style.animationDelay = Math.random()*3+'s';
      s.style.animationDuration = (2 + Math.random()*2)+'s';
      stars.appendChild(s);
    }
    // Add a shooting star
    const shoot = document.createElement('div');
    shoot.className = 'shooting-star';
    shoot.style.top = (10 + Math.random()*40)+'%';
    shoot.style.animationDelay = (2 + Math.random()*5)+'s';
    stars.appendChild(shoot);
  }

  // Drag
  let drag = false, dx, dy;
  header.onmousedown = e => {
    if (e.target === closeBtn) return;
    drag = true;
    const r = panel.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
  };
  document.onmousemove = e => {
    if (drag) {
      panel.style.left = (e.clientX - dx) + 'px';
      panel.style.top = (e.clientY - dy) + 'px';
      panel.style.right = 'auto';
    }
  };
  document.onmouseup = () => drag = false;

  // Close
  closeBtn.onclick = () => panel.classList.remove('show');

  // Modes
  shadow.querySelectorAll('.mode').forEach(btn => {
    btn.onclick = () => {
      shadow.querySelectorAll('.mode').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      mode = btn.dataset.m;
    };
  });

  // Sliders
  durSlider.oninput = () => durVal.textContent = DUR_LABELS[durSlider.value];
  toneSlider.oninput = () => toneVal.textContent = TONES[toneSlider.value];

  // X Toggle
  xToggle.onclick = () => {
    xEnabled = !xEnabled;
    xToggle.classList.toggle('on', xEnabled);
    xStatus.textContent = xEnabled ? 'Using interests' : 'Off';
  };

  // Status helper
  function setStatus(type, txt) {
    status.className = 'status ' + type;
    statusTxt.textContent = txt;
  }

  // Snipping
  let snipping = false, sx, sy;
  snipBtn.onclick = () => {
    snipping = true;
    snipOverlay.classList.add('show');
  };
  snipOverlay.onmousedown = e => { sx = e.clientX; sy = e.clientY; snipBox.style.display = 'block'; };
  snipOverlay.onmousemove = e => {
    if (snipBox.style.display !== 'block') return;
    const w = e.clientX - sx, h = e.clientY - sy;
    snipBox.style.left = (w<0?e.clientX:sx)+'px';
    snipBox.style.top = (h<0?e.clientY:sy)+'px';
    snipBox.style.width = Math.abs(w)+'px';
    snipBox.style.height = Math.abs(h)+'px';
  };
  snipOverlay.onmouseup = () => {
    snipOverlay.classList.remove('show');
    snipBox.style.display = 'none';
    snipping = false;
    const rect = snipBox.getBoundingClientRect();
    let txt = '';
    document.querySelectorAll('p, h1, h2, h3, li, span, div').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top) {
        if (el.innerText && !el.querySelector('p, h1, h2, h3, li')) txt += el.innerText + ' ';
      }
    });
    if (txt.trim()) {
      snipped = txt.trim().slice(0,5000);
      snipBtn.textContent = '✂️ Selected (' + snipped.split(/\s+/).length + ' words)';
      setStatus('ready', 'Content snipped');
    }
  };

  // Audio events
  audio.oncanplay = () => audio.play().catch(()=>{});
  audio.onplay = () => panel.classList.add('playing');
  audio.onpause = () => panel.classList.remove('playing');
  audio.onended = () => panel.classList.remove('playing');

  // Generate
  genBtn.onclick = async () => {
    genBtn.disabled = true;
    setStatus('loading', 'Generating...');
    audioWrap.classList.remove('show');
    panel.classList.remove('playing');

    try {
      const res = await fetch(BACKEND + '/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_text: snipped || document.body.innerText.slice(0, 10000),
          page_title: document.title,
          duration: DURS[durSlider.value],
          tone: TONES[toneSlider.value].toLowerCase(),
          mode: mode,
          x_enabled: xEnabled
        })
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      if (data.audio_url) {
        audio.src = data.audio_url;
        audioWrap.classList.add('show');
        setStatus('ready', 'Playing');
      } else {
        setStatus('error', 'No audio');
      }
    } catch (e) {
      setStatus('error', e.message);
    }
    genBtn.disabled = false;
  };

  // Live Talk
  let ws = null, mediaStream = null, audioCtx = null;

  liveBtn.onclick = () => {
    if (liveWidget.classList.contains('show')) return closeLive();
    startLive();
  };
  liveEnd.onclick = closeLive;

  async function startLive() {
    liveWidget.classList.add('show');
    liveWidget.classList.remove('connected');
    liveStatus.textContent = 'Connecting...';

    try {
      ws = new WebSocket(BACKEND.replace('http','ws') + '/live-ws');
      
      ws.onopen = () => liveStatus.textContent = 'Authenticating...';
      
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        console.log('WS:', msg.type, msg);
        if (msg.type === 'proxy.connected') {
          liveWidget.classList.add('connected');
          liveStatus.textContent = 'Setting up...';
          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              instructions: 'You are Grok, a witty AI assistant. The user is browsing: ' + document.title + '. Have a natural voice conversation. Be helpful and brief.',
              voice: 'sage',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: { type: 'server_vad' }
            }
          }));
          startMic();
        } else if (msg.type === 'session.updated') {
          liveStatus.textContent = 'Listening...';
        } else if (msg.type === 'conversation.created') {
          // Ready
        } else if (msg.type === 'input_audio_buffer.speech_started') {
          liveStatus.textContent = 'Hearing you...';
          // INTERRUPT: Stop Grok's audio when user starts speaking
          stopPlayback();
        } else if (msg.type === 'input_audio_buffer.speech_stopped') {
          liveStatus.textContent = 'Processing...';
        } else if (msg.type === 'response.created') {
          liveStatus.textContent = 'Thinking...';
        } else if (msg.type === 'response.output_audio.delta' && msg.delta) {
          playAudio(msg.delta);
          liveStatus.textContent = 'Speaking...';
        } else if (msg.type === 'response.output_audio.done' || msg.type === 'response.done') {
          liveStatus.textContent = 'Listening...';
        } else if (msg.type === 'error') {
          console.error('xAI error:', msg);
          liveStatus.textContent = msg.message || 'Error';
        }
      };
      
      ws.onerror = () => liveStatus.textContent = 'Connection error';
      ws.onclose = () => liveStatus.textContent = 'Disconnected';
    } catch (e) {
      liveStatus.textContent = e.message;
    }
  }

  function closeLive() {
    stopPlayback(); // Stop any playing audio
    if (ws) { ws.close(); ws = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    liveWidget.classList.remove('show', 'connected');
  }

  async function startMic() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext({ sampleRate: 24000 });
      const src = audioCtx.createMediaStreamSource(mediaStream);
      const proc = audioCtx.createScriptProcessor(4096, 1, 1);
      src.connect(proc);
      proc.connect(audioCtx.destination);
      proc.onaudioprocess = e => {
        if (!ws || ws.readyState !== 1) return;
        const pcm = e.inputBuffer.getChannelData(0);
        const i16 = new Int16Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) i16[i] = Math.max(-32768, Math.min(32767, pcm[i]*32768));
        const bytes = new Uint8Array(i16.buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(bin) }));
      };
    } catch (e) {
      liveStatus.textContent = 'Mic: ' + e.message;
    }
  }

  let playCtx = null, playTime = 0;
  let activeSources = []; // Track active audio sources for interruption
  
  function stopPlayback() {
    // Stop all currently playing audio immediately
    activeSources.forEach(src => {
      try { src.stop(); } catch(e) {}
    });
    activeSources = [];
    // Reset playback time to now
    if (playCtx) playTime = playCtx.currentTime;
  }
  
  function playAudio(b64) {
    if (!playCtx) { playCtx = new AudioContext({ sampleRate: 24000 }); playTime = playCtx.currentTime; }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    const buf = playCtx.createBuffer(1, f32.length, 24000);
    buf.getChannelData(0).set(f32);
    const src = playCtx.createBufferSource();
    src.buffer = buf;
    src.connect(playCtx.destination);
    const t = Math.max(playCtx.currentTime, playTime);
    src.start(t);
    playTime = t + buf.duration;
    
    // Track this source for potential interruption
    activeSources.push(src);
    src.onended = () => {
      activeSources = activeSources.filter(s => s !== src);
    };
  }

  // Show panel
  function show() {
    panel.classList.add('show');
    makeStars();
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'GROKCASTER_SHOW') show();
  });

  window.openGrokcaster = show;
  console.log('Grokcaster loaded');
})();
