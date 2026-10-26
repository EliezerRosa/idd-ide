const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { VideoDecomposer } = require('./decomposer.js');
const { PipelineOrchestrator } = require('../pipeline.js');

const PORT = process.env.PORT || 3030;
const PUBLIC_DIR = path.join(__dirname, 'public');
const OUTPUTS_DIR = path.join(__dirname, '../outputs');

const decomposer = new VideoDecomposer(path.join(__dirname, 'temp'));
const orchestrator = new PipelineOrchestrator({ outputDir: OUTPUTS_DIR });

// Jobs state in-memory
const activeJobs = new Map();

/**
 * Registra logs e progresso de um job
 */
function updateJob(jobId, updates) {
  const job = activeJobs.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
  if (updates.log) {
    job.logs.push(`[${new Date().toLocaleTimeString()}] ${updates.log}`);
  }
}

/**
 * Cria cena HTML dinâmica a partir de um prompt
 */
function generatePromptScene(prompt, title) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Motion Scene'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #080c14; font-family: 'Segoe UI', system-ui, sans-serif; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="motionCanvas" width="1920" height="1080"></canvas>
  <script>
    const canvas = document.getElementById('motionCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Configuração de nós do Paradigma IDD
    const nodes = [
      { name: 'IDENTIFICAÇÃO', x: W * 0.2, y: H * 0.5, color: '#38bdf8' },
      { name: 'DIAGNÓSTICO', x: W * 0.5, y: H * 0.35, color: '#818cf8' },
      { name: 'DEFINIÇÃO', x: W * 0.8, y: H * 0.5, color: '#34d399' }
    ];

    window.renderFrame = function(timeMs) {
      const t = timeMs / 1000;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      // Fundo em grade sutil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Linhas de conexão animadas
      for (let i = 0; i < nodes.length - 1; i++) {
        const n1 = nodes[i];
        const n2 = nodes[i + 1];
        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, n1.color);
        grad.addColorStop(1, n2.color);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4 + Math.sin(t * 3 + i) * 1.5;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();

        // Pulso de dados
        const pulseRatio = (t * 0.8 + i * 0.3) % 1.0;
        const px = n1.x + (n2.x - n1.x) * pulseRatio;
        const py = n1.y + (n2.y - n1.y) * pulseRatio;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Desenhar Nós
      nodes.forEach((node, idx) => {
        const pulse = Math.sin(t * 4 + idx) * 5;
        // Halo de brilho
        const glow = ctx.createRadialGradient(node.x, node.y, 10, node.x, node.y, 70 + pulse);
        glow.addColorStop(0, node.color + 'aa');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 70 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Círculo central
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Texto do nó
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y + 70);
      });

      // Título principal com fade in
      const titleAlpha = Math.min(1, t / 1.5);
      ctx.fillStyle = \`rgba(255, 255, 255, \${titleAlpha})\`;
      ctx.font = '900 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("${title || 'PARADIGMA IDD - SISTEMA DE MANUTENÇÃO'}", W / 2, 120);

      // Subtítulo
      ctx.fillStyle = \`rgba(148, 163, 184, \${titleAlpha})\`;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText("Pipeline de Renderização Programática de Vídeo & Motion Graphics", W / 2, 165);
    };

    window.renderFrame(0);
  </script>
</body>
</html>`;
}

/**
 * Trata requisições HTTP Range (206) para streaming fluido no player HTML5
 */
