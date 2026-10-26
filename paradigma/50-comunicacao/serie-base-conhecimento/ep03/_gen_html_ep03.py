"""
Gerador do HTML de apresentação do IDD Ep03 — A Genealogia do IDD
Usa Web Speech API do navegador (Edge / Chrome).
Layout: sem barra de rolagem, controles no topo e rodapé, conteúdo centralizado.
"""
import json
import pathlib
from collections import defaultdict

# ── Paths ──────────────────────────────────────────────────────────────
EP03_DIR = pathlib.Path(r"C:\Antigravity - RVM Designações\IDD Paradigma\04 - Acervo de Episódios\Ep03 - A Genealogia")
SCRIPT_JSON = EP03_DIR / "idd_p3_output" / "script.json"
OUTPUT_HTML = EP03_DIR / "apresentacao_idd_ep03_genealogia.html"

# ── Build slide list ───────────────────────────────────────────────────
data = json.loads(SCRIPT_JSON.read_text("utf-8"))
slides_d: dict = defaultdict(lambda: {"title": "", "content": [], "lines": []})
for d in data:
    snum = d["slide_number"]
    if d["slide_title"]:
        slides_d[snum]["title"] = d["slide_title"]
    if d["slide_content"]:
        slides_d[snum]["content"] = [l.strip() for l in d["slide_content"].split("\n") if l.strip()]
    slides_d[snum]["lines"].append({
        "speaker": d["speaker"],
        "text": d["pt"],
        "note": d.get("note", ""),
    })

slide_list = [{"number": i, **slides_d[i]} for i in sorted(slides_d.keys())]
slides_js = json.dumps(slide_list, ensure_ascii=False, indent=2)

# ── HTML ───────────────────────────────────────────────────────────────
HTML = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IDD · Ep03 — A Genealogia do IDD</title>
<style>
/* ── Reset & theme ──────────────────────────────────────────────── */
:root {{
  --bg:       #0f172a;
  --bg-card:  #1e293b;
  --bg-dark:  #0a1020;
  --fg:       #e2e8f0;
  --muted:    #64748b;
  --border:   #2d3f55;
  --eliezer:  #f59e0b;
  --eliezer-bg: rgba(245,158,11,0.10);
  --ia:       #a78bfa;
  --ia-bg:    rgba(167,139,250,0.10);
  --accent2:  #34d399;
  --warn:     #fbbf24;
  --radius:   10px;
}}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{
  height: 100%; overflow: hidden;
  background: var(--bg); color: var(--fg);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  user-select: none;
}}

/* ── Layout: 3 rows ─────────────────────────────────────────────── */
#app {{
  display: flex; flex-direction: column;
  height: 100vh; width: 100vw;
  overflow: hidden;
}}

/* ── TOP BAR ────────────────────────────────────────────────────── */
#top-bar {{
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 0 20px; height: 54px;
  background: var(--bg-dark);
  border-bottom: 1px solid var(--border);
}}
#top-bar .ep-badge {{
  background: var(--ia); color: var(--bg-dark);
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  padding: 3px 10px; border-radius: 20px; white-space: nowrap;
}}
#top-bar .ep-title {{
  font-size: 14px; font-weight: 500; color: var(--fg); flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}}
