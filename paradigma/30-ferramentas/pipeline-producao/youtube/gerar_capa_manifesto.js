const fs = require('fs');
const path = require('path');
const { chromium } = require('../motion_graphics_renderer/node_modules/playwright');

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
      body { width: 1920px; height: 1080px; background: #070a13; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1000px; height: 1000px; border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, rgba(99, 102, 241, 0.18) 50%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(70px);
      }
      .grid {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
        background-size: 80px 80px;
      }
      .container {
        position: relative; z-index: 10; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: space-between; padding: 75px 95px;
      }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .badge {
        background: rgba(14, 165, 233, 0.2); border: 2px solid #38bdf8; color: #38bdf8;
        padding: 12px 28px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);
      }
      .channel { font-size: 28px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
      .channel span { color: #f8fafc; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 86px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #818cf8 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 38px; font-weight: 600; color: #cbd5e1; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #38bdf8; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.78); border: 1.5px solid rgba(56, 189, 248, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-title { font-size: 23px; font-weight: 800; color: #38bdf8; margin-bottom: 8px; }
      .card-desc { font-size: 18px; color: #94a3b8; line-height: 1.4; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 25px;
      }
      .footer-tag { font-size: 22px; font-weight: 700; color: #e2e8f0; }
      .footer-badge {
        background: linear-gradient(135deg, #0284c7, #6366f1);
        padding: 12px 28px; border-radius: 12px; font-size: 20px; font-weight: 800; color: white;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">★ VÍDEO MANIFESTO OFICIAL ★</div>
        <div class="channel">CANAL <span>@EliézerJPRosa</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          DO ZERO AO SISTEMA REAL<br>
          <span class="gradient">SEM DIGITAR CÓDIGO</span>
        </div>
        <div class="subhead">
          O Paradigma <span>IDD</span> Aplicado à Engenharia de Refrigeração & PMOC
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-title">🧠 INTENÇÃO PURA</div>
          <div class="card-desc">A mente humana no comando epistêmico. A linguagem natural como artefato supremo.</div>
        </div>
        <div class="card">
          <div class="card-title">❄️ FÍSICA & COMPLIANCE</div>
          <div class="card-desc">Superaquecimento, pressões e a Lei 13.589 do PMOC como invariantes invioláveis.</div>
        </div>
        <div class="card">
          <div class="card-title">⚡ VELOCIDADE ABSOLUTA</div>
          <div class="card-desc">Do chiller ao banco de dados com 85% de redução de prazo e zero retrabalho.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-tag">★ SÍNTESE CINEMATOGRÁFICA DAS 4 MASTERCLASSES ★</div>
        <div class="footer-badge">ABERTURA DA PLAYLIST</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.resolve('C:/Antigravity - IDD Refrigeração/producao_yt/capas/capa_manifesto_oficial.png');
  await page.screenshot({ path: outPath });
  console.log('Capa salva com sucesso em:', outPath);
  await browser.close();
}

makeCover().catch(err => {
  console.error(err);
  process.exit(1);
});
