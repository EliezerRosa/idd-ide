const fs = require('fs');
const path = require('path');
const { chromium } = require('../motion_graphics_renderer/rendering_service/node_modules/playwright');

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
      body { width: 1920px; height: 1080px; background: #060913; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1200px; height: 1200px; border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(139, 92, 246, 0.22) 40%, rgba(6, 182, 212, 0.15) 70%, transparent 85%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(90px);
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
        background: rgba(245, 158, 11, 0.2); border: 2px solid #f59e0b; color: #fbbf24;
        padding: 12px 30px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 30px rgba(245, 158, 11, 0.45);
      }
      .channel { font-size: 28px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
      .channel span { color: #f8fafc; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 78px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #fbbf24 45%, #c084fc 80%, #38bdf8 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 34px; font-weight: 600; color: #cbd5e1; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #fbbf24; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(245, 158, 11, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-title { font-size: 23px; font-weight: 800; color: #fbbf24; margin-bottom: 8px; }
      .card-desc { font-size: 18px; color: #94a3b8; line-height: 1.4; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 25px;
      }
      .footer-tag { font-size: 22px; font-weight: 700; color: #e2e8f0; }
      .footer-badge {
        background: linear-gradient(135deg, #d97706, #7c3aed);
        padding: 12px 28px; border-radius: 12px; font-size: 20px; font-weight: 800; color: white;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">★ GRAND FINALE · PARADIGMA IDD ★</div>
        <div class="channel">CANAL <span>@EliézerJPRosa</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          O FUTURO DO SOFTWARE<br>
          <span class="gradient">A MORTE DA SINTAXE MANUAL &amp; O IDD</span>
        </div>
        <div class="subhead">
          Múltiplos Agentes · Auto-regeneração · O Humano como Maestro da Tecnologia
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-title">🤖🤝🤖 ENXAME MULTIAGENTE</div>
          <div class="card-desc">Especialistas de segurança, domínio e interface colaborando e auditando sob governança.</div>
        </div>
        <div class="card">
          <div class="card-title">🧬 SISTEMAS AUTO-REGENERATIVOS</div>
          <div class="card-desc">Aplicações que monitoram invariantes em produção e aplicam correções autônomas.</div>
        </div>
        <div class="card">
          <div class="card-title">🌍 DEMOCRATIZAÇÃO RADICAL</div>
          <div class="card-desc">Especialistas de negócio e leigos criando sistemas de alta criticidade sem barreiras.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-tag">EPISÓDIO FINAL: O NOVO HORIZONTE DA ENGENHARIA DE SOFTWARE</div>
        <div class="footer-badge">PARADIGMA IDD OFICIAL</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.join(__dirname, 'capas', 'capa_novo_episodio_5.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`Capa do Episódio 5 gerada com sucesso em: ${outPath}`);
  await browser.close();
}

makeCover().catch(err => {
  console.error("Erro ao gerar capa do ep 5:", err);
  process.exit(1);
});
