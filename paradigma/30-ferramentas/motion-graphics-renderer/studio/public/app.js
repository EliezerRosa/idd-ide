/**
 * IDD Video Studio & Motion Pipeline - Frontend Application Logic
 */

let currentJobId = null;
let pollInterval = null;

// Detecção dinâmica da URL base da API (permite rodar tanto em http://localhost:3030 quanto se o arquivo for aberto direto via file://)
const API_BASE = (window.location.protocol === 'file:' || !window.location.port) ? 'http://localhost:3030' : '';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol === 'file:') {
    console.info('Aberto via file://. Conectando à API do servidor em http://localhost:3030');
    const notice = document.getElementById('fileProtocolNotice');
    if (notice) notice.classList.remove('hidden');
  }
  // Inspeciona automaticamente o vídeo padrão ao carregar
  inspectVideo();
  loadGallery();
});

// Troca de Abas
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  if (tabId === 'refazer') {
    document.getElementById('tabRefazerBtn').classList.add('active');
    document.getElementById('contentRefazer').classList.add('active');
  } else if (tabId === 'prompt') {
    document.getElementById('tabPromptBtn').classList.add('active');
    document.getElementById('contentPrompt').classList.add('active');
  } else if (tabId === 'galeria') {
    document.getElementById('tabGaleriaBtn').classList.add('active');
    document.getElementById('contentGaleria').classList.add('active');
    loadGallery();
  }
}

// Atualização de Sliders
function updateSliderVal(sliderId, labelId, suffix = '') {
  const val = document.getElementById(sliderId).value;
  document.getElementById(labelId).innerText = val + suffix;
}

// Inspecionar Vídeo Fonte
async function inspectVideo() {
  const videoPath = document.getElementById('videoPathInput').value.trim();
  const btn = document.getElementById('btnInspectVideo');
  if (!videoPath) return;

  btn.innerText = 'Inspecionando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/probe-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoPath })
    });
    const data = await res.json();

    if (data.success && data.metadata) {
      const m = data.metadata;
      document.getElementById('metaRes').innerText = `${m.width}x${m.height}`;
      document.getElementById('metaFps').innerText = `${m.fps} fps`;
      const mins = Math.floor(m.durationSec / 60);
      const secs = Math.floor(m.durationSec % 60);
      document.getElementById('metaDur').innerText = `${mins}m ${secs}s (${m.durationSec.toFixed(0)}s)`;
      document.getElementById('metaSize').innerText = `${(m.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      document.getElementById('metaAudio').innerText = `${m.audioCodec.toUpperCase()} (${m.sampleRate} Hz)`;

      document.getElementById('videoMetaBanner').classList.remove('hidden');
    } else {
      alert(`Aviso ao inspecionar: ${data.error || 'Não foi possível ler o arquivo.'}`);
    }
  } catch (err) {
    console.error('Falha ao inspecionar:', err);
    if (window.location.protocol === 'file:') {
      alert('Dica: O servidor do estúdio está rodando em http://localhost:3030. Acesse pelo navegador em http://localhost:3030 para comunicação direta!');
    }
  } finally {
    btn.innerText = '🔍 Inspecionar Vídeo';
    btn.disabled = false;
  }
}

// Submissão: Refazer Vídeo com Denoise e Remux
async function handleRefazerSubmit(e) {
  e.preventDefault();
  const videoPath = document.getElementById('videoPathInput').value.trim();
  const noiseReductionDb = parseInt(document.getElementById('sliderNoiseReduction').value, 10);
  const highpassFreq = parseInt(document.getElementById('sliderHighpass').value, 10);

  startMonitor('Iniciando Decomposição & Tratamento Acústico...');

  try {
    const res = await fetch(`${API_BASE}/api/process-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath,
        projectName: 'refrigeracao_narrador_cooler_denoised',
        noiseReductionDb,
        highpassFreq
      })
    });
    const data = await res.json();

    if (data.success && data.jobId) {
      currentJobId = data.jobId;
      startPollingJob(currentJobId);
    } else {
      throw new Error(data.error || 'Erro ao iniciar o processo.');
    }
  } catch (err) {
    alert(`Erro ao iniciar processamento: ${err.message}`);
    stopMonitor();
  }
}

