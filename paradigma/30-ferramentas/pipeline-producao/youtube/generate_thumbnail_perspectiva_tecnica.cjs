const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function generateThumbnail() {
  console.log('🎨 GERANDO CAPA PERSONALIZADA 16:9 PARA O ESPECIAL DE PERSPECTIVA TÉCNICA...');

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
        background: #060a14; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
        position: relative; display: flex; flex-direction: column; justify-content: space-between;
        padding: 50px 65px;
      }
      .bg-glow {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle at 10% 20%, rgba(2, 132, 199, 0.45) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.4) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 60%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #0284c7, #a855f7);
        padding: 10px 24px; border-radius: 999px; font-size: 17px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #38bdf8; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #38bdf8, #a855f7);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 980px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35);
        padding: 8px 18px; border-radius: 12px; font-size: 16px; font-weight: 700; color: #e2e8f0;
      }
      .pill.highlight-pill {
        background: rgba(168, 85, 247, 0.2); border-color: #a855f7; color: #d8b4fe;
      }
      .author {
        font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #fff;
        display: flex; align-items: center; gap: 10px;
      }
      .author span { color: #38bdf8; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>

    <div class="top-row">
      <div class="badge-ep">ESPECIAL DE ENGENHARIA</div>
      <div class="tag-series">PARADIGMA IDD — PERSPECTIVA TÉCNICA</div>
    </div>

    <div class="center-content">
      <h1>O Que Está Faltando no IDD?<br><span>A Avaliação Isenta & Os 5 Pilares</span></h1>
      <p>Confrontando o "Vibe Coding", Anthropic MCP e Antigravity com o rigor de Intent IR, Solvers Z3, Diff de Grafo e Sagas Atômicas.</p>
    </div>

    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">MCP vs IDD</div>
        <div class="pill highlight-pill">Z3 & Dafny SMT</div>
        <div class="pill">Intent IR</div>
        <div class="pill">Sagas 4 Fases</div>
      </div>
      <div class="author">
        Eliézer Rosa <span>| @eliezerjprosa</span>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);

  const outDir = path.resolve(__dirname, 'capas');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'capa_perspectiva_tecnica.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();

  console.log(`✅ Capa 16:9 gerada com sucesso: ${outPath}`);
}

generateThumbnail().catch(console.error);
