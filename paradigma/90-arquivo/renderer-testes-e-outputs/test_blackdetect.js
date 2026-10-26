const { chromium } = require('./rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function testSync() {
  const testDir = path.resolve(__dirname, 'test_detect');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    recordVideo: { dir: testDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  await page.setContent('<html><body style="margin:0;background:#000000;"></body></html>');
  await page.waitForTimeout(1000); // 1s de preto

  // Transiciona para azul
  await page.evaluate(() => {
    document.body.style.background = '#38bdf8';
  });
  await page.waitForTimeout(2000); // 2s de azul

  await page.close();
  await context.close();
  await browser.close();

  const vid = path.join(testDir, fs.readdirSync(testDir).filter(f => f.endsWith('.webm'))[0]);
  const out = execSync(`ffmpeg -i "${vid}" -vf "blackdetect=d=0.3:pic_th=0.98" -f null - 2>&1`).toString();
  const match = out.match(/black_end:([0-9\.]+)/);
  console.log('Detectado black_end exato:', match ? match[1] + 's' : 'não detectado');
  console.log('Log relevante:', out.split('\n').filter(l => l.includes('blackdetect')).join('\n'));
}

testSync().catch(console.error);
