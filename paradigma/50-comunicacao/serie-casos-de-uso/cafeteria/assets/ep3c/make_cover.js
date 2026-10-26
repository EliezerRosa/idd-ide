const { chromium } = require('../../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function generateCover() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const coverHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
      body {
        width: 1280px; height: 720px;
        background: #030712;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 50px 70px;
      }
      .grid-bg {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(168, 85, 247, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(168, 85, 247, 0.08) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .glow-1 {
        position: absolute; width: 650px; height: 650px; border-radius: 50%;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 70%);
        top: -120px; right: -100px; filter: blur(80px);
      }
      .glow-2 {
        position: absolute; width: 500px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, transparent 70%);
        bottom: -100px; left: -100px; filter: blur(80px);
      }

      .top-row {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: center;
      }
      .series-badge {
        background: linear-gradient(135deg, #7e22ce, #9333ea);
        color: #ffffff; font-weight: 900; font-size: 15px;
        letter-spacing: 2px; padding: 7px 18px; border-radius: 999px;
        text-transform: uppercase; box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
      }
      .idd-seal {
        font-size: 15px; font-weight: 800; color: #c084fc;
        letter-spacing: 1.5px; text-transform: uppercase;
        display: flex; align-items: center; gap: 8px;
      }
      .idd-seal::before {
        content: ''; width: 10px; height: 10px; border-radius: 50%; background: #a855f7;
        box-shadow: 0 0 10px #a855f7;
      }

      .main-content {
        position: relative; z-index: 10;
        max-width: 820px;
      }
      .ep-pill {
        display: inline-block;
        background: rgba(168, 85, 247, 0.15); border: 1.5px solid #a855f7;
        color: #e9d5ff; font-weight: 800; font-size: 14px;
        letter-spacing: 2px; padding: 5px 15px; border-radius: 8px;
        text-transform: uppercase; margin-bottom: 15px;
      }
      .main-title {
        font-size: 54px; font-weight: 950; line-height: 1.05;
        letter-spacing: -1px; text-transform: uppercase;
        background: linear-gradient(135deg, #ffffff 40%, #e9d5ff 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 12px;
      }
      .main-subtitle {
        font-size: 24px; font-weight: 600; color: #94a3b8;
        line-height: 1.35;
      }
      .highlight { color: #f59e0b; font-weight: 800; }
      .tag-runtime {
        display: inline-flex; align-items: center; gap: 8px;
        margin-top: 15px; background: rgba(168, 85, 247, 0.15);
        border: 1.5px solid #a855f7; border-radius: 8px; padding: 6px 14px;
        color: #e9d5ff; font-weight: 800; font-size: 14px; font-family: monospace;
      }

      .bottom-row {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: flex-end;
      }
      .avatars-group {
        display: flex; gap: 20px; align-items: center;
      }
      .avatar-wrapper {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
      }
      .avatar-circle {
        width: 84px; height: 84px; border-radius: 50%;
        border: 3px solid #a855f7; overflow: hidden;
        background: #0f172a; box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
      }
      .avatar-circle img {
        width: 100%; height: 100%; object-fit: cover;
      }
      .avatar-name {
        font-size: 13px; font-weight: 800; color: #f8fafc;
      }
      .live-badge {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(168, 85, 247, 0.35);
        border-radius: 12px; padding: 12px 20px; text-align: right;
      }
      .live-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
      .live-val { font-size: 16px; color: #e9d5ff; font-weight: 900; }
    </style>
  </head>
  <body>
    <div class="grid-bg"></div>
    <div class="glow-1"></div>
    <div class="glow-2"></div>

    <div class="top-row">
      <div class="series-badge">Série Cafeteria & Padaria</div>
      <div class="idd-seal">Paradigma IDD • OMG UML Standard</div>
    </div>

    <div class="main-content">
      <div class="ep-pill">Episódio 3C • Arquitetura Comportamental</div>
      <div class="main-title">UML OFICIAL & STATECHARTS</div>
      <div class="main-subtitle">
        Casos de Uso da Cozinha, <span class="highlight">Classes 3 Compartimentos</span> e Statechart de Preparo
      </div>
      <div class="tag-runtime">
        <span>📐 OMG UML STANDARD</span>
        <span>•</span>
        <span>CASOS DE USO, CLASSES (+ / -) & CICLO DE PREPARO</span>
      </div>
    </div>

    <div class="bottom-row">
      <div class="avatars-group">
        <div class="avatar-wrapper">
          <div class="avatar-circle">
            <img src="../../avatares/avatar_usuaria_leiga.png" />
          </div>
          <div class="avatar-name">Usuária Leiga</div>
        </div>
        <div class="avatar-wrapper">
          <div class="avatar-circle" style="border-color: #38bdf8; box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">
            <img src="../../avatares/avatar_eliezer_oficial.png" />
          </div>
          <div class="avatar-name">Eliézer Rosa</div>
        </div>
        <div class="avatar-wrapper">
          <div class="avatar-circle" style="border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);">
            <img src="../../avatares/avatar_ia_compilador.png" />
          </div>
          <div class="avatar-name">IA Compilador</div>
        </div>
      </div>

      <div class="live-badge">
        <div class="live-label">Modelagem Formal</div>
        <div class="live-val">FLUXO ATÔMICO DE COZINHA</div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(coverHtml);
  await page.waitForTimeout(1000);
  const outPath = path.join(__dirname, 'capa.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
  console.log(`[OK] Capa Ep. 3C Cafeteria gerada com sucesso em: ${outPath}`);
}

generateCover().catch(err => {
  console.error("Erro ao gerar capa:", err);
  process.exit(1);
});
