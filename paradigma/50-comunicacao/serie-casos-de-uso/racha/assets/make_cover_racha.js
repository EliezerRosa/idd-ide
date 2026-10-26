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
        background: radial-gradient(circle, rgba(14, 165, 233, 0.40) 0%, rgba(139, 92, 246, 0.25) 45%, transparent 70%);
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
      .headline { font-size: 70px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #c084fc 100%);
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
      .card-title { font-size: 25px; font-weight: 800; color: white; line-height: 1.25; }
      
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
      .host-names { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-top: 4px; }
      
      .stamp {
        background: linear-gradient(135deg, #0284c7, #7c3aed);
        padding: 20px 38px; border-radius: 18px; text-align: center;
        box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      .stamp-top { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #e0e7ff; }
      .stamp-main { font-size: 32px; font-weight: 900; color: white; letter-spacing: 0.5px; margin-top: 2px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    
    <div class="container">
      <div class="header">
        <div class="badge">🔥 TALK SHOW MASTER • PARADIGMA IDD</div>
        <div class="channel">CANAL: <span>IDD NA PRÁTICA</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          RACHA DE CONTA & PIX:<br>
          <span class="gradient">MODELAGEM MER & UML COMPLETA</span>
        </div>
        <div class="subhead">
          Dissecando a Invariante da Soma Zero, Consumo Fracionado e Webhooks BACEN
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-tag">📊 MODELO MER CANÔNICO</div>
          <div class="card-title">Mesa, Rateio, Snapshot Imutável e Chaves Pix</div>
        </div>
        <div class="card">
          <div class="card-tag">⚡ CASOS DE USO & CLASSES</div>
          <div class="card-title">Visão Amigo, Organizador, Garçom e Gateway</div>
        </div>
        <div class="card">
          <div class="card-tag">🔄 MÁQUINA DE ESTADOS</div>
          <div class="card-title">Ciclo Aberta, Fechada, Liquidando e Quitada</div>
        </div>
      </div>
      
      <div class="bottom">
        <div class="avatars-wrapper">
          <div class="avatar-group">
            <div class="avatar-circle"><img src="data:image/png;base64,${eliezerB64}" /></div>
            <div class="avatar-circle"><img src="data:image/png;base64,${leigaB64}" /></div>
            <div class="avatar-circle"><img src="data:image/png;base64,${iaB64}" /></div>
          </div>
          <div class="avatar-labels">
            <div class="host-title">BANCADA OFICIAL DO TALK SHOW</div>
            <div class="host-names">Eliézer Rosa • Usuária Leiga • IA Compilador</div>
          </div>
        </div>
        
        <div class="stamp">
          <div class="stamp-top">IDD NA PRÁTICA</div>
          <div class="stamp-main">EPISÓDIO FINAL</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(1000);
  const outPath = path.resolve(__dirname, 'capa_racha.png');
  await page.screenshot({ path: outPath, type: 'png' });
  console.log('✅ Capa gerada com sucesso em:', outPath);
  await browser.close();
}

makeCover().catch(console.error);
