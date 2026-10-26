const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const playwrightPath = path.resolve(__dirname, 'rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function renderEp2bMaster() {
  console.log('='.repeat(80));
  console.log('🎬 RENDERIZADOR BROADCAST MASTER (PIPE DETERMINÍSTICO) — EPISÓDIO 2B METODOLOGIA');
  console.log('   "MER com IA — Modelo de Dados do Negócio sem Código"');
  console.log('='.repeat(80));

  const tStart = Date.now();
  const assetsDir = path.resolve(__dirname, 'idd_video_2b_assets');
  const htmlPath = path.join(assetsDir, 'video_2b_presentation_scene.html');
  const timelinePath = path.join(assetsDir, 'video_2b_timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_video_2b.wav');

  const finalVideoProd = path.resolve(__dirname, '../producao_yt/IDD_Refrigeracao_Novo_Episodio_2B.mp4');
  const outputsVersionDir = path.resolve(__dirname, 'outputs/IDD_Refrigeracao_Ep2B_Oficial/v1');
  fs.mkdirSync(outputsVersionDir, { recursive: true });
  const finalVideoVer = path.join(outputsVersionDir, 'IDD_Refrigeracao_Ep2B_Oficial_v1.mp4');

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
  const tempOut = path.join(assetsDir, 'temp_pipe_ep2b.mp4');
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

  console.log('   Iniciando renderização frame a frame sincronizada...');

  for (let f = 0; f < totalFrames; f++) {
    const elapsedSec = f / fps;

    await page.evaluate((s) => {
      if (window.updateFrameAtTime) window.updateFrameAtTime(s);
    }, elapsedSec);

    const jpegBuf = await page.screenshot({ type: 'jpeg', quality: 85 });

    const canWrite = ffmpeg.stdin.write(jpegBuf);
    if (!canWrite) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }

    if (f % 50 === 0 || f === totalFrames - 1) {
      const pct = ((f / totalFrames) * 100).toFixed(1);
      const timeSpentSec = (Date.now() - tStart) / 1000;
      const speedFps = f > 0 ? (f / timeSpentSec).toFixed(1) : '0';
      const etaSec = f > 0 ? Math.round((totalFrames - f) / (f / timeSpentSec)) : 0;
      const etaMin = (etaSec / 60).toFixed(1);

      process.stdout.write(`   Frame: ${f}/${totalFrames} (${pct}%) | Vídeo: ${elapsedSec.toFixed(1)}s/${audioDurationSec.toFixed(1)}s | Velocidade: ${speedFps} fps | ETA: ${etaMin} min\r`);
    }
  }

  console.log('\n   Todos os frames foram gerados e enviados para o FFmpeg!');
  ffmpeg.stdin.end();

  console.log('   Aguardando finalização do encoder MP4 H.264...');
  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código de saída ${code}`));
    });
  });

  await browser.close();

  console.log('\n[Fase 3/3] Validando Integridade do Arquivo Renderizado...');
  if (fs.existsSync(finalVideoProd)) fs.unlinkSync(finalVideoProd);
  fs.renameSync(tempOut, finalVideoProd);
  fs.copyFileSync(finalVideoProd, finalVideoVer);

  const finalStat = fs.statSync(finalVideoProd);
  const sizeMb = (finalStat.size / (1024 * 1024)).toFixed(2);
  const finalDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoProd}"`).toString().trim();
  const totalMin = ((Date.now() - tStart) / 1000 / 60).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 EPISÓDIO 2B RENDERIZADO COM SUCESSO ABSOLUTO!');
  console.log(`   Arquivo Final: ${finalVideoProd}`);
  console.log(`   Tamanho: ${sizeMb} MB`);
  console.log(`   Duração: ${parseFloat(finalDur).toFixed(2)}s (~${(parseFloat(finalDur) / 60).toFixed(1)} min)`);
  console.log(`   Tempo de Renderização: ${totalMin} min`);
  console.log('='.repeat(80));
}

renderEp2bMaster().catch((err) => {
  console.error('\n❌ ERRO NA RENDERIZAÇÃO:', err);
  process.exit(1);
});
