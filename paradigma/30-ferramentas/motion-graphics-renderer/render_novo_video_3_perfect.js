const { chromium } = require('./rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

async function main() {
  console.log('='.repeat(70));
  console.log('🎬 RENDERIZADOR BROADCAST MASTER — VÍDEO 3 REFRIGERAÇÃO IDD');
  console.log('   "Implementação & Banco de Dados — Sincronia Absoluta Frame-Accurate"');
  console.log('='.repeat(70));

  const startTime = Date.now();
  const width = 1920;
  const height = 1080;

  const assetsDir = path.resolve(__dirname, 'idd_video_3_assets');
  const htmlPath = path.join(assetsDir, 'video_3_presentation_scene.html');
  const timelinePath = path.join(assetsDir, 'video_3_timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_video_3.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`).toString().trim();
  const audioDurationSec = parseFloat(probeOut);
  console.log(`⏱️ Duração do Áudio Master Ep. 3: ${audioDurationSec.toFixed(3)}s (~${(audioDurationSec / 60).toFixed(1)} min)`);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

  const tempRecDir = path.join(assetsDir, 'temp_raw_record_v3');
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

  await page.goto(fileUrl, { waitUntil: 'load' });

  await page.evaluate((items) => {
    window.setTimeline(items);
    window.updateFrameAtTime(0);
  }, timelineData.items);

  console.log('   Gravando marco de calibração preta...');
  await page.waitForTimeout(1000);

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

    await page.waitForTimeout(66);

    const curIntSec = Math.floor(elapsedSec);
    if (curIntSec % 10 === 0 && curIntSec !== lastLogSec) {
      lastLogSec = curIntSec;
      const pct = Math.min(100, Math.round((elapsedSec / audioDurationSec) * 100));
      process.stdout.write(`   Gravando apresentação Ep. 3: ${elapsedSec.toFixed(1)}s / ${audioDurationSec.toFixed(1)}s (${pct}%)...\r`);
    }
  }

  console.log('\n   Apresentação visual concluída com sucesso!');

  await page.close();
  await context.close();
  await browser.close();

  const recFiles = fs.readdirSync(tempRecDir).filter(f => f.endsWith('.webm'));
  if (recFiles.length === 0) throw new Error('Vídeo gravado não encontrado.');
  const rawVideo = path.join(tempRecDir, recFiles[0]);
  const rawDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${rawVideo}"`).toString().trim());
  console.log(`\n[Fase 2/4] Vídeo bruto gravado: ${rawVideo} (${(fs.statSync(rawVideo).size / (1024 * 1024)).toFixed(1)} MB, ${rawDur.toFixed(2)}s)`);

  console.log('\n[Fase 3/4] Detectando Marco Zero Exato via FFmpeg Black-Detect...');
  const blackDetectCmd = `ffmpeg -i "${rawVideo}" -vf "blackdetect=d=0.3:pic_th=0.98" -f null - 2>&1`;
  const blackOut = execSync(blackDetectCmd).toString();
  const match = blackOut.match(/black_end:([0-9\.]+)/);
  let blackEndSec = match ? parseFloat(match[1]) : 1.0;
  console.log(`   🎯 Marco Zero Detectado: ${blackEndSec}s (Cortina caiu exatamente neste ponto)`);

  console.log('\n[Fase 4/4] Muxing e Codificação Broadcast Final MP4 H.264 (CFR 30fps)...');
  const finalVideoProd = path.resolve(__dirname, '../producao_yt/IDD_Refrigeracao_Novo_Episodio_3.mp4');
  const outputsVersionDir = path.resolve(__dirname, 'outputs/IDD_Refrigeracao_Ep3_Oficial/v1');
  fs.mkdirSync(outputsVersionDir, { recursive: true });
  const finalVideoVer = path.join(outputsVersionDir, 'IDD_Refrigeracao_Ep3_Oficial_v1.mp4');

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

  fs.copyFileSync(finalVideoProd, finalVideoVer);
  fs.rmSync(tempRecDir, { recursive: true, force: true });

  const totalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  const sizeMb = (fs.statSync(finalVideoProd).size / (1024 * 1024)).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('✅ MASTER FINAL EPISÓDIO 3 GERADO COM SUCESSO ABSOLUTO!');
  console.log(`📁 Produção YT: ${finalVideoProd} (${sizeMb} MB)`);
  console.log(`📁 Versionado : ${finalVideoVer}`);
  console.log(`⏱️ Tempo de Renderização: ${totalMin} min`);
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('\n❌ ERRO NA RENDERIZAÇÃO DO VÍDEO 3:', err);
  process.exit(1);
});
