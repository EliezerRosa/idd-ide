const { chromium } = require('./rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 RENDERIZADOR BROADCAST MASTER — VÍDEO 1 REFRIGERAÇÃO IDD (V2)');
  console.log('   "Sincronia Absoluta Frame-Accurate (Black-Detect, Wall-Clock Loop & CFR 30fps)"');
  console.log('='.repeat(70));

  const startTime = Date.now();
  const width = 1920;
  const height = 1080;

  const assetsDir = path.resolve(__dirname, 'idd_video_1_assets');
  const htmlPath = path.join(assetsDir, 'video_1_presentation_scene.html');
  const timelinePath = path.join(assetsDir, 'video_1_timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_video_1.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  // Duração exata do áudio master
  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`).toString().trim();
  const audioDurationSec = parseFloat(probeOut);
  console.log(`⏱️ Duração do Áudio Master: ${audioDurationSec.toFixed(3)}s (~${(audioDurationSec / 60).toFixed(1)} min)`);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

  const tempRecDir = path.join(assetsDir, 'temp_raw_record_v2');
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

  console.log('\n[Fase 1/4] Iniciando Gravação Playwright Chromium com Cortina de Sincronia...');
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

  // Carrega com fontes locais em milissegundos
  await page.goto(fileUrl, { waitUntil: 'load' });

  // Prepara o frame 0 da timeline por trás da cortina preta
  await page.evaluate((items) => {
    window.setTimeline(items);
    window.updateFrameAtTime(0);
  }, timelineData.items);

  // Aguarda 1000ms de tela preta sólida para estabelecer o marco zero detectável
  console.log('   Gravando marco de calibração preta...');
  await page.waitForTimeout(1000);

  // 1. Remove a cortina preta e dispara o loop ativamente guiado pelo relógio de sistema
  await page.evaluate(() => {
    const curtain = document.getElementById('sync-curtain');
    if (curtain) curtain.style.display = 'none';
  });

  const tStart = Date.now();
  console.log(`   Disparando Apresentação com Injeção Ativa (${audioDurationSec.toFixed(1)}s)...`);

  let lastLogSec = -1;
  while (true) {
    const elapsedSec = (Date.now() - tStart) / 1000;
    if (elapsedSec >= audioDurationSec + 0.8) break;

    await page.evaluate((t) => {
      window.updateFrameAtTime(t);
    }, elapsedSec);

    await page.waitForTimeout(66); // ~15 atualizações por segundo garantem que o Chromium nunca desacelere

    const curIntSec = Math.floor(elapsedSec);
    if (curIntSec % 10 === 0 && curIntSec !== lastLogSec) {
      lastLogSec = curIntSec;
      const pct = Math.min(100, Math.round((elapsedSec / audioDurationSec) * 100));
      process.stdout.write(`   Gravando apresentação: ${elapsedSec.toFixed(1)}s / ${audioDurationSec.toFixed(1)}s (${pct}%)...\r`);
    }
  }

  console.log('\n   Apresentação visual concluída com sucesso!');

  await page.close();
  await context.close();
  await browser.close();

  // Localiza o vídeo bruto WebM gravado
  const recFiles = fs.readdirSync(tempRecDir).filter(f => f.endsWith('.webm'));
  if (recFiles.length === 0) throw new Error('Vídeo gravado não encontrado.');
  const rawVideo = path.join(tempRecDir, recFiles[0]);
  console.log(`\n[Fase 2/4] Vídeo bruto gravado: ${rawVideo} (${(fs.statSync(rawVideo).size / (1024 * 1024)).toFixed(1)} MB)`);

  // Detecta exatamente o término da tela preta (black_end)
  console.log('\n[Fase 3/4] Detectando Marco Zero Exato via FFmpeg Black-Detect...');
  const blackDetectCmd = `ffmpeg -i "${rawVideo}" -vf "blackdetect=d=0.3:pic_th=0.98" -f null - 2>&1`;
  const blackOut = execSync(blackDetectCmd).toString();
  const match = blackOut.match(/black_end:([0-9\.]+)/);
  let blackEndSec = match ? parseFloat(match[1]) : 1.0;
  console.log(`   🎯 Marco Zero Detectado: ${blackEndSec}s (Cortina caiu exatamente neste ponto)`);

  // Muxing com o Áudio Master usando filter_complex para trim, setpts e constant 30fps
  console.log('\n[Fase 4/4] Muxing e Codificação Broadcast Final MP4 H.264 (CFR 30fps)...');
  const finalVideoProd = path.resolve(__dirname, '../producao_yt/IDD_Refrigeracao_Novo_Episodio_1.mp4');
  const outputsVersionDir = path.resolve(__dirname, 'outputs/IDD_Refrigeracao_Ep1_Oficial/v2');
  fs.mkdirSync(outputsVersionDir, { recursive: true });
  const finalVideoVer = path.join(outputsVersionDir, 'IDD_Refrigeracao_Ep1_Oficial_v2.mp4');

  const ffmpegArgs = [
    '-y',
    '-i', rawVideo,
    '-i', audioPath,
    '-filter_complex', `[0:v]trim=start=${blackEndSec},setpts=PTS-STARTPTS,fps=30[v]`,
    '-map', '[v]',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-preset', 'medium',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-t', String(audioDurationSec),
    '-movflags', '+faststart',
    finalVideoProd
  ];

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffmpegArgs);
    ff.stderr.on('data', () => {});
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código ${code}`));
    });
  });

  // Copia para diretório versionado v2
  fs.copyFileSync(finalVideoProd, finalVideoVer);
  fs.rmSync(tempRecDir, { recursive: true, force: true });

  const totalTimeSec = Math.round((Date.now() - startTime) / 1000);
  const sizeMb = (fs.statSync(finalVideoProd).size / (1024 * 1024)).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log(`✅ NOVO VÍDEO 1 SINCRONIZADO COM SUCESSO EM ${totalTimeSec}s!`);
  console.log(`   Arquivo: ${finalVideoProd} (${sizeMb} MB)`);
  console.log(`   Versionado: ${finalVideoVer}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
