const fs = require('fs');
const path = require('path');
const { chromium } = require('c:/Antigravity - IDD Refrigeração/motion_graphics_renderer/rendering_service/node_modules/playwright');

const OUT_DIR = path.resolve('C:/Antigravity - IDD Refrigeração/producao_yt/capas');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const COVERS = [
  {
    file: 'capa_episodio_1.png',
    badge: 'PARADIGMA IDD · EPISÓDIO 1',
    badgeColor: '#38bdf8',
    titleMain: 'DO CAOS DO CÓDIGO',
    titleSub: 'À INTENÇÃO PURA',
    highlight: 'REFRIGERAÇÃO INDUSTRIAL & PMOC',
    card1Title: 'Engenharia de Prompt vs IDD',
    card1Text: 'A intenção humana é o artefato de mais alta ordem. O código virou detalhe efêmero de implementação.',
    card2Title: 'Termodinâmica & Compliance',
    card2Text: 'Regras da física e da lei 13.589 não se dobram a palpites da IA.',
    accent: '#0284c7'
  },
  {
    file: 'capa_episodio_2.png',
    badge: 'PARADIGMA IDD · EPISÓDIO 2',
    badgeColor: '#a855f7',
    titleMain: 'ARQUITETURA & REGRAS',
    titleSub: 'MODELAGEM COM IA',
    highlight: 'BOUNDED CONTEXTS & CHILLERS',
    card1Title: 'Modelagem do Domínio Físico',
    card1Text: 'Pressões, temperaturas de saturação e cálculo de superaquecimento em tempo real.',
    card2Title: 'Confirm-Once Pattern',
    card2Text: 'Autonomia máxima da IA com controle crítico determinístico.',
    accent: '#9333ea'
  },
  {
    file: 'capa_episodio_3.png',
    badge: 'PARADIGMA IDD · EPISÓDIO 3',
    badgeColor: '#10b981',
    titleMain: 'BANCO DE DADOS & MER',
    titleSub: 'IMPLEMENTAÇÃO REAL',
    highlight: 'SUPABASE · POSTGRESQL · RLS',
    card1Title: 'Arquitetura Multitenant',
    card1Text: 'Isolamento estrito de contratos por cliente e credenciais criptografadas.',
    card2Title: 'Rastreabilidade Total',
    card2Text: 'Histórico auditável de ordens de serviço e QR Codes de equipamentos.',
    accent: '#059669'
  },
  {
    file: 'capa_episodio_4.png',
    badge: 'PARADIGMA IDD · EPISÓDIO 4',
    badgeColor: '#f59e0b',
    titleMain: 'VALIDAÇÃO & ENTREGA',
    titleSub: 'SISTEMA EM PRODUÇÃO',
    highlight: 'FECHANDO O CICLO COMPLETO',
    card1Title: 'Validar pela Experiência',
    card1Text: 'Você não lê o código, você USA o sistema e refina a intenção em ciclo contínuo.',
    card2Title: 'Entrega Corporativa',
    card2Text: 'Relatórios automáticos em PDF, emissão de PMOC e painel em tempo real.',
    accent: '#d97706'
  },
  {
    file: 'capa_playlist_completa.png',
    badge: 'SÉRIE COMPLETA NO CANAL',
    badgeColor: '#ec4899',
    titleMain: 'IDD NA PRÁTICA',
    titleSub: 'PARA LEIGOS & ENGENHEIROS',
    highlight: 'CRIE SOFTWARES COM IA AUTÔNOMA',
    card1Title: 'Caso Real Melissa',
    card1Text: 'CRM completo de 8 telas entregue por quem nunca soube programar.',
    card2Title: 'Refrigeração Industrial',
    card2Text: '4 episódios aprofundados da concepção ao deploy definitivo.',
    accent: '#db2777'
  },
  {
    file: 'capa_melissa_crm.png',
    badge: 'CASO REAL · PARADIGMA IDD',
    badgeColor: '#f43f5e',
    titleMain: 'COMO UMA LEIGA',
    titleSub: 'CRIOU UM CRM COM IA',
    highlight: 'NEXUSLOG CRM · ZERO CÓDIGO',
    card1Title: '8 Telas em Produção',
    card1Text: 'Gestão de fretes, frotas, cotações e relatórios concebidos sem programar uma única linha.',
    card2Title: 'Intenção > Código',
    card2Text: 'A IA assume os detalhes técnicos efêmeros enquanto a humana governa o negócio.',
    accent: '#e11d48'
  }
];