#slide-counter {{
  font-size: 12px; color: var(--muted); white-space: nowrap;
}}
.btn {{
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--fg); padding: 5px 12px; border-radius: 6px;
  cursor: pointer; font-size: 13px; transition: all 140ms;
  white-space: nowrap;
}}
.btn:hover  {{ background: var(--ia); color: var(--bg); border-color: var(--ia); }}
.btn:active {{ transform: scale(0.97); }}
.btn:disabled {{ opacity: 0.35; cursor: not-allowed; transform: none; }}
.btn.primary {{
  background: var(--ia); color: var(--bg); border-color: var(--ia); font-weight: 600;
}}
.btn.primary:hover {{ background: var(--accent2); border-color: var(--accent2); }}
.btn.stop {{ color: #f87171; border-color: #f87171; }}
.btn.stop:hover {{ background: #f87171; color: var(--bg); }}

/* ── MAIN CENTER ────────────────────────────────────────────────── */
#main {{
  flex: 1; overflow: hidden;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  padding: 16px 48px;
  gap: 14px;
}}

/* ── SLIDE CARD ─────────────────────────────────────────────────── */
#slide-card {{
  width: 100%; max-width: 900px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 24px;
  overflow: hidden;
}}
#slide-num-badge {{
  display: inline-block;
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  color: var(--muted);
  margin-bottom: 6px;
}}
#slide-title {{
  font-size: 22px; font-weight: 700;
  color: var(--fg); line-height: 1.2;
  margin-bottom: 10px;
}}
#slide-content {{
  font-size: 13px; color: #94a3b8;
  line-height: 1.5;
  overflow: hidden;
}}
#slide-content li {{
  margin-bottom: 3px;
  list-style: none;
  padding-left: 14px;
  position: relative;
}}
#slide-content li::before {{
  content: "›"; position: absolute; left: 0;
  color: var(--ia);
}}

/* ── DIALOGUE AREA ──────────────────────────────────────────────── */
#dialogue-area {{
  width: 100%; max-width: 900px;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px;
}}

#speaker-bubble {{
  width: 100%;
  background: var(--ia-bg);
  border-left: 3px solid var(--ia);
  border-radius: 0 var(--radius) var(--radius) 0;
  padding: 14px 20px;
  transition: background 300ms, border-color 300ms;
  overflow: hidden;
  position: relative;
}}
#speaker-bubble.eliezer {{
  background: var(--eliezer-bg);
  border-left-color: var(--eliezer);
}}
#speaker-badge {{
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ia);
  margin-bottom: 6px;
  display: flex; align-items: center; gap: 8px;
}}
#speaker-bubble.eliezer #speaker-badge {{ color: var(--eliezer); }}
.speak-dot {{
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--ia);
  display: none;
}}
.speak-dot.active {{ display: inline-block; animation: blink 0.9s infinite; }}
#speaker-bubble.eliezer .speak-dot {{ background: var(--eliezer); }}
@keyframes blink {{ 0%,100%{{opacity:1}} 50%{{opacity:0.2}} }}
#dialogue-text {{
  font-size: 16px; line-height: 1.65; color: var(--fg);
}}

/* ── LINE DOTS ──────────────────────────────────────────────────── */
#line-dots {{
  display: flex; gap: 8px; align-items: center;
}}
.line-dot {{
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--border);
  transition: background 200ms, transform 200ms;
  cursor: pointer;
}}
.line-dot.active {{ background: var(--ia); transform: scale(1.3); }}
.line-dot.done   {{ background: var(--muted); }}

/* ── BOTTOM BAR ─────────────────────────────────────────────────── */
#bottom-bar {{
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px; flex-wrap: nowrap;
  padding: 0 20px; height: 54px;
  background: var(--bg-dark);
  border-top: 1px solid var(--border);
  overflow: hidden;
}}
#status-dot {{
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--muted); flex-shrink: 0;
  transition: background 200ms;
}}
#status-dot.speaking {{ background: var(--accent2); animation: blink 0.9s infinite; }}
#status-text {{
  font-size: 12px; color: var(--muted); flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}}
label.ctrl-label {{
  font-size: 12px; color: var(--muted);
  display: flex; align-items: center; gap: 5px;
  white-space: nowrap;
}}
select.ctrl-select {{
  background: var(--bg-card); color: var(--fg);
  border: 1px solid var(--border); padding: 4px 6px;
  border-radius: 5px; font-size: 12px; max-width: 160px;
}}
input[type=range] {{ width: 70px; vertical-align: middle; accent-color: var(--ia); }}
input[type=checkbox] {{ accent-color: var(--ia); }}

