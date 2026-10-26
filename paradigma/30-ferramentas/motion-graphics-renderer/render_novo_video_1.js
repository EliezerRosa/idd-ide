const { chromium } = require('./rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 RENDERIZADOR DO NOVO VÍDEO 1 — PARADIGMA IDD NA PRÁTICA');
  console.log('   "Domínio, Intenção & Escopo com 3 Avatares (Orquestrador + Leigo + IA)"');
  console.log('='.repeat(70));

  const startTime = Date.now();
  const width = 1920;
  const height = 1080;
  const fps = 30;

  const assetsDir = path.resolve(__dirname, 'idd_video_1_assets');
  const htmlPath = path.join(assetsDir, 'video_1_presentation_scene.html');
  const timelinePath = path.join(assetsDir, 'video_1_timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_video_1.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const durationSec = Math.ceil(timelineData.totalDurationSec);
  console.log(`⏱️ Duração total planejada: ${durationSec}s (~${(durationSec/60).toFixed(1)} min)`);

  const tempRecDir = path.join(assetsDir, 'temp_raw_record');
  if (fs.existsSync(tempRecDir)) {
    fs.rmSync(tempRecDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRecDir, { recursive: true });

  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  console.log('\n[Fase 1/3] Iniciando Gravação em Tempo Real com Playwright Chromium Engine...');
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling'
    ]
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempRecDir, size: { width, height } },
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluate((items) => {
    window.setTimeline(items);
  }, timelineData.items);

  console.log(`Gravando ${durationSec}s de apresentação com atualização dinâmica a cada segundo...`);
  const stepMs = 1000;
  for (let elapsed = 0; elapsed <= durationSec; elapsed++) {
    await page.evaluate((t) => {
      window.updateFrameAtTime(t);
    }, elapsed);
    await page.waitForTimeout(stepMs);

    const pct = Math.min(100, Math.round((elapsed / durationSec) * 100));
    process.stdout.write(`   Gravando cena: ${elapsed}s / ${durationSec}s (${pct}%)...\r`);
  }
  console.log('\nGravação visual finalizada com sucesso!');

  await page.close();
  await context.close();
  await browser.close();

  // Localiza arquivo de vídeo bruto
  const recFiles = fs.readdirSync(tempRecDir).filter(f => f.endsWith('.webm'));
  if (recFiles.length === 0) throw new Error('Vídeo gravado não encontrado.');
  const rawVideo = path.join(tempRecDir, recFiles[0]);
  console.log(`Vídeo bruto gravado: ${rawVideo} (${(fs.statSync(rawVideo).size / (1024*1024)).toFixed(1)} MB)`);

  // [Fase 2/3] Muxing e Codificação FFmpeg H.264
  console.log('\n[Fase 2/3] Codificando Vídeo Final MP4 H.264 Broadcast com Áudio -14 LUFS...');
  const finalVideoProd = path.resolve(__dirname, '../producao_yt/IDD_Refrigeracao_Novo_Episodio_1.mp4');
  const outputsVersionDir = path.resolve(__dirname, 'outputs/IDD_Refrigeracao_Ep1_Oficial/v1');
  fs.mkdirSync(outputsVersionDir, { recursive: true });
  const finalVideoVer = path.join(outputsVersionDir, 'IDD_Refrigeracao_Ep1_Oficial_v1.mp4');

  const ffmpegArgs = [
    '-y',
    '-i', rawVideo,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-preset', 'medium',
    '-r', String(fps),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-shortest',
    '-movflags', '+faststart',
    finalVideoProd
  ];

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffmpegArgs);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código ${code}`));
    });
  });

  // Copia para diretório versionado
  fs.copyFileSync(finalVideoProd, finalVideoVer);
  fs.rmSync(tempRecDir, { recursive: true, force: true });

  const totalTimeSec = Math.round((Date.now() - startTime) / 1000);
  const sizeMb = (fs.statSync(finalVideoProd).size / (1024 * 1024)).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log(`✅ NOVO VÍDEO 1 GERADO COM SUCESSO EM ${totalTimeSec}s!`);
  console.log(`   Arquivo: ${finalVideoProd} (${sizeMb} MB)`);
  console.log(`   Versionado: ${finalVideoVer}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