// Submissão: Criar por Prompt
async function handlePromptSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('promptTitleInput').value.trim();
  const prompt = document.getElementById('promptTextInput').value.trim();
  const durationSec = parseFloat(document.getElementById('promptDurationInput').value);
  const fps = parseInt(document.getElementById('promptFpsSelect').value, 10);
  const [width, height] = document.getElementById('promptResSelect').value.split('x').map(Number);

  startMonitor('Gerando Cena Gráfica e Disparando Pipeline...');

  try {
    const res = await fetch(`${API_BASE}/api/create-from-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        prompt,
        durationSec,
        fps,
        width,
        height
      })
    });
    const data = await res.json();

    if (data.success && data.jobId) {
      currentJobId = data.jobId;
      startPollingJob(currentJobId);
    } else {
      throw new Error(data.error || 'Erro ao iniciar criação.');
    }
  } catch (err) {
    alert(`Erro ao criar por prompt: ${err.message}`);
    stopMonitor();
  }
}

// Iniciar Monitor de Processamento
function startMonitor(initialMessage) {
  const monitorSec = document.getElementById('monitorSection');
  const playerSec = document.getElementById('playerSection');
  
  monitorSec.classList.remove('hidden');
  playerSec.classList.add('hidden');
  
  document.getElementById('monitorPhaseText').innerText = initialMessage;
  document.getElementById('monitorPercentText').innerText = '0%';
  document.getElementById('progressBarFill').style.width = '0%';
  document.getElementById('terminalLogs').innerText = 'Inicializando conexão com o pipeline...\n';

  updateStepper(1);
  monitorSec.scrollIntoView({ behavior: 'smooth' });
}

function stopMonitor() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Atualizar Stepper
function updateStepper(stepNumber) {
  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`step${i}`);
    const conn = document.getElementById(`conn${i}`);

    if (i < stepNumber) {
      node.className = 'step-node done';
      if (conn) conn.className = 'step-connector active';
    } else if (i === stepNumber) {
      node.className = 'step-node active';
      if (conn) conn.className = 'step-connector';
    } else {
      node.className = 'step-node';
      if (conn) conn.className = 'step-connector';
    }
  }
}

// Polling de Status do Job
function startPollingJob(jobId) {
  stopMonitor();

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/job-status?jobId=${jobId}`);
      if (!res.ok) return;

      const job = await res.json();

      // Atualiza textos e progresso
      document.getElementById('monitorPhaseText').innerText = job.phase || 'Processando...';
      document.getElementById('monitorPercentText').innerText = `${job.progress || 0}%`;
      document.getElementById('progressBarFill').style.width = `${job.progress || 0}%`;

      // Atualiza Stepper conforme a fase
      if (job.progress < 25) updateStepper(1);
      else if (job.progress < 60) updateStepper(2);
      else if (job.progress < 95) updateStepper(3);
      else updateStepper(4);

      // Atualiza logs do terminal
      if (job.logs && job.logs.length > 0) {
        const terminal = document.getElementById('terminalLogs');
        terminal.innerText = job.logs.join('\n');
        terminal.scrollTop = terminal.scrollHeight;
      }

      // Conclusão
      if (job.status === 'completed') {
        stopMonitor();
        updateStepper(4);
        setTimeout(() => {
          showPlayerWithResult(job.result);
        }, 600);
      } else if (job.status === 'failed') {
        stopMonitor();
        alert(`O pipeline falhou: ${job.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.warn('Erro ao verificar status do job:', err);
    }
  }, 1000);
}

// Exibir Player com o Vídeo Final
function showPlayerWithResult(result) {
  if (!result || !result.finalVideoPath) return;

  const playerSec = document.getElementById('playerSection');
  const player = document.getElementById('studioPlayer');

  document.getElementById('playerVideoTitle').innerText = `Vídeo Pronto (${result.metadata?.projectName || 'Entregável'})`;
  document.getElementById('playerVideoPath').innerText = result.finalVideoPath;

  // Carrega vídeo no player via streaming range
  const fullStreamUrl = (result.streamUrl && result.streamUrl.startsWith('http')) 
    ? result.streamUrl 
    : `${API_BASE}${result.streamUrl}`;
  player.src = fullStreamUrl;
  player.load();

  // Atualiza especificações técnicas
  if (result.metadata) {
    const m = result.metadata;
    document.getElementById('specRes').innerText = m.resolution || '1920x1080';
    document.getElementById('specDur').innerText = m.durationSec ? `${m.durationSec.toFixed(1)}s` : '--';
    document.getElementById('specSize').innerText = m.fileSizeMB ? `${m.fileSizeMB} MB` : '--';
    document.getElementById('specNoise').innerText = m.coolerNoiseFilterApplied ? 'Ativo (AFFTDN + HighPass)' : 'Original';
  }

  // Botão Download
  const dlBtn = document.getElementById('btnDownloadVideo');
  dlBtn.href = fullStreamUrl;
  dlBtn.setAttribute('download', `${result.metadata?.projectName || 'video_final'}.mp4`);

  playerSec.classList.remove('hidden');
  playerSec.scrollIntoView({ behavior: 'smooth' });

  // Tenta dar play suave
  player.play().catch(() => {
    console.log('Autoplay bloqueado pelo navegador, aguardando clique do usuário.');
  });
}

// Carregar Galeria de Vídeos Anteriores
async function loadGallery() {
  const container = document.getElementById('galleryList');
  try {
    const res = await fetch(`${API_BASE}/api/outputs`);
    const items = await res.json();

    if (!items || items.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum vídeo renderizado ainda no repositório outputs/.</p>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="gallery-card">
        <div>
          <div class="card-badge">${item.version}</div>
          <h4 class="gallery-title">${item.project}</h4>
          <div class="gallery-meta">
            <span>Tamanho: ${item.sizeMB} MB</span>
            <span>Data: ${new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button class="btn secondary-btn" onclick="playGalleryVideo('${encodeURIComponent(item.path)}', '${item.project} (${item.version})', '${item.sizeMB}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Assistir no Player</span>
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Erro ao carregar a galeria de vídeos.</p>';
  }
}

// Reproduzir vídeo da galeria no player principal
function playGalleryVideo(encodedPath, title, sizeMB) {
  const filePath = decodeURIComponent(encodedPath);
  showPlayerWithResult({
    finalVideoPath: filePath,
    streamUrl: `${API_BASE}/api/stream-video?file=${encodeURIComponent(filePath)}`,
    metadata: {
      projectName: title,
      fileSizeMB: sizeMB,
      resolution: 'Alta Definição',
      coolerNoiseFilterApplied: true
    }
  });
}
