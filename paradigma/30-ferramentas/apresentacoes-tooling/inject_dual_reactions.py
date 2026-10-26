import re
import sys
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

HTML_PATH = Path(r"c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html")
SCENE_PATH = Path(r"c:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets\video_perspectiva_tecnica_presentation_scene.html")

REACTIONS_DATA = {
    1: {
        "dev": {
            "gif": "gifs/slide01_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Pânico do Vibe Coding",
            "speech": '"Socorro! O LLM cuspiu 400 linhas sem teste e quebrou a produção às 3h!"',
            "impact": "<strong>Fim dos Plantões de Madrugada:</strong> Transição do caos empírico para uma arquitetura ontológica com regras formais invioláveis."
        },
        "user": {
            "gif": "gifs/slide01_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Decepção com Demos Frágeis",
            "speech": '"Prometeram uma IA mágica, mas no primeiro clique de negócio deu Erro 500!"',
            "impact": "<strong>Software Empresarial Confiável:</strong> Fim das promessas vazias; sistemas que entregam exatamente o que o negócio precisa com estabilidade."
        }
    },
    2: {
        "dev": {
            "gif": "gifs/slide02_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● MCP: Encanamento Cru",
            "speech": '"O MCP conectou a API em segundos, mas o agente fez DROP TABLE sem pedir licença!"',
            "impact": "<strong>Governança de Ação Real:</strong> Compreensão de que conectar ferramentas (pipes) não substitui a blindagem ontológica do domínio."
        },
        "user": {
            "gif": "gifs/slide02_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Blindagem de Domínio",
            "speech": '"Finalmente meus dados de faturamento e clientes estão protegidos por leis invioláveis!"',
            "impact": "<strong>Integridade & Auditoria Total:</strong> O usuário opera com tranquilidade sabendo que o agente não corrompe o patrimônio da empresa."
        }
    },
    3: {
        "dev": {
            "gif": "gifs/slide03_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Compilador Intent IR",
            "speech": '"Pela 1ª vez tenho uma AST formal: compilo a intenção para React, Rust ou SQL sem retrabalho!"',
            "impact": "<strong>Fim do Boilerplate Eterno:</strong> Código descartável e regenerável; o patrimônio perpétuo é a especificação formal do domínio."
        },
        "user": {
            "gif": "gifs/slide03_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Requisito Vivo",
            "speech": '"O sistema fala rigorosamente os termos da minha empresa, sem jargão inútil!"',
            "impact": "<strong>Sincronia Imediata:</strong> Regras de negócio viram software em tempo real sem o abismo de mal-entendidos entre negócio e TI."
        }
    },
    4: {
        "dev": {
            "gif": "gifs/slide04_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Provadores SMT (Z3/Dafny)",
            "speech": '"Chega de 500 testes unitários manuais: o Z3 Solver provou matematicamente ausência de bugs!"',
            "impact": "<strong>Certeza Matemática Pré-Execução:</strong> Substituição de testes por amostragem por teoremas formais comprovados no pipeline."
        },
        "user": {
            "gif": "gifs/slide04_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● 99.999% Zero Crash",
            "speech": '"Uptime real e confiável! Nunca mais vi a tela travar bem no meio do fechamento de mês!"',
            "impact": "<strong>Operação Crítica Sem Medo:</strong> Folha de pagamento, estoque e logística rodam com previsibilidade matemática absoluta."
        }
    },
    5: {
        "dev": {
            "gif": "gifs/slide05_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Diff Semântico AST",
            "speech": '"O Git não quebra mais por vírgulas ou prettier: o Diff Semântico só avisa violações de regras!"',
            "impact": "<strong>Code Reviews 10x Mais Rápidos:</strong> Foco exclusivo na intenção e no impacto arquitetural, eliminando o ruído textual de arquivos."
        },
        "user": {
            "gif": "gifs/slide05_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Soberania Decisória",
            "speech": '"Nenhuma IA ou dev altera regras de comissão sem validação no Painel Constitucional!"',
            "impact": "<strong>Controle Soberano das Regras:</strong> As leis basilares da empresa ficam blindadas contra alterações acidentais ou não autorizadas."
        }
    },
    6: {
        "dev": {
            "gif": "gifs/slide06_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Sagas em 4 Fases",
            "speech": '"A API do banco caiu no meio do checkout? O orquestrador reverteu a transação sem deixar órfãos!"',
            "impact": "<strong>Fim dos Scripts de Correção Noturna:</strong> Compensação determinística distribuída que garante consistência eventual sem drama."
        },
        "user": {
            "gif": "gifs/slide06_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Débito e Estoque Consistentes",
            "speech": '"O cliente não foi cobrado duas vezes e a nota fiscal bateu perfeitamente com o envio!"',
            "impact": "<strong>Zero Prejuízo e Zero Atrito no SAC:</strong> Fim das disputas financeiras e devoluções causadas por estados inconsistentes de banco."
        }
    },
    7: {
        "dev": {
            "gif": "gifs/slide07_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Benchmark IDD",
            "speech": '"Chega de promessas de 90% em benchmarks artificiais: agora medimos precisão em ground truth real!"',
            "impact": "<strong>Engenharia Baseada em Fatos:</strong> Validação científica que expõe alucinações e afere precisão semântica com métricas rígidas."
        },
        "user": {
            "gif": "gifs/slide07_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Previsibilidade de Prazo",
            "speech": '"Sabemos com precisão a eficácia do sistema antes de investir tempo e capital na implantação!"',
            "impact": "<strong>Entregas no Prazo e no Orçamento:</strong> Fim do abismo entre o que foi orçado e o que realmente funciona no ambiente real."
        }
    },
    8: {
        "dev": {
            "gif": "gifs/slide08_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Salto Epistêmico",
            "speech": '"Deixei de ser escovador de sintaxe para me tornar Arquiteto de Ontologia e Intenção Humana!"',
            "impact": "<strong>Valorização Profissional Máxima:</strong> A engenharia de software ascende da labuta mecânica para o pensamento conceitual de alto nível."
        },
        "user": {
            "gif": "gifs/slide08_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Alinhamento Histórico",
            "speech": '"Depois de décadas de desencontros, a TI finalmente opera como motor estratégico do negócio!"',
            "impact": "<strong>Linguagem Ubíqua e Parceria Real:</strong> Tecnologia deixa de ser um \'centro de custo incompreensível\' e vira acelerador empresarial."
        }
    },
    9: {
        "dev": {
            "gif": "gifs/slide09_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Comunidade de Rigor",
            "speech": '"Que alívio debater com engenheiros que valorizam compiladores e métodos formais em vez de hype!"',
            "impact": "<strong>Pertencimento a uma Nova Fronteira:</strong> Ecossistema de engenheiros dedicados a padrões industriais sólidos e perenes."
        },
        "user": {
            "gif": "gifs/slide09_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Software Duradouro",
            "speech": '"Nosso sistema corporativo foi feito sobre rocha sólida: não vai quebrar na próxima moda tecnológica!"',
            "impact": "<strong>Proteção do Investimento:</strong> Fim da necessidade de reconstruir sistemas do zero a cada mudança de framework."
        }
    },
    10: {
        "dev": {
            "gif": "gifs/slide10_dev_reaction.gif",
            "tag": "💻 Reação do Desenvolvedor",
            "dot": "● Arquiteto da Mente",
            "speech": '"Em vez de ter medo da IA, agora piloto 100 agentes com rédeas matemáticas e ontologia pura!"',
            "impact": "<strong>Multiplicação de Produtividade com Segurança:</strong> Criação de sistemas industriais complexos com rigor e agilidade incomparáveis."
        },
        "user": {
            "gif": "gifs/slide10_user_reaction.gif",
            "tag": "👤 Reação do Usuário / Negócio",
            "dot": "● Inovação em Dias",
            "speech": '"Minhas ideias inovadoras de produto agora viram sistemas reais em dias, sem risco de quebra!"',
            "impact": "<strong>Competitividade Sem Precedentes:</strong> A corporação lidera o mercado lançando soluções auditadas e robustas em velocidade recorde."
        }
    }
}

