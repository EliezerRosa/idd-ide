"""
Apresentação: Engenharia de Software com IA Autônoma
Case Study: RVM Designações
Metodologia de Parceria Humano-IA
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from datetime import datetime
import os

def create_methodology_presentation():
    """Cria apresentação sobre metodologia de desenvolvimento com IA Autônoma"""
    
    prs = Presentation()
    prs.slide_width = Inches(13.333)  # 16:9
    prs.slide_height = Inches(7.5)
    
    # Cores do tema
    DARK_BLUE = RGBColor(0x1E, 0x3A, 0x5F)
    ACCENT_GOLD = RGBColor(0xC1, 0x86, 0x26)
    ACCENT_RED = RGBColor(0x6D, 0x17, 0x19)
    ACCENT_GREEN = RGBColor(0x2E, 0x7D, 0x32)
    ACCENT_PURPLE = RGBColor(0x7B, 0x1F, 0xA2)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    LIGHT_GRAY = RGBColor(0xF5, 0xF5, 0xF5)
    GRAY = RGBColor(0x66, 0x66, 0x66)
    
    def add_title_slide(title, subtitle="", bg_color=DARK_BLUE):
        """Adiciona slide de título"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = bg_color
        bg.line.fill.background()
        
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(12.333), Inches(1.5))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(48)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.alignment = PP_ALIGN.CENTER
        
        if subtitle:
            sub_box = slide.shapes.add_textbox(Inches(0.5), Inches(4.2), Inches(12.333), Inches(1))
            tf = sub_box.text_frame
            p = tf.paragraphs[0]
            p.text = subtitle
            p.font.size = Pt(24)
            p.font.color.rgb = ACCENT_GOLD
            p.alignment = PP_ALIGN.CENTER
        
        return slide
    
    def add_content_slide(title, content_items, accent_color=ACCENT_GOLD):
        """Adiciona slide de conteúdo com bullets"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(1.2))
        header.fill.solid()
        header.fill.fore_color.rgb = DARK_BLUE
        header.line.fill.background()
        
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.7))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = WHITE
        
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(1.2), Inches(2), Inches(0.08))
        line.fill.solid()
        line.fill.fore_color.rgb = accent_color
        line.line.fill.background()
        
        content_box = slide.shapes.add_textbox(Inches(0.7), Inches(1.6), Inches(12), Inches(5.5))
        tf = content_box.text_frame
        tf.word_wrap = True
        
        for i, item in enumerate(content_items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            
            if isinstance(item, tuple):
                p.text = f"• {item[0]}"
                p.font.size = Pt(22)
                p.font.bold = True
                p.font.color.rgb = DARK_BLUE
                p.space_after = Pt(6)
                
                for sub in item[1]:
                    p = tf.add_paragraph()
                    p.text = f"    ◦ {sub}"
                    p.font.size = Pt(18)
                    p.font.color.rgb = GRAY
                    p.space_after = Pt(4)
            else:
                p.text = f"• {item}"
                p.font.size = Pt(22)
                p.font.color.rgb = DARK_BLUE
                p.space_after = Pt(10)
        
        return slide
    
    def add_dialogue_slide(title, dialogues, accent_color=ACCENT_PURPLE):
        """Adiciona slide de diálogo Humano-IA"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(1.2))
        header.fill.solid()
        header.fill.fore_color.rgb = DARK_BLUE
        header.line.fill.background()
        
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.7))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = WHITE
        
        y_pos = Inches(1.5)
        for speaker, message, color in dialogues:
            # Speaker label
            box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                Inches(0.3) if speaker == "👤 HUMANO" else Inches(6.5), 
                y_pos, 
                Inches(6.3), 
                Inches(1))
            box.fill.solid()
            box.fill.fore_color.rgb = color
            box.line.fill.background()
            
            tf = box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = speaker
            p.font.size = Pt(14)
            p.font.bold = True
            p.font.color.rgb = WHITE
            
            p = tf.add_paragraph()
            p.text = message
            p.font.size = Pt(16)
            p.font.color.rgb = WHITE
            
            y_pos += Inches(1.2)
        
        return slide
    
    def add_comparison_slide(title, left_title, left_items, right_title, right_items):
        """Adiciona slide comparativo lado a lado"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(1.2))
        header.fill.solid()
        header.fill.fore_color.rgb = DARK_BLUE
        header.line.fill.background()
        
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.7))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = WHITE
        
        # Left column - Human
        left_header = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.5), Inches(5.8), Inches(0.6))
        left_header.fill.solid()
        left_header.fill.fore_color.rgb = ACCENT_GREEN
        left_header.line.fill.background()
        tf = left_header.text_frame
        p = tf.paragraphs[0]
        p.text = left_title
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.alignment = PP_ALIGN.CENTER
        
        left_box = slide.shapes.add_textbox(Inches(0.7), Inches(2.3), Inches(5.5), Inches(4.5))
        tf = left_box.text_frame
        tf.word_wrap = True
        for i, item in enumerate(left_items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"✓ {item}"
            p.font.size = Pt(18)
            p.font.color.rgb = DARK_BLUE
            p.space_after = Pt(8)
        
        # Right column - AI
        right_header = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7), Inches(1.5), Inches(5.8), Inches(0.6))
        right_header.fill.solid()
        right_header.fill.fore_color.rgb = ACCENT_PURPLE
        right_header.line.fill.background()
        tf = right_header.text_frame
        p = tf.paragraphs[0]
        p.text = right_title
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.alignment = PP_ALIGN.CENTER
        
        right_box = slide.shapes.add_textbox(Inches(7.2), Inches(2.3), Inches(5.5), Inches(4.5))
        tf = right_box.text_frame
        tf.word_wrap = True
        for i, item in enumerate(right_items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"⚡ {item}"
            p.font.size = Pt(18)
            p.font.color.rgb = DARK_BLUE
            p.space_after = Pt(8)
        
        return slide
    
    def add_stats_boxes(title, stats):
        """Adiciona slide com caixas de estatísticas"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(1.2))
        header.fill.solid()
        header.fill.fore_color.rgb = DARK_BLUE
        header.line.fill.background()
        
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.7))
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = WHITE
        
        box_width = 2.8
        box_height = 2.2
        start_x = 0.5
        
        for i, (number, label, color) in enumerate(stats):
            left = Inches(start_x + (i * (box_width + 0.2)))
            box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.2), Inches(box_width), Inches(box_height))
            box.fill.solid()
            box.fill.fore_color.rgb = color
            box.line.fill.background()
            
            tf = box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = number
            p.font.size = Pt(42)
            p.font.bold = True
            p.font.color.rgb = WHITE
            p.alignment = PP_ALIGN.CENTER
            
            p = tf.add_paragraph()
            p.text = label
            p.font.size = Pt(16)
            p.font.color.rgb = LIGHT_GRAY
            p.alignment = PP_ALIGN.CENTER
        
        return slide
    
    # ========================================
    # CRIAR SLIDES
    # ========================================
    
    # 1. TÍTULO
    add_title_slide(
        "Engenharia de Software\ncom IA Autônoma",
        "Metodologia de Parceria Humano-IA | Case Study: RVM Designações"
    )
    
    # 2. CONTEXTO
    add_content_slide("📋 O Desafio", [
        "Desenvolver sistema completo de gerenciamento de designações",
        "Funcionalidades: CRUD, regras de elegibilidade, rotação justa, IA conversacional",
        "Tecnologias: React, TypeScript, FastAPI, Supabase, Gemini API",
        "Prazo: Desenvolvimento iterativo ao longo de várias sessões",
        "Diferencial: Humano NÃO escreve código diretamente",
    ], ACCENT_RED)
    
    # 3. PARADIGMA TRADICIONAL vs NOVO
    add_comparison_slide(
        "🔄 Mudança de Paradigma",
        "👤 Desenvolvimento Tradicional",
        [
            "Humano escreve todo o código",
            "Humano faz debugging manual",
            "Humano pesquisa documentação",
            "Humano implementa testes",
            "Humano faz refatorações",
            "IA sugere snippets isolados",
        ],
        "🤖 Desenvolvimento com IA Autônoma",
        [
            "Humano define requisitos e visão",
            "IA escreve, testa e corrige código",
            "IA pesquisa e implementa soluções",
            "IA cria testes automaticamente",
            "IA refatora proativamente",
            "Humano valida e direciona",
        ]
    )
    
    # 4. MODELO DE PARCERIA
    add_title_slide(
        "Modelo Clawbot/Antigravity",
        "IA como Desenvolvedor Autônomo | Humano como Arquiteto",
        ACCENT_PURPLE
    )
    
    # 5. PAPÉIS DEFINIDOS
    add_comparison_slide(
        "🎭 Divisão de Papéis",
        "👤 HUMANO (Product Owner/Arquiteto)",
        [
            "Define conceito e objetivos do app",
            "Especifica modelo de dados",
            "Descreve funcionalidades desejadas",
            "Esboça intenção da UI",
            "Valida resultados",
            "Redireciona quando necessário",
            "NÃO toca no código",
        ],
        "🤖 IA (Desenvolvedor Autônomo)",
        [
            "Pesquisa e analisa codebase",
            "Implementa funcionalidades",
            "Corrige bugs proativamente",
            "Refatora código sem pedir",
            "Cria documentação técnica",
            "Executa e valida testes",
            "Sugere melhorias",
        ]
    )
    
    # 6. EXEMPLO DE DIÁLOGO 1
    add_dialogue_slide(
        "💬 Exemplo: Definindo uma Feature",
        [
            ("👤 HUMANO", '"Preciso de um sistema de rotação justa\nque priorize quem não participou recentemente"', ACCENT_GREEN),
            ("🤖 ANTIGRAVITY", '"Vou implementar uma fórmula exponencial:\nScore = Base + (Semanas^1.5 × Fator) - Penalidade\nIsso prioriza participantes negligenciados"', ACCENT_PURPLE),
            ("👤 HUMANO", '"Perfeito. Adicione bônus para irmãs em demos"', ACCENT_GREEN),
            ("🤖 ANTIGRAVITY", '"Implementado: +25 pts para irmãs.\nCódigo em unifiedRotationService.ts (289 linhas)"', ACCENT_PURPLE),
        ]
    )
    
    # 7. EXEMPLO DE DIÁLOGO 2
    add_dialogue_slide(
        "💬 Exemplo: Correção de Bug",
        [
            ("👤 HUMANO", '"Os ajudantes não estão aparecendo no S-140"', ACCENT_GREEN),
            ("🤖 ANTIGRAVITY", '"Analisando... Encontrei: função mapLinesToParts\nnão está mapeando titular→ajudante.\nCorrigindo em 3 arquivos..."', ACCENT_PURPLE),
            ("🤖 ANTIGRAVITY", '"Corrigido! Agora busca ajudante pelo título\nda parte + busca sequencial por seção.\nTestei: ajudantes aparecem corretamente."', ACCENT_PURPLE),
            ("👤 HUMANO", '"Ótimo! Faça deploy."', ACCENT_GREEN),
        ]
    )
    
    # 8. EXEMPLO DE DIÁLOGO 3
    add_dialogue_slide(
        "💬 Exemplo: Análise Técnica",
        [
            ("👤 HUMANO", '"Faça uma análise profunda do agente IA"', ACCENT_GREEN),
            ("🤖 ANTIGRAVITY", '"Analisando 5 arquivos core:\n- agentService.ts (560 linhas)\n- contextBuilder.ts (802 linhas)\n- eligibilityService.ts (677 linhas)..."', ACCENT_PURPLE),
            ("🤖 ANTIGRAVITY", '"Documentação completa criada em\nwalkthrough.md com diagramas Mermaid,\ntabelas de funções e fluxos de dados."', ACCENT_PURPLE),
            ("👤 HUMANO", '"Gere um PowerPoint disso"', ACCENT_GREEN),
        ]
    )
    
    # 9. FLUXO DE TRABALHO
    add_content_slide("🔁 Fluxo de Trabalho Típico", [
        ("1. Requisição do Humano", [
            "Descrição em linguagem natural",
            "Conceito, não implementação",
        ]),
        ("2. Análise da IA", [
            "Pesquisa no codebase existente",
            "Identifica arquivos e dependências",
        ]),
        ("3. Implementação Autônoma", [
            "Escreve código, cria arquivos",
            "Executa comandos, testa",
        ]),
        ("4. Validação", [
            "Humano revisa resultado",
            "Redireciona se necessário",
        ]),
    ], ACCENT_GOLD)
    
    # 10. COMPORTAMENTO CLAWBOT
    add_content_slide("🤖 Comportamento Tipo Clawbot/Antigravity", [
        ("Proatividade", [
            "Antecipa próximos passos",
            "Sugere melhorias sem pedir",
            "Cria documentação automaticamente",
        ]),
        ("Autonomia", [
            "Toma decisões técnicas sozinho",
            "Escolhe bibliotecas e padrões",
            "Refatora código quando necessário",
        ]),
        ("Transparência", [
            "Explica todas as decisões",
            "Mostra arquivos modificados",
            "Reporta erros e soluções",
        ]),
    ], ACCENT_PURPLE)
    
    # 11. O QUE O HUMANO NÃO FAZ
    add_content_slide("🚫 O Que o Humano NÃO Faz", [
        "NÃO escreve código diretamente",
        "NÃO faz debugging linha por linha",
        "NÃO pesquisa documentação de APIs",
        "NÃO configura ferramentas manualmente",
        "NÃO copia código de Stack Overflow",
        "NÃO memoriza sintaxe de linguagens",
        "NÃO faz commit/push manual (IA pode fazer)",
    ], ACCENT_RED)
    
    # 12. O QUE O HUMANO FAZ
    add_content_slide("✅ O Que o Humano FAZ", [
        "DEFINE visão e objetivos do produto",
        "ESPECIFICA modelo de dados conceitual",
        "DESCREVE funcionalidades em alto nível",
        "ESBOÇA intenção da interface",
        "VALIDA se o resultado atende expectativas",
        "REDIRECIONA quando IA entende errado",
        "PRIORIZA features e próximos passos",
    ], ACCENT_GREEN)
    
    # 13. ESTATÍSTICAS DO PROJETO
    add_stats_boxes("📊 RVM Designações - Números", [
        ("~6.800", "Linhas de Código\n(escritas pela IA)", ACCENT_PURPLE),
        ("30+", "Arquivos\nCriados", DARK_BLUE),
        ("0", "Linhas Escritas\npelo Humano", ACCENT_GREEN),
        ("50+", "Conversas\nde Colaboração", ACCENT_GOLD),
    ])
    
    # 14. BENEFÍCIOS
    add_content_slide("💡 Benefícios da Metodologia", [
        ("Para o Humano", [
            "Foco em visão e estratégia",
            "Não precisa dominar todas as tecnologias",
            "Desenvolvimento mais rápido",
            "Menos frustração com bugs",
        ]),
        ("Para o Projeto", [
            "Código consistente e documentado",
            "Padrões aplicados uniformemente",
            "Testes e validações automáticos",
            "Histórico de decisões preservado",
        ]),
    ], ACCENT_GREEN)
    
    # 15. DESAFIOS
    add_content_slide("⚠️ Desafios e Mitigações", [
        ("Comunicação clara", [
            "Descrever intenção, não implementação",
            "Usar exemplos quando possível",
        ]),
        ("Validação de resultados", [
            "Testar funcionalidades manualmente",
            "Verificar se atende o esperado",
        ]),
        ("Confiança no agente", [
            "Entender que IA pode errar",
            "Manter capacidade de redirecionar",
        ]),
    ], ACCENT_RED)
    
    # 16. FERRAMENTAS DO ECOSSISTEMA
    add_content_slide("🛠️ Ecossistema de IA para Desenvolvimento", [
        ("Antigravity (Google DeepMind)", [
            "Agente autônomo integrado ao IDE",
            "Executa comandos, edita arquivos",
            "Navegador integrado para testes",
        ]),
        ("Clawbot / Moltbot / OpenClaw", [
            "Modelos open-source similares",
            "Foco em autonomia e proatividade",
        ]),
        ("GitHub Copilot / Cursor", [
            "Assistência ao código (menos autônomo)",
            "Bom para sugestões inline",
        ]),
    ], DARK_BLUE)
    
    # 17. APLICAÇÃO PRÁTICA
    add_content_slide("🎯 Aplicação no RVM Designações", [
        ("Sistema Real em Produção", [
            "Gerencia designações de reuniões",
            "Usado por comunidade religiosa",
            "https://EliezerRosa.github.io/RVM-Designacoes-Antigravity",
        ]),
        ("Stack Completo", [
            "Frontend: React + TypeScript + Vite",
            "Backend: FastAPI + Python",
            "Database: Supabase (PostgreSQL)",
            "IA: Google Gemini API",
        ]),
    ], ACCENT_GOLD)
    
    # 18. LIÇÕES APRENDIDAS
    add_content_slide("📚 Lições Aprendidas", [
        "Quanto mais clara a intenção, melhor o resultado",
        "IA é excelente em tarefas repetitivas e padronizadas",
        "Humano ainda é essencial para visão e validação",
        "Debugging colaborativo é mais eficiente",
        "Documentação gerada automaticamente é valiosa",
        "Confiança se constrói iterativamente",
    ], ACCENT_PURPLE)
    
    # 19. FUTURO
    add_content_slide("🔮 O Futuro do Desenvolvimento", [
        ("Curto Prazo (2024-2025)", [
            "IAs mais autônomas e confiáveis",
            "Integração nativa com IDEs",
        ]),
        ("Médio Prazo (2026-2028)", [
            "Projetos completos gerados por IA",
            "Humanos como arquitetos/revisores",
        ]),
        ("Longo Prazo (2030+)", [
            "Desenvolvimento zero-code com IA",
            "Humano define apenas intenção",
        ]),
    ], DARK_BLUE)
    
    # 20. CONCLUSÃO
    add_title_slide(
        "Conclusão",
        "O futuro do desenvolvimento é colaborativo:\nHumanos definem O QUE | IAs implementam COMO",
        ACCENT_GREEN
    )
    
    # 21. OBRIGADO
    add_title_slide(
        "Obrigado!",
        f"Engenharia de Software com IA Autônoma\n{datetime.now().strftime('%d/%m/%Y')}\n\n💻 github.com/EliezerRosa/RVM-Designacoes-Antigravity"
    )
    
    # Salvar
    output_path = os.path.join(os.path.dirname(__file__), "Metodologia_IA_Autonoma.pptx")
    prs.save(output_path)
    print(f"✅ Apresentação criada: {output_path}")
    return output_path


if __name__ == "__main__":
    create_methodology_presentation()