/* ── COVER OVERLAY ──────────────────────────────────────────────── */
#cover {{
  position: fixed; inset: 0; z-index: 50;
  background: linear-gradient(135deg, #0a0f1e 0%, #1e1b4b 50%, #0a0f1e 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0;
  transition: opacity 1.2s ease;
}}
#cover.hidden {{ opacity: 0; pointer-events: none; }}
#cover h1 {{
  font-size: 72px; font-weight: 800; letter-spacing: 6px;
  color: var(--ia); margin: 0;
  text-shadow: 0 0 40px rgba(167,139,250,0.4);
  animation: fadeUp 1.4s ease;
}}
#cover .ep-tag {{
  font-size: 14px; letter-spacing: 4px; color: var(--muted);
  margin-top: 6px;
  animation: fadeUp 1.4s 0.3s ease backwards;
}}
#cover h2 {{
  font-size: 26px; font-weight: 300; color: var(--fg);
  margin-top: 18px;
  animation: fadeUp 1.4s 0.5s ease backwards;
}}
#cover p {{
  font-size: 13px; color: var(--muted); margin-top: 30px;
  letter-spacing: 2px;
  animation: fadeUp 1.4s 0.8s ease backwards;
}}
@keyframes fadeUp {{
  from {{ opacity:0; transform:translateY(22px); }}
  to   {{ opacity:1; transform:none; }}
}}

/* ── TRANSITION ─────────────────────────────────────────────────── */
#slide-card, #speaker-bubble {{
  animation: none;
}}
.fade-in {{
  animation: fadeIn 350ms ease;
}}
@keyframes fadeIn {{
  from {{ opacity:0; transform:translateY(8px); }}
  to   {{ opacity:1; transform:none; }}
}}

/* ── RESPONSIVE ─────────────────────────────────────────────────── */
@media (max-width: 700px) {{
  #main {{ padding: 12px 16px; }}
  #slide-title {{ font-size: 17px; }}
  #dialogue-text {{ font-size: 14px; }}
  .btn {{ padding: 4px 8px; font-size: 12px; }}
}}
</style>
</head>
<body>

<!-- COVER -->
<div id="cover">
  <h1>IDD</h1>
  <div class="ep-tag">EPISÓDIO 03 · BASE DE CONHECIMENTO</div>
  <h2>A Genealogia do IDD</h2>
  <p>Carregando… clique em qualquer lugar para iniciar</p>
</div>

<div id="app">
  <!-- TOP BAR -->
  <div id="top-bar">
    <span class="ep-badge">EP 03</span>
    <span class="ep-title">A Genealogia do IDD</span>
    <button class="btn" id="btn-prev" title="Slide anterior (←)">◀</button>
    <span id="slide-counter">Slide 1 / 35</span>
    <button class="btn" id="btn-next" title="Próximo slide (→)">▶</button>
    <div style="width:1px; height:28px; background:var(--border); margin:0 4px;"></div>
    <button class="btn" id="btn-prev-line" title="Linha anterior (Shift+←)">‹ Linha</button>
    <button class="btn" id="btn-next-line" title="Próxima linha (Shift+→)">Linha ›</button>
  </div>

  <!-- MAIN -->
  <div id="main">
    <div id="slide-card">
      <div id="slide-num-badge">SLIDE 1 / 35</div>
      <div id="slide-title"></div>
      <ul id="slide-content"></ul>
    </div>

    <div id="dialogue-area">
      <div id="speaker-bubble">
        <div id="speaker-badge">
          <span id="speaker-name">IA</span>
          <span class="speak-dot" id="speak-dot"></span>
        </div>
        <div id="dialogue-text"></div>
      </div>
      <div id="line-dots"></div>
    </div>
  </div>

  <!-- BOTTOM BAR -->
  <div id="bottom-bar">
    <span id="status-dot"></span>
    <button class="btn primary" id="btn-play" title="Tocar (Espaço)">▶ Tocar</button>
    <button class="btn stop" id="btn-stop" title="Parar (S)">⏹ Parar</button>
    <div style="width:1px; height:28px; background:var(--border); margin:0 2px;"></div>
    <label class="ctrl-label" title="Voz masculina (Eliezer)">
      Eliezer:
      <select class="ctrl-select" id="voice-eliezer"></select>
    </label>
    <label class="ctrl-label" title="Voz feminina (IA)">
      IA:
      <select class="ctrl-select" id="voice-ia"></select>
    </label>
    <label class="ctrl-label">
      Vel:
      <input type="range" id="rate" min="0.6" max="1.4" step="0.05" value="1.0">
      <span id="rate-val">1.0×</span>
    </label>
    <label class="ctrl-label">
      <input type="checkbox" id="auto-advance" checked>
      Auto-avançar
    </label>
    <span id="status-text">Pronto. Pressione ▶ Tocar ou Espaço.</span>
  </div>