CSS_SNIPPET = """
    /* DUAL REACTION SECTION (DEV vs USUÁRIO) - 2 GIFS ANIMADOS */
    .dual-reactions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .reaction-card {
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(12px);
    }

    .reaction-card.dev-card {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(8, 28, 54, 0.88));
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .reaction-card.dev-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #38bdf8, #818cf8);
    }

    .reaction-card.user-card {
      background: linear-gradient(135deg, rgba(6, 26, 22, 0.95), rgba(15, 23, 42, 0.88));
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .reaction-card.user-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #10b981, #f59e0b);
    }

    .reaction-gif-media {
      width: 176px;
      height: 95px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1.5px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
      transition: transform 0.25s ease;
    }
    .reaction-card:hover .reaction-gif-media {
      transform: scale(1.03);
    }

    .reaction-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }

    .reaction-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .reaction-role-tag {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .dev-card .reaction-role-tag {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.45);
    }
    .user-card .reaction-role-tag {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.45);
    }

    .reaction-status-dot {
      font-size: 10.5px;
      color: var(--text-dim);
      font-weight: 600;
    }

    .reaction-speech {
      font-family: var(--font-hand);
      font-size: 15px;
      line-height: 1.22;
      color: #fef08a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    }

    .reaction-impact-text {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.38;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .reaction-impact-text strong {
      color: #fff;
    }
"""

