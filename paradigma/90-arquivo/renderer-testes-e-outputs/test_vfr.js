const { chromium } = require('./rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function testVfr() {
  const testDir = path.resolve(__dirname, 'test_vfr');
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
  await page.waitForTimeout(1000);

  const tStart = Date.now();
  while ((Date.now() - tStart) < 5000) {
    const elapsed = (Date.now() - tStart) / 1000;
    await page.evaluate((t) => {
      document.body.style.background = (t % 1 > 0.5) ? '#38bdf8' : '#f59e0b';
    }, elapsed);
    await page.waitForTimeout(100);
  }

  await page.close();
  await context.close();
  await browser.close();

  const vid = path.join(testDir, fs.readdirSync(testDir).filter(f => f.endsWith('.webm'))[0]);
  const probe = execSync(`ffprobe -v error -show_entries format=duration -show_entries stream=duration,nb_frames,r_frame_rate -of json "${vid}"`).toString();
  console.log('Recorded WebM probe:', JSON.parse(probe));

  // Test encoding with fps_mode cfr
  const testMp4 = path.join(testDir, 'test_cfr.mp4');
  execSync(`ffmpeg -y -i "${vid}" -c:v libx264 -pix_fmt yuv420p -fps_mode cfr -r 30 "${testMp4}"`);
  const probeMp4 = execSync(`ffprobe -v error -show_entries format=duration -show_entries stream=duration,nb_frames,r_frame_rate -of json "${testMp4}"`).toString();
  console.log('Encoded MP4 probe:', JSON.parse(probeMp4));
}

testVfr().catch(console.error);