</div>

<script>
// ================================================================
// DATA
// ================================================================
const SLIDES = {slides_js};

// ================================================================
// STATE
// ================================================================
let curSlide = 0;   // index in SLIDES
let curLine  = 0;   // index in SLIDES[curSlide].lines
let speaking = false;
let utterance = null;
let voices = [];
let voiceEliezer = null;
let voiceIA      = null;

// ================================================================
// DOM refs
// ================================================================
const $  = id => document.getElementById(id);
const cover       = $('cover');
const slideNum    = $('slide-counter');
const slideNumBig = $('slide-num-badge');
const slideTitle  = $('slide-title');
const slideContent= $('slide-content');
const spkBubble   = $('speaker-bubble');
const spkName     = $('speaker-name');
const spkDot      = $('speak-dot');
const dlgText     = $('dialogue-text');
const lineDots    = $('line-dots');
const statusDot   = $('status-dot');
const statusTxt   = $('status-text');
const rateInput   = $('rate');
const rateVal     = $('rate-val');
const autoAdv     = $('auto-advance');
const btnPlay     = $('btn-play');
const btnStop     = $('btn-stop');
const btnPrev     = $('btn-prev');
const btnNext     = $('btn-next');
const btnPrevLine = $('btn-prev-line');
const btnNextLine = $('btn-next-line');
const voiceElSel  = $('voice-eliezer');
const voiceIASel  = $('voice-ia');

// ================================================================
// VOICE SETUP
// ================================================================
function loadVoices() {{
  voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const ptBR = voices.filter(v => v.lang.startsWith('pt'));
  const male   = ptBR.filter(v => /ant[oô]nio|male|masc/i.test(v.name));
  const female = ptBR.filter(v => /francisca|femi|fem/i.test(v.name));
  const allPt  = ptBR.length ? ptBR : voices;

  // populate selects
  function populate(sel, preferred, fallbackList) {{
    sel.innerHTML = '';
    const list = allPt.length ? allPt : voices;
    list.forEach((v, i) => {{
      const opt = document.createElement('option');
      opt.value = i + '___' + v.name;
      opt.textContent = v.name.replace(/Microsoft |Online|Natural/g, '').trim();
      sel.appendChild(opt);
    }});
    // auto-select best
    const best = preferred.length ? preferred[0] : (fallbackList.length ? fallbackList[0] : allPt[0]);
    if (best) {{
      const idx = list.indexOf(best);
      if (idx >= 0) sel.selectedIndex = idx;
    }}
  }}
  populate(voiceElSel, male, ptBR);
  populate(voiceIASel, female.length ? female : ptBR.filter((_,i)=>i!==voiceElSel.selectedIndex), ptBR);
  updateVoicePtrs();
}}

