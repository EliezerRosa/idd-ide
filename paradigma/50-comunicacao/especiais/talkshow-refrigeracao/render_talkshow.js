const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

// Carrega o Playwright do repositório
const playwrightPath = path.resolve(__dirname, '../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function main() {
  console.log('='.repeat(75));
  console.log('🎬 RENDERIZADOR BROADCAST TALK SHOW — IDD REFRIGERAÇÃO');
  console.log('   "Homologação MER Canônico & Modelo UML de Casos de Uso Interativo"');
  console.log('='.repeat(75));

  const startTime = Date.now();
  const width = 1920;
  const height = 1080;

  const assetsDir = path.resolve(__dirname);
  const htmlPath = path.join(assetsDir, 'scene_talkshow.html');
  const timelinePath = path.join(assetsDir, 'timeline.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`).toString().trim();
  const audioDurationSec = parseFloat(probeOut);
  console.log(`⏱️ Duração do Áudio Master: ${audioDurationSec.toFixed(2)}s (~${(audioDurationSec / 60).toFixed(1)} min)`);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

  const tempRecDir = path.join(assetsDir, 'temp_raw_record');
  if (fs.existsSync(tempRecDir)) {
    fs.rmSync(tempRecDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRecDir, { recursive: true });

  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
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
      '--disable-web-security',
      '--allow-file-access-from-files',
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
  console.log(`   Navegando para: ${fileUrl}`);
  await page.goto(fileUrl);
  await page.waitForLoadState('networkidle');

  // Garante que os iframes carregaram
  await page.waitForTimeout(2000);

  // Injeta a timeline no navegador
  await page.evaluate((items) => {
    if (window.setTimeline) window.setTimeline(items);
  }, timelineData.items);

  console.log('   Gravando marco de calibração preta (3 segundos)...');
  await page.waitForTimeout(3000);

  console.log(`   Disparando Talk Show com Sincronia Neural e Mouse Humano (${audioDurationSec.toFixed(1)}s)...`);
  await page.evaluate(() => {
    if (window.startPresentation) window.startPresentation();
  });

  const totalWaitMs = Math.ceil((audioDurationSec + 2.5) * 1000);
  const stepMs = 15000;
  let elapsed = 0;
  while (elapsed < totalWaitMs) {
    const chunk = Math.min(stepMs, totalWaitMs - elapsed);
    await page.waitForTimeout(chunk);
    elapsed += chunk;
    const currentSec = (elapsed / 1000).toFixed(1);
    const pct = Math.min(100, Math.round((elapsed / totalWaitMs) * 100));
    process.stdout.write(`   Gravando apresentação: ${currentSec}s / ${(totalWaitMs / 1000).toFixed(1)}s (${pct}%)...\r`);
  }
  console.log('\n   Apresentação visual gravada com sucesso!');

  await page.evaluate(() => {
    if (window.stopPresentation) window.stopPresentation();
  });
  await page.waitForTimeout(500);

  await page.close();
  await context.close();
  await browser.close();

  const videoFiles = fs.readdirSync(tempRecDir).filter((f) => f.endsWith('.webm'));
  if (videoFiles.length === 0) throw new Error('Nenhum vídeo webm gerado pelo Playwright!');
  const rawVideo = path.join(tempRecDir, videoFiles[0]);
  const rawSizeMb = (fs.statSync(rawVideo).size / (1024 * 1024)).toFixed(1);
  const rawDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${rawVideo}"`).toString().trim();
  console.log(`\n[Fase 2/4] Vídeo bruto gravado: ${rawVideo} (${rawSizeMb} MB, ${parseFloat(rawDur).toFixed(2)}s)`);

  console.log('\n[Fase 3/4] Detectando Marco Zero Exato via FFmpeg Black-Detect...');
  let blackEndSec = 3.0;
  try {
    const bdOut = execSync(
      `ffmpeg -i "${rawVideo}" -vf "blackdetect=d=0.5:pix_th=0.10" -an -f null - 2>&1`,
      { encoding: 'utf8' }
    );
    const matches = [...bdOut.matchAll(/black_end:([0-9.]+)/g)];
    if (matches.length > 0) {
      blackEndSec = parseFloat(matches[matches.length - 1][1]);
    }
  } catch (e) {
    console.warn('   [!] Aviso no blackdetect, usando fallback 3.0s');
  }
  console.log(`   🎯 Marco Zero Detectado: ${blackEndSec}s (Cortina caiu neste instante)`);

  console.log('\n[Fase 4/4] Muxing e Codificação Final MP4 H.264 (Broadcast CFR 30fps)...');
  const finalVideoProd = path.resolve(__dirname, 'IDD_Refrigeracao_TalkShow_MER_UML.mp4');

  const ffmpegArgs = [
    '-y',
    '-i', `"${rawVideo}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex', `"[0:v]trim=start=${blackEndSec},setpts=PTS-STARTPTS,fps=30[v]"`,
    '-map', '"[v]"',
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
    `"${finalVideoProd}"`
  ];

  const fullCmd = `ffmpeg ${ffmpegArgs.join(' ')}`;
  execSync(fullCmd, { stdio: 'inherit' });

  if (fs.existsSync(tempRecDir)) {
    fs.rmSync(tempRecDir, { recursive: true, force: true });
  }

  const finalSizeMb = (fs.statSync(finalVideoProd).size / (1024 * 1024)).toFixed(1);
  const totalMin = ((Date.now() - startTime) / (1000 * 60)).toFixed(2);
  console.log('\n' + '='.repeat(75));
  console.log('🎉 TALK SHOW IDD REFRIGERAÇÃO RENDERIZADO COM SUCESSO TOTAL!');
  console.log(`📁 Vídeo Final MP4: ${finalVideoProd} (${finalSizeMb} MB)`);
  console.log(`⏱️ Tempo Total de Renderização: ${totalMin} min`);
  console.log('='.repeat(75) + '\n');
}

main().catch((err) => {
  console.error('\n❌ ERRO NA RENDERIZAÇÃO:', err);
  process.exit(1);
});
