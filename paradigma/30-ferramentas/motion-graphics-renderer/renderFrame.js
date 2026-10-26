/**
 * @file renderFrame.js
 * @description Módulo de renderização de frames e geração de vídeo para o Motion Graphics Renderer.
 * Otimizado para vídeos de longa duração (até 1800 segundos / 30 minutos) com suporte a streaming direto via Pipe para FFmpeg.
 */

const { chromium } = require('playwright');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || 'ffmpeg');
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || 'ffprobe');

/**
 * Renderiza e captura um único frame em um determinado timeMs.
 */
async function renderFrame(page, timeMs, options = {}) {
  const canvasSelector = options.canvasSelector || 'canvas';

  await page.evaluate(async ({ tMs, sel }) => {
    if (typeof window.renderFrame === 'function') {
      await window.renderFrame(tMs);
      return;
    }
    if (typeof window.seek === 'function') {
      await window.seek(tMs / 1000);
      return;
    }
    if (window.gsap && window.gsap.globalTimeline) {
      window.gsap.globalTimeline.time(tMs / 1000);
    }
  }, { tMs: timeMs, sel: canvasSelector });

  const dataUrl = await page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (canvas && typeof canvas.toDataURL === 'function') {
      return canvas.toDataURL('image/png');
    }
    return null;
  }, canvasSelector);

  if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  return await page.screenshot({ type: 'png' });
}

function resolveBrowserExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  const pwRoot = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (fs.existsSync(pwRoot)) {
    const dirs = fs.readdirSync(pwRoot).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const d of dirs) {
      possiblePaths.push(path.join(pwRoot, d, 'chrome-win64', 'chrome.exe'));
    }
  }

  return possiblePaths.find((p) => fs.existsSync(p));
}

/**
 * Renderiza animações completas (suporta até 1800 segundos / 30 minutos) com otimização de stream via Pipe.
 */
async function renderVideo(options) {
  const {
    htmlPath,
    outputPath,
    audioPath = null,
    width = 1920,
    height = 1080,
    fps = 30,
    durationSec = 5,
    canvasSelector = 'canvas',
    useStdinPipe = true // Stream directly to FFmpeg stdin to prevent disk I/O bottleneck for 1800s videos
  } = options;

  if (!htmlPath || !outputPath) {
    throw new Error('Parâmetros obrigatórios ausentes: htmlPath e outputPath');
  }

  const absoluteHtmlPath = path.isAbsolute(htmlPath) ? htmlPath : path.resolve(process.cwd(), htmlPath);
  if (!fs.existsSync(absoluteHtmlPath)) {
    throw new Error(`Arquivo HTML não encontrado: ${absoluteHtmlPath}`);
  }

  const absoluteOutputPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

  const totalFrames = Math.round(durationSec * fps);
  console.log('='.repeat(60));
  console.log(`🎬 INICIANDO RENDERIZAÇÃO DE LONGA DURAÇÃO (${Math.round(durationSec/60)} MINUTOS)`);
  console.log(`   HTML: ${absoluteHtmlPath}`);
  console.log(`   Saída: ${absoluteOutputPath}`);
  console.log(`   Resolução: ${width}x${height} @ ${fps} fps (${totalFrames} frames)`);
  if (audioPath) console.log(`   Áudio: ${audioPath}`);
  console.log('='.repeat(60));

  const resolvedExecutable = resolveBrowserExecutable();
  const launchOptions = {
    headless: true,
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-timer-throttling'
    ]
  };
  if (resolvedExecutable) launchOptions.executablePath = resolvedExecutable;

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  try {
    const fileUrl = 'file:///' + absoluteHtmlPath.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector(canvasSelector, { timeout: 15000 }).catch(() => {});

    console.log(`\n[Streaming] Renderizando e codificando ${totalFrames} frames via Pipe FFmpeg...`);
    const startTime = Date.now();

    // Spawn FFmpeg for direct stdin streaming
    const ffmpegArgs = [
      '-f', 'image2pipe',
      '-r', String(fps),
      '-i', 'pipe:0',
    ];

    if (audioPath && fs.existsSync(audioPath)) {
      ffmpegArgs.push('-i', audioPath);
    }

    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      '-preset', 'fast',
      '-movflags', '+faststart'
    );

    if (audioPath && fs.existsSync(audioPath)) {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    ffmpegArgs.push('-y', absoluteOutputPath);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    ffmpegProcess.stderr.on('data', (data) => {
      // Optional FFmpeg log filtering
    });

    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg process exited with code ${code}`));
      });
    });

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timeMs = (frameIndex / fps) * 1000;
      let imageBuffer = await renderFrame(page, timeMs, { canvasSelector });

      const written = ffmpegProcess.stdin.write(imageBuffer);
      if (!written) {
        await new Promise((resolve) => ffmpegProcess.stdin.once('drain', resolve));
      }

      if ((frameIndex + 1) % 30 === 0 || frameIndex + 1 === totalFrames) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const currentFps = (frameIndex + 1) / elapsedSec;
        const percent = (((frameIndex + 1) / totalFrames) * 100).toFixed(1);
        const remainingSec = ((totalFrames - (frameIndex + 1)) / currentFps).toFixed(0);
        process.stdout.write(`   Frame ${frameIndex + 1}/${totalFrames} (${percent}%) | ${currentFps.toFixed(1)} fps | Restante: ~${remainingSec}s\r`);
      }
    }

    ffmpegProcess.stdin.end();
    await ffmpegDone;
    console.log('\n   Renderização e encoding de 1800s concluídos com sucesso!');

  } finally {
    await browser.close();
  }

  return {
    outputPath: absoluteOutputPath,
    totalFrames,
    durationSec
  };
}

module.exports = {
  renderFrame,
  renderVideo
};
