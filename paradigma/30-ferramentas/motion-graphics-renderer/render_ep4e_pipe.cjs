const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const playwrightPath = path.resolve(__dirname, 'rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function renderEp4eMaster() {
  console.log('='.repeat(80));
  console.log('🎬 RENDERIZADOR BROADCAST MASTER (PIPE DETERMINÍSTICO) — EPISÓDIO 4E');
  console.log('   "Metodologia IDD na Prática - Ep. 4E: Ergonomia Industrial & Multimodalidade em Campo"');
  console.log('='.repeat(80));

  const tStart = Date.now();
  const assetsDir = path.resolve(__dirname, 'idd_video_4e_assets');
  const htmlPath = path.join(assetsDir, 'video_4e_presentation_scene.html');
  const timelinePath = path.join(assetsDir, 'video_4e_timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_video_4e.wav');

  const finalVideoProd = path.resolve(__dirname, '../producao_yt/IDD_Refrigeracao_Novo_Episodio_4E.mp4');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`).toString().trim();
  const audioDurationSec = parseFloat(probeOut);
  console.log(`⏱️ Duração do Áudio Master: ${audioDurationSec.toFixed(2)}s (~${(audioDurationSec / 60).toFixed(1)} min)`);

  const fps = 6;
  const totalFrames = Math.ceil(audioDurationSec * fps);
  console.log(`🎞️ Taxa de Captura: ${fps} fps | Total de Frames: ${totalFrames} | Resolução: 1920x1080`);

  console.log('\n[Fase 1/3] Inicializando Chromium Playwright Headless...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log(`   Navegando para cena: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  await page.evaluate((items) => {
    if (window.setTimeline) window.setTimeline(items);
    const c = document.getElementById('sync-curtain');
    if (c) c.style.display = 'none';
  }, timelineData.items);

  console.log('\n[Fase 2/3] Iniciando Pipeline FFmpeg (Image2Pipe -> Libx264 30fps CFR)...');
  const tempOut = path.join(assetsDir, 'temp_pipe_ep4e.mp4');
  if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
  if (fs.existsSync(finalVideoProd)) {
    try { fs.unlinkSync(finalVideoProd); } catch (e) {}
  }

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-c:v', 'mjpeg',
    '-r', String(fps),
    '-i', 'pipe:0',
    '-i', audioPath,
    '-filter_complex', '[0:v]fps=30[v]',
    '-map', '[v]',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-shortest',
    '-movflags', '+faststart',
    tempOut
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  ffmpeg.on('error', (err) => {
    console.error('❌ Erro no processo FFmpeg:', err);
  });

  console.log('\n[Fase 3/3] Renderizando Frames e Injetando no Pipe...');
  const progressStep = Math.max(1, Math.floor(totalFrames / 20));

  for (let f = 0; f < totalFrames; f++) {
    const timeSec = f / fps;
    await page.evaluate((t) => window.updateFrameAtTime(t), timeSec);

    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });

    const canWrite = ffmpeg.stdin.write(buffer);
    if (!canWrite) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }

    if (f % progressStep === 0 || f === totalFrames - 1) {
      const pct = ((f + 1) / totalFrames * 100).toFixed(1);
      const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
      process.stdout.write(`  Frame ${f + 1}/${totalFrames} (${pct}%) — Tempo decorrido: ${elapsed}s\r`);
    }
  }

  console.log('\n\nFinalizando stream para o FFmpeg...');
  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg finalizou com código de erro ${code}`));
    });
  });

  await browser.close();

  fs.copyFileSync(tempOut, finalVideoProd);
  if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);

  const totalTimeMin = ((Date.now() - tStart) / 1000 / 60).toFixed(2);
  const sizeMb = (fs.statSync(finalVideoProd).size / (1024 * 1024)).toFixed(2);

  console.log('='.repeat(80));
  console.log('🎉 SUCESSO! RENDERIZADOR BROADCAST MASTER FINALIZADO COM ÊXITO!');
  console.log(`📁 Vídeo Produzido: ${finalVideoProd}`);
  console.log(`📦 Tamanho: ${sizeMb} MB | Duração: ${audioDurationSec.toFixed(2)}s | Tempo de Render: ${totalTimeMin} min`);
  console.log('='.repeat(80));
}

renderEp4eMaster().catch((err) => {
  console.error('\n❌ ERRO FATAL NA RENDERIZAÇÃO DO EPISÓDIO 4E:', err);
  process.exit(1);
});