def generate_dual_reaction_html(slide_num):
    data = REACTIONS_DATA[slide_num]
    dev = data["dev"]
    user = data["user"]
    return f"""          <!-- DUAL REACTIONS (DEV vs USUÁRIO) - 2 GIFS ANIMADOS -->
          <div class="dual-reactions-grid">
            <div class="reaction-card dev-card">
              <img src="{dev['gif']}" alt="{dev['tag']}" class="reaction-gif-media" />
              <div class="reaction-body">
                <div class="reaction-top-row">
                  <span class="reaction-role-tag">{dev['tag']}</span>
                  <span class="reaction-status-dot">{dev['dot']}</span>
                </div>
                <div class="reaction-speech">{dev['speech']}</div>
                <div class="reaction-impact-text">{dev['impact']}</div>
              </div>
            </div>

            <div class="reaction-card user-card">
              <img src="{user['gif']}" alt="{user['tag']}" class="reaction-gif-media" />
              <div class="reaction-body">
                <div class="reaction-top-row">
                  <span class="reaction-role-tag">{user['tag']}</span>
                  <span class="reaction-status-dot">{user['dot']}</span>
                </div>
                <div class="reaction-speech">{user['speech']}</div>
                <div class="reaction-impact-text">{user['impact']}</div>
              </div>
            </div>
          </div>"""

def process_file(filepath):
    print(f"Processando arquivo: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Inserir CSS se não estiver presente
    if "/* DUAL REACTION SECTION (DEV vs USUÁRIO) - 2 GIFS ANIMADOS */" not in content:
        content = content.replace("  </style>", f"{CSS_SNIPPET}\n  </style>")

    # Ajustes finos de espaçamento para caber no 1080p sem scroll
    content = content.replace("padding: 24px 30px;", "padding: 18px 26px;")
    content = content.replace("gap: 16px;", "gap: 12px;")
    content = content.replace("font-size: 26px;", "font-size: 24px;")
    content = content.replace("padding: 18px;", "padding: 14px 16px;")

    # 2. Para cada slide (1 a 10), substituir o question-card / humor-card pelo dual-reactions-grid
    # Ou se slide 8 não tinha, inserir antes do footer-banner
    for s_num in range(1, 11):
        dual_html = generate_dual_reaction_html(s_num)
        
        # Localizar bloco do slide
        slide_pattern = re.compile(rf'(<div class="slide(?:\s+active)?"\s+data-slide="{s_num}"\s+data-title="[^"]+">)(.*?)(<!-- SLIDE \d+|\s*</main>)', re.DOTALL)
        match = slide_pattern.search(content)
        if not match:
            print(f"⚠️ Atenção: Slide {s_num} não encontrado!")
            continue
        
        slide_open, slide_body, slide_close = match.groups()

        # Substituir question-card ou humor-card se existir
        if '<div class="dual-reactions-grid">' in slide_body:
            # Já possui, substituir
            new_slide_body = re.sub(r'<!-- DUAL REACTIONS.*?</div>\s*</div>\s*</div>', dual_html, slide_body, flags=re.DOTALL)
        elif '<div class="question-card">' in slide_body:
            new_slide_body = re.sub(r'<div class="question-card">.*?</div>\s*</div>', dual_html, slide_body, flags=re.DOTALL)
        elif '<div class="humor-card">' in slide_body:
            new_slide_body = re.sub(r'<div class="humor-card">.*?</div>\s*</div>', dual_html, slide_body, flags=re.DOTALL)
        else:
            # Inserir antes de <div class="footer-banner">
            new_slide_body = slide_body.replace('<div class="footer-banner">', f"{dual_html}\n\n          <div class=\"footer-banner\">")

        content = content[:match.start()] + slide_open + new_slide_body + slide_close + content[match.end():]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Arquivo atualizado com sucesso: {filepath}")

if __name__ == "__main__":
    process_file(HTML_PATH)
    process_file(SCENE_PATH)
    print("🚀 Todos os arquivos foram atualizados com os 20 GIFs animados e Dual Reactions!")