function generateHTML(c) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI', -apple-system, Roboto, sans-serif; }
  body {
    width: 1920px; height: 1080px; overflow: hidden;
    background: radial-gradient(circle at 15% 20%, #0d1e3a 0%, #060b18 55%, #02050d 100%);
    color: #f8fafc;
    display: flex;
    position: relative;
  }
  
  /* Linhas e luzes de fundo */
  .glow-orb {
    position: absolute; width: 650px; height: 650px; border-radius: 50%;
    background: radial-gradient(circle, ${c.badgeColor}33 0%, transparent 70%);
    top: -120px; right: 15%; filter: blur(60px);
  }
  .glow-orb-2 {
    position: absolute; width: 500px; height: 500px; border-radius: 50%;
    background: radial-gradient(circle, #38bdf822 0%, transparent 70%);
    bottom: -150px; left: 5%; filter: blur(80px);
  }
  
  .grid-pattern {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.6;
  }

  /* Conteúdo Principal */
  .container {
    position: relative; z-index: 10;
    width: 100%; height: 100%;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 80px 100px;
  }

  .top-section {
    display: flex; flex-direction: column; gap: 24px; max-width: 1100px;
  }

  .badge-tag {
    display: inline-flex; align-items: center; gap: 12px;
    background: rgba(15, 23, 42, 0.8);
    border: 2px solid ${c.badgeColor};
    border-radius: 50px;
    padding: 12px 30px;
    font-size: 22px; font-weight: 800; letter-spacing: 2px;
    color: ${c.badgeColor};
    box-shadow: 0 0 35px ${c.badgeColor}44;
    width: fit-content;
  }
  .badge-tag::before {
    content:''; width: 12px; height: 12px; border-radius: 50%; background: ${c.badgeColor};
    box-shadow: 0 0 12px ${c.badgeColor};
  }

  .title-main {
    font-size: 82px; font-weight: 900; line-height: 1.05; letter-spacing: -1.5px;
    color: #ffffff;
    text-shadow: 0 10px 40px rgba(0,0,0,0.8);
  }
  .title-sub {
    font-size: 74px; font-weight: 900; line-height: 1.05;
    background: linear-gradient(90deg, ${c.badgeColor}, #f1f5f9);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .highlight-strip {
    display: inline-flex; align-items: center; gap: 14px;
    background: rgba(255,255,255,0.06);
    border-left: 6px solid ${c.badgeColor};
    border-radius: 4px 14px 14px 4px;
    padding: 14px 28px;
    font-size: 26px; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px;
    width: fit-content; margin-top: 8px;
  }
  .highlight-strip strong { color: #f8fafc; }

  /* Cards 3D flutuantes no canto direito */
  .cards-3d-wrap {
    position: absolute; right: 80px; bottom: 100px;
    display: flex; flex-direction: column; gap: 26px;
    perspective: 1200px;
  }

  .card-3d {
    width: 580px;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.14);
    border-top: 2px solid ${c.badgeColor};
    border-radius: 20px;
    padding: 28px 32px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 30px ${c.badgeColor}22;
    transform: rotateY(-10deg) rotateX(4deg);
    transition: all 0.3s ease;
  }
  .card-3d.secondary {
    transform: rotateY(-8deg) rotateX(2deg) translateX(40px);
    opacity: 0.92;
  }

  .card-3d .c-title {
    font-size: 26px; font-weight: 800; color: #ffffff; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .card-3d .c-title span { color: ${c.badgeColor}; font-size: 22px; }
  .card-3d .c-desc {
    font-size: 19px; line-height: 1.5; color: #cbd5e1; font-weight: 400;
  }

  /* Rodapé / Branding */
  .bottom-bar {
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 26px;
    font-size: 20px; font-weight: 600; color: #64748b;
  }
  .bottom-bar .author {
    display: flex; align-items: center; gap: 14px; color: #e2e8f0; font-size: 22px; font-weight: 700;
  }
  .bottom-bar .author-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    background: linear-gradient(135deg, ${c.badgeColor}, #0284c7);
    display: flex; align-items: center; justify-content: center;
    color: #ffffff; font-weight: 900; font-size: 20px;
    box-shadow: 0 0 15px ${c.badgeColor}66;
  }
  .bottom-bar .tagline {
    color: #94a3b8; font-size: 20px; font-weight: 500;
  }
</style>
</head>
<body>
  <div class="glow-orb"></div>
  <div class="glow-orb-2"></div>
  <div class="grid-pattern"></div>

  <div class="container">
    <div class="top-section">
      <div class="badge-tag">${c.badge}</div>
      <div>
        <div class="title-main">${c.titleMain}</div>
        <div class="title-sub">${c.titleSub}</div>
      </div>
      <div class="highlight-strip">FOCO: <strong>${c.highlight}</strong></div>
    </div>

    <div class="cards-3d-wrap">
      <div class="card-3d">
        <div class="c-title"><span>⚡</span> ${c.card1Title}</div>
        <div class="c-desc">${c.card1Text}</div>
      </div>
      <div class="card-3d secondary">
        <div class="c-title"><span>⚙️</span> ${c.card2Title}</div>
        <div class="c-desc">${c.card2Text}</div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="author">
        <div class="author-avatar">E</div>
        <span>Eliézer J P Rosa · Paradigma IDD</span>
      </div>
      <div class="tagline">Intention-Driven Development · Casos Reais</div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log("Iniciando geração de capas em alta resolução (1920x1080)...");
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  for (const c of COVERS) {
    const htmlContent = generateHTML(c);
    await page.setContent(htmlContent, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const outPath = path.join(OUT_DIR, c.file);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`[OK] Capa gerada: ${c.file}`);
  }

  await browser.close();
  console.log("Todas as 5 capas foram criadas com sucesso em: " + OUT_DIR);
}

main().catch(err => {
  console.error("Erro ao gerar capas:", err);
  process.exit(1);
});
