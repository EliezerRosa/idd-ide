const fs = require('fs');
const path = require('path');
const playwrightPath = path.resolve(__dirname, '../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function makeCover() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const leigaB64 = fs.readFileSync(path.resolve(__dirname, '../avatares/avatar_usuaria_leiga.png')).toString('base64');
  const eliezerB64 = fs.readFileSync(path.resolve(__dirname, '../avatares/avatar_eliezer_oficial.png')).toString('base64');
  const iaB64 = fs.readFileSync(path.resolve(__dirname, '../avatares/avatar_ia_compilador.png')).toString('base64');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
      body { width: 1920px; height: 1080px; background: #030712; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1200px; height: 1200px; border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.40) 0%, rgba(16, 185, 129, 0.20) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(95px);
      }
      .grid {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(56, 189, 248, 0.06) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(56, 189, 248, 0.06) 1px, transparent 1px);
        background-size: 70px 70px;
      }
      .container {
        position: relative; z-index: 10; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: space-between; padding: 70px 90px;
      }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .badge {
        background: rgba(14, 165, 233, 0.25); border: 2.5px solid #38bdf8; color: #38bdf8;
        padding: 12px 28px; border-radius: 999px; font-weight: 900; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
      }
      .channel { font-size: 28px; font-weight: 700; color: #cbd5e1; letter-spacing: 1px; }
      .channel span { color: #38bdf8; font-weight: 800; }
      
      .main-title { margin-top: 20px; }
      .headline { font-size: 72px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #34d399 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 32px; font-weight: 600; color: #e2e8f0; margin-top: 16px; letter-spacing: -0.5px; }
      .subhead span { color: #38bdf8; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.92); border: 2px solid rgba(56, 189, 248, 0.4);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      .card-tag { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 8px; }
      .card-title { font-size: 26px; font-weight: 800; color: white; line-height: 1.25; }
      
      .bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
      .avatars-wrapper { display: flex; align-items: center; gap: 20px; }
      .avatar-group { display: flex; align-items: center; }
      .avatar-circle {
        width: 105px; height: 105px; border-radius: 50%; border: 3px solid #38bdf8;
        overflow: hidden; margin-right: -25px; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        background: #0f172a;
      }
      .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
      .avatar-labels { margin-left: 38px; }
      .host-title { font-size: 18px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; }
      .host-names { font-size: 24px; font-weight: 700; color: #f1f5f9; margin-top: 2px; }
      
      .cta-badge {
        background: linear-gradient(135deg, #0284c7, #10b981); color: white;
        padding: 16px 36px; border-radius: 16px; font-size: 24px; font-weight: 900;
        letter-spacing: 1px; box-shadow: 0 10px 30px rgba(14, 165, 233, 0.6);
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">TALK SHOW ESPECIAL • HOMOLOGAÇÃO</div>
        <div class="channel">SÉRIE <span>IDD NA PRÁTICA</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">HOMOLOGAÇÃO: <span class="gradient">MER & UML</span></div>
        <div class="subhead">Refrigeração Comercial <span>(HVAC-R)</span>: Modelagem Completa em Talk Show</div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-tag">Notação Canônica</div>
          <div class="card-title">MER Completo com Invariantes Termodinâmicas</div>
        </div>
        <div class="card">
          <div class="card-tag">UML Vivo & Interativo</div>
          <div class="card-title">Casos de Uso com Seleção de Foco Gradual</div>
        </div>
        <div class="card">
          <div class="card-tag">Engenharia OMG</div>
          <div class="card-title">Classes 3 Compartimentos & Statechart SHA-256</div>
        </div>
      </div>
      
      <div class="bottom">
        <div class="avatars-wrapper">
          <div class="avatar-group">
            <div class="avatar-circle" style="z-index: 3;">
              <img src="data:image/png;base64,${leigaB64}">
            </div>
            <div class="avatar-circle" style="z-index: 2; border-color: #38bdf8;">
              <img src="data:image/png;base64,${eliezerB64}">
            </div>
            <div class="avatar-circle" style="z-index: 1; border-color: #10b981;">
              <img src="data:image/png;base64,${iaB64}">
            </div>
          </div>
          <div class="avatar-labels">
            <div class="host-title">Bancada do Talk Show</div>
            <div class="host-names">Eliézer Rosa • Leiga • IA Compilador</div>
          </div>
        </div>
        
        <div class="cta-badge">FECHAMENTO ARQUITETURAL</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  await page.waitForTimeout(500);
  
  const coverPath = path.resolve(__dirname, 'capa.png');
  await page.screenshot({ path: coverPath });
  console.log('✅ Capa gerada com sucesso em:', coverPath);
  
  await browser.close();
}

makeCover().catch(console.error);
