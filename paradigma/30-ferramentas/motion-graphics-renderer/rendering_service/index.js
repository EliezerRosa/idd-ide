const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { renderFrame } = require('../renderFrame.js');

/**
 * Localiza o executável do Chromium ou Google Chrome no sistema se o headless shell padrão não estiver presente.
 */
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

async function startRenderingService(projectDefinition) {
  const { totalFrames, frameRate, width, height, htmlPath } = projectDefinition;

  if (!totalFrames || !frameRate || !width || !height || !htmlPath) {
    throw new Error('Missing required projectDefinition parameters.');
  }

  console.log('Starting Rendering Service...');
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

  const executablePath = resolveBrowserExecutable();
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width, height } });

  try {
    const absoluteHtmlPath = path.isAbsolute(htmlPath) ? htmlPath : path.resolve(process.cwd(), htmlPath);
    const fileUrl = 'file:///' + absoluteHtmlPath.replace(/\\/g, '/');
    console.log(`Loading scene from: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'temp-frames-'));
    console.log(`Saving frames to temporary directory: ${tempDir}`);

    const renderedFramePaths = [];

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timeMs = (frameIndex / frameRate) * 1000;
      const frameFileName = `frame_${String(frameIndex).padStart(5, '0')}.png`;
      const frameFilePath = path.join(tempDir, frameFileName);

      console.log(`Rendering frame ${frameIndex + 1}/${totalFrames} at ${timeMs}ms...`);
      const imageBuffer = await renderFrame(page, timeMs, { canvasSelector: 'canvas' });
      fs.writeFileSync(frameFilePath, imageBuffer);
      renderedFramePaths.push(frameFilePath);
    }

    console.log('All frames rendered successfully.');
    return {
      tempDir,
      renderedFramePaths,
    };
  } catch (error) {
    console.error('Rendering Service failed:', error);
    throw error;
  } finally {
    console.log('Closing Playwright browser...');
    await browser.close();
    console.log('Playwright browser closed.');
  }
}

// Example usage (for testing purposes, can be run standalone)
if (require.main === module) {
  async function runExample() {
    const exampleHtmlPath = path.join(__dirname, 'example_scene.html');
    const projectDefinition = {
      totalFrames: 10, // Quick test
      frameRate: 30,
      width: 640,
      height: 360,
      htmlPath: exampleHtmlPath,
    };

    if (!fs.existsSync(exampleHtmlPath)) {
      fs.writeFileSync(exampleHtmlPath, `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Example Scene</title>
          <style>
            body { margin: 0; overflow: hidden; }
            canvas { display: block; background: #333; }
          </style>
        </head>
        <body>
          <canvas id="myCanvas" width="${projectDefinition.width}" height="${projectDefinition.height}"></canvas>
          <script>
            const canvas = document.getElementById('myCanvas');
            const ctx = canvas.getContext('2d');
            let rotation = 0;

            window.renderFrame = (timeMs) => {
              rotation = (timeMs / 1000) * (Math.PI / 2);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(rotation);
              ctx.fillStyle = 'red';
              ctx.fillRect(-50, -50, 100, 100);
              ctx.restore();
            };
          </script>
        </body>
        </html>
      `);
      console.log(`Created dummy HTML file at ${exampleHtmlPath}`);
    }

    let tempDirCreated = null;
    try {
      const result = await startRenderingService(projectDefinition);
      tempDirCreated = result.tempDir;
      console.log('Rendering complete. Frames saved to:', result.tempDir);
    } catch (error) {
      console.error('Example run failed:', error);
    } finally {
      if (fs.existsSync(exampleHtmlPath)) {
        fs.unlinkSync(exampleHtmlPath);
        console.log(`Cleaned up dummy HTML file at ${exampleHtmlPath}`);
      }
      if (tempDirCreated && fs.existsSync(tempDirCreated)) {
        fs.rmSync(tempDirCreated, { recursive: true, force: true });
        console.log(`Cleaned up temporary frames at ${tempDirCreated}`);
      }
    }
  }
  runExample();
}

module.exports = {
  startRenderingService,
};
