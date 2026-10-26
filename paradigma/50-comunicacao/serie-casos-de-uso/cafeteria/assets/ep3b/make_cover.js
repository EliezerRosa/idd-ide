const fs = require('fs');
const path = require('path');
const { chromium } = require('../../../motion_graphics_renderer/rendering_service/node_modules/playwright');

async function makeCover() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
      body { width: 1920px; height: 1080px; background: #0c0a09; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1100px; height: 1100px; border-radius: 50%;
        background: radial-gradient(circle, rgba(217, 119, 6, 0.3) 0%, rgba(180, 83, 9, 0.2) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(80px);
      }
      .grid {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px);
        background-size: 80px 80px;
      }
      .container {
        position: relative; z-index: 10; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: space-between; padding: 75px 95px;
      }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .badge {
        background: rgba(217, 119, 6, 0.25); border: 2px solid #f59e0b; color: #fbbf24;
        padding: 12px 28px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(245, 158, 11, 0.4);
      }
      .channel { font-size: 28px; font-weight: 700; color: #d6d3d1; letter-spacing: 1px; }
      .channel span { color: #f59e0b; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 80px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #fbbf24 50%, #f59e0b 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 35px; font-weight: 600; color: #e7e5e4; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #fbbf24; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(28, 19, 14, 0.88); border: 1.5px solid rgba(245, 158, 11, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-title { font-size: 23px; font-weight: 800; color: #fbbf24; margin-bottom: 8px; }
      .card-desc { font-size: 18px; color: #a8a29e; line-height: 1.4; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid rgba(168, 162, 158, 0.2); padding-top: 25px;
      }
      .footer-tag { font-size: 22px; font-weight: 700; color: #f5f5f4; }
      .footer-badge {
        background: linear-gradient(135deg, #b45309, #78350f);
        padding: 12px 28px; border-radius: 12px; font-size: 20px; font-weight: 800; color: white;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">★ IDD METODOLOGIA · EPISÓDIO 3B ★</div>
        <div class="channel">CANAL <span>@EliézerJPRosa</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          MODELAGEM UML &amp; FSM COM IA<br>
          <span class="gradient">O COMPORTAMENTO DA CAFETERIA</span>
        </div>
        <div class="subhead">
          Como Construir a Máquina de Estados e Casos de Uso Antes do Código
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-title">🔄 FSM DA COZINHA</div>
          <div class="card-desc">Transições rigorosas: RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE.</div>
        </div>
        <div class="card">
          <div class="card-title">🤖 IA NO TERMINAL</div>
          <div class="card-desc">O compilador detecta risco de fraude pós-entrega e aguarda governança.</div>
        </div>
        <div class="card">
          <div class="card-title">🛡️ ESTADO TERMINAL</div>
          <div class="card-desc">Status ENTREGUE é imutável: devoluções exigem estorno fiscal com login.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-tag">METODOLOGIA IDD: O PASSO A PASSO DA ORQUESTRAÇÃO COM IA</div>
        <div class="footer-badge">PASSO 3: UML &amp; FSM</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.join(__dirname, 'capa.png');
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`Capa do Ep 3B da Cafeteria gerada em: ${outPath}`);
  await browser.close();
}

makeCover().catch(err => {
  console.error("Erro ao gerar capa Cafeteria Ep 3B:", err);
  process.exit(1);
});
