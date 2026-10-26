const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const playwrightPath = path.resolve(__dirname, '../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function main() {
  console.log('='.repeat(80));
  console.log('🎬 RENDERIZADOR BROADCAST MASTER TALK SHOW COMPLETO — IDD REFRIGERAÇÃO');
  console.log('   "Driver Cadenciado 1Hz: Homologação Integral do MER (8 Slides) + Modelo UML Vivo"');
  console.log('='.repeat(80));

  const startTime = Date.now();
  const width = 1920;
  const height = 1080;

  const assetsDir = path.resolve(__dirname);
  const htmlPath = path.join(assetsDir, 'scene_talkshow_completo.html');
  const timelinePath = path.join(assetsDir, 'timeline_completo.json');
  const audioPath = path.join(assetsDir, 'master_soundtrack_completo.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(timelinePath)) throw new Error(`Timeline não encontrada: ${timelinePath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`).toString().trim();
  const audioDurationSec = parseFloat(probeOut);
  console.log(`⏱️ Duração do Áudio Master Completo: ${audioDurationSec.toFixed(2)}s (~${(audioDurationSec / 60).toFixed(1)} min)`);

  const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

  const tempRecDir = path.join(assetsDir, 'temp_raw_record_completo');
  if (fs.existsSync(tempRecDir)) {
    fs.rmSync(tempRecDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRecDir, { recursive: true });

  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  console.log('\n[Fase 1/4] Iniciando Gravação Playwright Chromium com Janela Ativa GPU...');
  const browser = await chromium.launch({
    headless: false,
    executablePath,
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--window-position=0,0',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempRecDir, size: { width, height } },
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`   [Browser ${msg.type()}]:`, msg.text());
    }
  });
  page.on('pageerror', err => console.error('   [Page Error]:', err.message));

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log(`   Navegando para: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  // Aguarda os iframes internos carregarem totalmente
  await page.waitForTimeout(3500);

  // Injeta a timeline no talk show
  await page.evaluate((items) => {
    if (window.setTimeline) window.setTimeline(items);
  }, timelineData.items);

  console.log('   Gravando marco de calibração preta (3 segundos)...');
  await page.waitForTimeout(3000);

  console.log(`   Disparando Talk Show Completo com Sincronia Neural e Mouse Humano (${audioDurationSec.toFixed(1)}s)...`);
  await page.evaluate(() => {
    if (window.startPresentation) window.startPresentation();
  });

  // Loop ativo com monitoramento contínuo da gravação broadcast
  const totalWaitMs = Math.ceil((audioDurationSec + 4.0) * 1000);
  const stepMs = 1000;
  let elapsed = 0;
  while (elapsed < totalWaitMs) {
    await page.waitForTimeout(stepMs);
    elapsed += stepMs;

    if (elapsed % 15000 === 0 || elapsed >= totalWaitMs) {
      const currentSec = (elapsed / 1000).toFixed(1);
      const pct = Math.min(100, Math.round((elapsed / totalWaitMs) * 100));
      process.stdout.write(`   Gravando apresentação: ${currentSec}s / ${(totalWaitMs / 1000).toFixed(1)}s (${pct}%)...\r`);
    }
  }
  console.log('\n   Apresentação visual gravada com sucesso!');

  await page.evaluate(() => {
    if (window.stopPresentation) window.stopPresentation();
  });
  await page.waitForTimeout(1000);

  const videoObj = page.video();
  await page.close();
  const rawVideo = await videoObj.path();
  console.log(`\n[Fase 2/4] Vídeo bruto salvo com sucesso: ${rawVideo}`);

  await Promise.race([
    (async () => {
      await context.close();
      await browser.close();
    })(),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);

  const rawSizeMb = (fs.statSync(rawVideo).size / (1024 * 1024)).toFixed(1);
  console.log(`   Tamanho do vídeo bruto: ${rawSizeMb} MB`);

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
  const finalVideoProd = path.resolve(__dirname, 'IDD_Refrigeracao_TalkShow_Completo.mp4');

  const ffmpegArgs = [
    '-y',
    '-i', `"${rawVideo}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex', `"[0:v]trim=start=${blackEndSec},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=600[v]"`,
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
  ].join(' ');

  console.log(`   Executando comando FFmpeg master...`);
  execSync(`ffmpeg ${ffmpegArgs}`, { stdio: 'inherit' });

  if (fs.existsSync(tempRecDir)) {
    fs.rmSync(tempRecDir, { recursive: true, force: true });
  }

  const finalStat = fs.statSync(finalVideoProd);
  const finalSizeMb = (finalStat.size / (1024 * 1024)).toFixed(2);
  const finalDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoProd}"`).toString().trim();
  const totalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 TALK SHOW COMPLETO IDD REFRIGERAÇÃO CONCLUÍDO COM SUCESSO!');
  console.log(`   Arquivo Final: ${finalVideoProd}`);
  console.log(`   Tamanho: ${finalSizeMb} MB`);
  console.log(`   Duração: ${parseFloat(finalDur).toFixed(2)}s (~${(parseFloat(finalDur) / 60).toFixed(1)} min)`);
  console.log(`   Tempo Total de Renderização: ${totalMin} min`);
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('\n❌ ERRO NA RENDERIZAÇÃO:', err);
  process.exit(1);
});
