const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, 'rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function testSlides() {
  const assetsDir = path.resolve(__dirname, 'idd_video_3_assets');
  const htmlPath = path.join(assetsDir, 'video_3_presentation_scene.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const times = [
    { sec: 30, name: 'slide1_ep3_30s.png' },
    { sec: 80, name: 'slide2_ep3_80s.png' },
    { sec: 140, name: 'slide3_ep3_140s.png' },
    { sec: 190, name: 'slide4_ep3_190s.png' }
  ];

  for (const t of times) {
    await page.evaluate((s) => window.updateFrameAtTime(s), t.sec);
    const buf = await page.screenshot({ type: 'png' });
    const out = path.join(__dirname, '../producao_yt', t.name);
    fs.writeFileSync(out, buf);
    console.log(`Salvo: ${out}`);
  }

  await browser.close();
}

testSlides().catch(console.error);