function streamVideoFile(filePath, req, res) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Vídeo não encontrado.');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API: Status de um Job
  if (pathname === '/api/job-status' && req.method === 'GET') {
    const jobId = parsedUrl.query.jobId;
    const job = activeJobs.get(jobId);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Job não encontrado' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(job));
  }

  // API: Probe de Arquivo de Vídeo
  if (pathname === '/api/probe-video' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { videoPath } = JSON.parse(body);
        const meta = await decomposer.probeVideo(videoPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, metadata: meta }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Processar e Refazer Vídeo (Decomposição + Filtro de Cooler + Render)
  if (pathname === '/api/process-video' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const jobId = `job_${Date.now()}`;
        const videoPath = params.videoPath || path.resolve(__dirname, '../../producao_yt/Refrigeracao_IDD_Video_1_Narrador.mp4');

        if (!fs.existsSync(videoPath)) {
          throw new Error(`Vídeo de entrada não encontrado em: ${videoPath}`);
        }

        activeJobs.set(jobId, {
          id: jobId,
          status: 'running',
          phase: 'Decomposição & Análise',
          progress: 5,
          logs: [`Iniciando processo para: ${videoPath}`],
          result: null
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobId }));

        // Execução assíncrona do pipeline de tratamento
        (async () => {
          try {
            updateJob(jobId, { log: 'Analisando propriedades com ffprobe...', progress: 10 });
            const meta = await decomposer.probeVideo(videoPath);
            updateJob(jobId, { 
              log: `Vídeo identificado: ${meta.width}x${meta.height} @ ${meta.fps}fps (${(meta.durationSec / 60).toFixed(1)} min)`,
              progress: 20
            });

            // Diretório de entrega
            const projectName = params.projectName || 'refrigeracao_narrador_denoised';
            const { versionDir, version } = orchestrator.storageManager.createVersionedOutputDirectory(projectName);

            const rawAudioPath = path.join(decomposer.workDir, `extracted_${jobId}.wav`);
            const cleanAudioPath = path.join(versionDir, 'clean_audio.aac');
            const finalVideoPath = path.join(versionDir, 'final_video.mp4');

            // 1. Extração
            updateJob(jobId, { phase: 'Extração de Áudio', log: 'Extraindo áudio estéreo mestre...', progress: 30 });
            await decomposer.extractAudio(videoPath, rawAudioPath, (msg) => updateJob(jobId, { log: msg }));

            // 2. Limpeza espectral de ventoinha/cooler
            updateJob(jobId, { 
              phase: 'Filtragem Acústica de Cooler', 
              log: 'Aplicando filtro HighPass 85Hz + AFFTDN para eliminar ruído da ventoinha...',
              progress: 50 
            });
            await decomposer.denoiseCoolerFan(rawAudioPath, cleanAudioPath, {
              noiseReductionDb: params.noiseReductionDb || 20,
              noiseFloorDb: params.noiseFloorDb || -38,
              highpassFreq: params.highpassFreq || 85,
              normalize: true
            }, (msg) => updateJob(jobId, { log: msg }));

            // 3. Remux com preservação 1:1 do vídeo
            updateJob(jobId, { 
              phase: 'Codificação & Remux Final', 
              log: 'Remuxando vídeo 1352x768 com a nova faixa limpa sem perda de qualidade...',
              progress: 80 
            });
            await decomposer.remuxVideoWithCleanAudio(videoPath, cleanAudioPath, finalVideoPath, (msg) => updateJob(jobId, { log: msg }));

            // 4. Salvar metadados
            const stats = fs.statSync(finalVideoPath);
            const metadataPath = path.join(versionDir, 'metadata.json');
            const metadata = {
              projectName,
              version,
              sourceVideo: videoPath,
              finalVideoPath,
              fileSizeBytes: stats.size,
              fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
              durationSec: meta.durationSec,
              resolution: `${meta.width}x${meta.height}`,
              coolerNoiseFilterApplied: true,
              processedAt: new Date().toISOString()
            };
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

            // Limpeza
            if (fs.existsSync(rawAudioPath)) try { fs.unlinkSync(rawAudioPath); } catch (e) {}

            updateJob(jobId, {
              status: 'completed',
              phase: 'Concluído!',
              progress: 100,
              log: `Vídeo final pronto com ruído de cooler eliminado! (${metadata.fileSizeMB} MB)`,
              result: {
                versionDir,
                finalVideoPath,
                streamUrl: `/api/stream-video?file=${encodeURIComponent(finalVideoPath)}`,
                metadata
              }
            });

          } catch (jobErr) {
            updateJob(jobId, {
              status: 'failed',
              log: `ERRO: ${jobErr.message}`,
              error: jobErr.message
            });
          }
        })();

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Criar Vídeo a partir de Prompt (Gera Cena + Renderiza Pipeline Completo)
  if (pathname === '/api/create-from-prompt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const jobId = `job_prompt_${Date.now()}`;
        const title = params.title || 'Animacao Paradigma IDD';
        const prompt = params.prompt || 'Fluxo conceitual com nós luminosos e partículas';
        const durationSec = parseFloat(params.durationSec || 5);
        const fps = parseInt(params.fps || 30, 10);
        const width = parseInt(params.width || 1920, 10);
        const height = parseInt(params.height || 1080, 10);

        activeJobs.set(jobId, {
          id: jobId,
          status: 'running',
          phase: 'Geração da Cena HTML',
          progress: 10,
          logs: [`Criando cena com base no prompt: "${prompt}"`],
          result: null
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobId }));

        (async () => {
          try {
            // Cria HTML da cena
            const htmlContent = generatePromptScene(prompt, title);
            const sceneDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });
            const scenePath = path.join(sceneDir, `scene_${jobId}.html`);
            fs.writeFileSync(scenePath, htmlContent, 'utf8');

            updateJob(jobId, { 
              phase: 'Renderização do Pipeline', 
              log: `Disparando Playwright + FFmpeg (${width}x${height} @ ${fps}fps, ${durationSec}s)...`,
              progress: 35 
            });

            // Executa no PipelineOrchestrator
            const resPipeline = await orchestrator.run({
              projectName: title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
              htmlPath: scenePath,
              durationSec,
              fps,
              width,
              height
            });

            updateJob(jobId, {
              status: 'completed',
              phase: 'Concluído!',
              progress: 100,
              log: 'Pipeline de motion graphics finalizado com sucesso!',
              result: {
                versionDir: resPipeline.versionDir,
                finalVideoPath: resPipeline.finalVideoPath,
                streamUrl: `/api/stream-video?file=${encodeURIComponent(resPipeline.finalVideoPath)}`,
                metadata: resPipeline.metadata
              }
            });

          } catch (pErr) {
            updateJob(jobId, {
              status: 'failed',
              log: `ERRO NO PIPELINE: ${pErr.message}`,
              error: pErr.message
            });
          }
        })();

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Streaming do Vídeo com HTTP 206
  if (pathname === '/api/stream-video') {
    const filePath = parsedUrl.query.file;
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Parâmetro file ausente.');
    }
    return streamVideoFile(decodeURIComponent(filePath), req, res);
  }

  // API: Listar Histórico de Vídeos Gerados
  if (pathname === '/api/outputs' && req.method === 'GET') {
    const list = [];
    if (fs.existsSync(OUTPUTS_DIR)) {
      const projects = fs.readdirSync(OUTPUTS_DIR, { withFileTypes: true });
      for (const p of projects) {
        if (p.isDirectory()) {
          const pDir = path.join(OUTPUTS_DIR, p.name);
          const versions = fs.readdirSync(pDir, { withFileTypes: true });
          for (const v of versions) {
            if (v.isDirectory()) {
              const videoFile = path.join(pDir, v.name, 'final_video.mp4');
              const metaFile = path.join(pDir, v.name, 'metadata.json');
              if (fs.existsSync(videoFile)) {
                let meta = {};
                if (fs.existsSync(metaFile)) {
                  try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) {}
                }
                const st = fs.statSync(videoFile);
                list.push({
                  project: p.name,
                  version: v.name,
                  path: videoFile,
                  streamUrl: `/api/stream-video?file=${encodeURIComponent(videoFile)}`,
                  sizeMB: (st.size / (1024 * 1024)).toFixed(2),
                  createdAt: st.mtime,
                  metadata: meta
                });
              }
            }
          }
        }
      }
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // Servir arquivos estáticos do frontend (public/)
  let staticPath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    const ext = path.extname(staticPath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    return fs.createReadStream(staticPath).pipe(res);
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Página ou endpoint não encontrado.');
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🎬 IDD VIDEO STUDIO & PIPELINE UIX RODANDO!`);
  console.log(`🌐 Acesse no navegador: http://localhost:${PORT}`);
  console.log('='.repeat(60));
});