function updateVoicePtrs() {{
  const allPt = (speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt')) || speechSynthesis.getVoices());
  const list  = allPt.length ? allPt : speechSynthesis.getVoices();
  const elIdx = voiceElSel.selectedIndex;
  const iaIdx = voiceIASel.selectedIndex;
  voiceEliezer = list[elIdx] || null;
  voiceIA      = list[iaIdx] || null;
}}

speechSynthesis.addEventListener('voiceschanged', loadVoices);
loadVoices();
voiceElSel.addEventListener('change', updateVoicePtrs);
voiceIASel.addEventListener('change', updateVoicePtrs);

// ================================================================
// RENDER SLIDE
// ================================================================
function renderSlide(animate=true) {{
  const s = SLIDES[curSlide];
  const total = SLIDES.length;

  slideNum.textContent    = `Slide ${{curSlide+1}} / ${{total}}`;
  slideNumBig.textContent = `SLIDE ${{curSlide+1}} / ${{total}}`;

  if (animate) slideTitle.classList.remove('fade-in');
  slideTitle.textContent = s.title || '(sem título)';
  if (animate) void slideTitle.offsetWidth, slideTitle.classList.add('fade-in');

  slideContent.innerHTML = '';
  (s.content || []).slice(0, 7).forEach(c => {{
    const li = document.createElement('li');
    li.textContent = c;
    slideContent.appendChild(li);
  }});

  renderLine(animate);
  renderDots();
  updateButtons();
}}

function renderLine(animate=true) {{
  const s = SLIDES[curSlide];
  const ln = s.lines[curLine];
  const isEliezer = ln.speaker === 'Eliezer';

  spkBubble.classList.toggle('eliezer', isEliezer);
  spkName.textContent = ln.speaker;

  if (animate) {{
    spkBubble.classList.remove('fade-in');
    void spkBubble.offsetWidth;
    spkBubble.classList.add('fade-in');
  }}
  dlgText.textContent = ln.text;
  renderDots();
}}

function renderDots() {{
  const lines = SLIDES[curSlide].lines;
  lineDots.innerHTML = '';
  lines.forEach((_, i) => {{
    const d = document.createElement('span');
    d.className = 'line-dot' + (i < curLine ? ' done' : '') + (i === curLine ? ' active' : '');
    d.title = `Linha ${{i+1}} — ${{lines[i].speaker}}`;
    d.addEventListener('click', () => {{ stopSpeech(); curLine = i; renderLine(); }});
    lineDots.appendChild(d);
  }});
}}

function updateButtons() {{
  btnPrev.disabled     = curSlide === 0 && curLine === 0;
  btnNext.disabled     = curSlide === SLIDES.length - 1 && curLine === SLIDES[curSlide].lines.length - 1;
  btnPrevLine.disabled = curLine === 0;
  btnNextLine.disabled = curLine === SLIDES[curSlide].lines.length - 1;
  btnPlay.textContent  = speaking ? '⏸ Pausar' : '▶ Tocar';
}}

// ================================================================
// SPEECH
// ================================================================
function stopSpeech() {{
  speechSynthesis.cancel();
  speaking = false;
  spkDot.classList.remove('active');
  statusDot.classList.remove('speaking');
  statusTxt.textContent = 'Parado.';
  btnPlay.textContent = '▶ Tocar';
}}

function speakCurrent(onEnd) {{
  const s  = SLIDES[curSlide];
  const ln = s.lines[curLine];
  const utter = new SpeechSynthesisUtterance(ln.text);
  const isEliezer = ln.speaker === 'Eliezer';

  updateVoicePtrs();
  utter.voice = isEliezer ? voiceEliezer : voiceIA;
  utter.lang  = 'pt-BR';
  utter.rate  = parseFloat(rateInput.value);

  spkDot.classList.add('active');
  statusDot.classList.add('speaking');
  statusTxt.textContent = `Falando: ${{ln.speaker}} — "${{ln.text.substring(0,60)}}…"`;
  speaking = true;
  btnPlay.textContent = '⏸ Pausar';

  utter.onend = () => {{
    spkDot.classList.remove('active');
    speaking = false;
    if (onEnd) onEnd();
  }};
  utter.onerror = (e) => {{
    if (e.error !== 'interrupted') console.warn('TTS error:', e.error);
    spkDot.classList.remove('active');
    speaking = false;
  }};

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}}

function playFromCurrent() {{
  function next() {{
    if (!autoAdv.checked) {{
      statusDot.classList.remove('speaking');
      statusTxt.textContent = 'Parado (auto-avançar desligado).';
      btnPlay.textContent = '▶ Tocar';
      return;
    }}
    // advance line
    const lines = SLIDES[curSlide].lines;
    if (curLine < lines.length - 1) {{
      curLine++;
      renderLine();
      speakCurrent(next);
    }} else if (curSlide < SLIDES.length - 1) {{
      curSlide++;
      curLine = 0;
      renderSlide();
      speakCurrent(next);
    }} else {{
      // end
      statusDot.classList.remove('speaking');
      statusTxt.textContent = 'Apresentação concluída! 🎉';
      btnPlay.textContent = '▶ Tocar';
    }}
  }}
  speakCurrent(next);
}}

// ================================================================
// CONTROLS
// ================================================================
btnPlay.addEventListener('click', () => {{
  if (speechSynthesis.speaking) {{
    if (speechSynthesis.paused) {{
      speechSynthesis.resume();
      speaking = true;
      btnPlay.textContent = '⏸ Pausar';
    }} else {{
      speechSynthesis.pause();
      btnPlay.textContent = '▶ Retomar';
    }}
  }} else {{
    playFromCurrent();
  }}
}});

btnStop.addEventListener('click', stopSpeech);

btnPrev.addEventListener('click', () => {{
  stopSpeech();
  if (curLine > 0) {{ curLine--; renderLine(); }}
  else if (curSlide > 0) {{ curSlide--; curLine = SLIDES[curSlide].lines.length - 1; renderSlide(); }}
}});

btnNext.addEventListener('click', () => {{
  stopSpeech();
  const lines = SLIDES[curSlide].lines;
  if (curLine < lines.length - 1) {{ curLine++; renderLine(); }}
  else if (curSlide < SLIDES.length - 1) {{ curSlide++; curLine = 0; renderSlide(); }}
}});

btnPrevLine.addEventListener('click', () => {{
  if (curLine > 0) {{ stopSpeech(); curLine--; renderLine(); }}
}});

btnNextLine.addEventListener('click', () => {{
  const lines = SLIDES[curSlide].lines;
  if (curLine < lines.length - 1) {{ stopSpeech(); curLine++; renderLine(); }}
}});

rateInput.addEventListener('input', () => {{
  rateVal.textContent = parseFloat(rateInput.value).toFixed(2) + '×';
}});

// keyboard
document.addEventListener('keydown', e => {{
  if (cover && !cover.classList.contains('hidden')) return;
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  const lines = SLIDES[curSlide].lines;
  switch(e.key) {{
    case ' ':
      e.preventDefault();
      btnPlay.click();
      break;
    case 'ArrowRight':
      if (e.shiftKey) {{ btnNextLine.click(); }}
      else {{ btnNext.click(); }}
      break;
    case 'ArrowLeft':
      if (e.shiftKey) {{ btnPrevLine.click(); }}
      else {{ btnPrev.click(); }}
      break;
    case 's': case 'S':
      stopSpeech();
      break;
    case 'a': case 'A':
      autoAdv.checked = !autoAdv.checked;
      break;
  }}
}});

// ================================================================
// COVER dismiss
// ================================================================
cover.addEventListener('click', () => {{
  cover.classList.add('hidden');
  // try loading voices on user gesture
  loadVoices();
}});

// ================================================================
// INIT
// ================================================================
renderSlide(false);

// Auto-hide cover after 4s
setTimeout(() => cover.classList.add('hidden'), 4000);
</script>
</body>
</html>
"""

OUTPUT_HTML.write_text(HTML, encoding="utf-8")
print(f"HTML gerado: {{OUTPUT_HTML}}")
print(f"Tamanho: {{OUTPUT_HTML.stat().st_size:,}} bytes")
