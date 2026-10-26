const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function generateThumbnail() {
  console.log('🎨 GERANDO CAPA PERSONALIZADA 16:9 PARA EPISÓDIO 09 (IDD vs MCP & ANTIGRAVITY)...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px; overflow: hidden;
        background: #050811; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
        position: relative; display: flex; flex-direction: column; justify-content: space-between;
        padding: 50px 65px;
      }
      .bg-glow {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle at 10% 20%, rgba(6, 182, 212, 0.45) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.4) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #06b6d4, #a855f7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(6, 182, 212, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #38bdf8; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 58px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #38bdf8, #c084fc);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(6, 182, 212, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #38bdf8;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">BASE DE CONHECIMENTO · EP. 09</div>
      <div class="tag-series">O CONFRONTO TÉCNICO: IDD vs. O MERCADO</div>
    </div>
    <div class="center-content">
      <h1>IDD vs. MCP &amp; ANTIGRAVITY<br><span>ENCANAMENTO vs. ENGENHARIA</span></h1>
      <p>A escavadeira mais veloz do mundo com um operador vendado: por que o protocolo MCP transporta chamadas, mas apenas o IDD garante a fundação do software.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">⚡ Anthropic MCP vs. IDD</div>
        <div class="pill">🚜 A Escavadeira Vendada</div>
        <div class="pill">🛡️ Sagas &amp; Invariantes</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(600);
  const capaPath = path.resolve(__dirname, 'capas/capa_teoria_ep09.png');
  await page.screenshot({ path: capaPath, type: 'png' });
  console.log(`[OK] Capa Ep. 09 salva em: ${capaPath}`);

  await browser.close();
}

generateThumbnail().catch(err => {
  console.error('Erro gerando thumbnail:', err);
  process.exit(1);
});
