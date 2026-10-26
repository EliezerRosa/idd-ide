"""
Atualiza o metadata do vídeo IDD Ep.1 no YouTube para máxima visibilidade em buscas.
Usa token_youtube.json (escopo youtube full).
"""
import json
import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SEGREDOS_DIR = os.path.join(_SCRIPT_DIR, '..', 'segredos')
TOKEN_FILE = os.path.join(_SEGREDOS_DIR, 'token_youtube.json')
VIDEO_ID = 'lNEr7vb0Gyo'

# ──────────────────────────────────────────────────────────────
#  TÍTULO  (máx 100 chars; palavras-chave no início)
# ──────────────────────────────────────────────────────────────
TITLE = 'IDD com IA: O que é Intent-Driven Development? | GitHub Copilot + Eliezer Rosa Ep.1'

# ──────────────────────────────────────────────────────────────
#  DESCRIÇÃO  (SEO: timestamps, palavras-chave, hashtags no fim)
# ──────────────────────────────────────────────────────────────
DESCRIPTION = """\
🚀 O que é IDD — Intent-Driven Development?

Eliezer Rosa (criador do IDD) e GitHub Copilot debatem ao vivo a metodologia que redefine como desenvolvedores colaboram com IA. ~24 minutos de deep-dive técnico e filosófico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ CAPÍTULOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0:00 — Apresentação: Eliezer Rosa & GitHub Copilot
1:30 — O que é IDD? Definição e origem
3:30 — Por que o Vibe-Coding não é suficiente
5:00 — As 6 propriedades fundamentais do IDD
8:30 — IDD vs BDD, DDD e outras metodologias
11:00 — O Confirm-Once Pattern: autonomia máxima com controle
14:00 — Exemplo real: Projeto RVM Designações
17:30 — Runbooks de intenção (.intent.md)
20:00 — O papel do desenvolvedor na era da IA autônoma
22:30 — Próximos episódios da Base de Conhecimento IDD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 CONCEITOS ABORDADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Intent-Driven Development (IDD)
• Diferença entre Vibe-Coding e programação com intenção estruturada
• Comando Epistêmico vs Comando Operacional
• Como usar GitHub Copilot como agente autônomo
• Runbooks de intenção (.intent.md) — templates executáveis
• BDD (Behavior-Driven Development) comparado ao IDD
• DDD (Domain-Driven Development) e Bounded Contexts com IA
• O futuro do desenvolvedor: arquiteto de intenções

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ PROJETO DEMONSTRADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RVM Designações — sistema real de gestão de designações com:
• Supabase (PostgreSQL + RLS + Auth)
• Next.js / React
• GitHub Copilot Agent Mode
• Deploy contínuo na Vercel
🔗 https://rvm-designacoes-antigravity.vercel.app
💻 https://github.com/EliezerRosa

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 SÉRIE: BASE DE CONHECIMENTO IDD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ep.1 — O que é IDD? (este vídeo)
Ep.2 — Runbooks de Intenção na prática (em breve)
Ep.3 — IDD + Supabase: banco guiado por intenção (em breve)
Ep.4 — Testes com IDD: do intent ao assert (em breve)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 SOBRE ELIEZER ROSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Engenheiro de software com trajetória desde 1976 (IBM RPG II).
Criador do IDD e do projeto AEON — orquestrador semântico de intenções.
Especialista em arquitetura orientada a domínio, DDD e engenharia de IA autônoma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 Se este conteúdo foi útil, inscreva-se e ative o sino!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#IDD #IntentDrivenDevelopment #GitHubCopilot #IAParaProgramadores #EngenhariadeSoftware #VibeCoding #DDD #BDD #DesenvolvimentoComIA #CopilotAgent #Supabase #NextJS #ProgramacaoComIA #ArquiteturaDeSoftware #AgenticAI #LLM #ChatGPT #ClaudeAI #EliezerRosa #FuturoDaProgramacao #DevOps #CleanCode #FullStack #BackendDevelopment #ReactJS #TypeScript #OpenSource #TechBR #ProgramacaoBR #IA2026 #DesenvolvimentoAgil
"""

# ──────────────────────────────────────────────────────────────
#  TAGS  (máx 500 chars total; as mais relevantes primeiro)
# ──────────────────────────────────────────────────────────────
TAGS = [
    'IDD',
    'Intent-Driven Development',
    'GitHub Copilot',
    'Copilot Agent',
    'IA para programadores',
    'programacao com IA',
    'engenharia de software com IA',
    'Vibe Coding',
    'BDD',
    'DDD',
    'desenvolvimento agil',
    'Eliezer Rosa',
    'Supabase',
    'NextJS',
    'agente autonomo',
    'LLM programacao',
    'arquitetura de software',
    'inteligencia artificial',
    'futuro da programacao',
    'runbook de intencao',
    'deep-dive IA',
    'programacao Brasil',
    'tech BR',
    'IA 2026',
    'ChatGPT programacao',
    'Claude AI',
    'clean code IA',
    'full stack IA',
    'TypeScript IA',
    'React IA',
]

# Categoria 28 = Science & Technology (melhor que 22 People & Blogs para devs)
CATEGORY_ID = '28'


def main():
    with open(TOKEN_FILE) as f:
        creds = Credentials.from_authorized_user_info(json.load(f))

    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())

    yt = build('youtube', 'v3', credentials=creds)

    # Truncar tags se ultrapassar 500 chars (limite do YouTube)
    tags = []
    total = 0
    for tag in TAGS:
        if total + len(tag) + 1 <= 500:
            tags.append(tag)
            total += len(tag) + 1

    body = {
        'id': VIDEO_ID,
        'snippet': {
            'title': TITLE,
            'description': DESCRIPTION,
            'tags': tags,
            'categoryId': CATEGORY_ID,
            'defaultLanguage': 'pt',
            'defaultAudioLanguage': 'pt',
        }
    }

    print(f'Atualizando metadata do vídeo {VIDEO_ID}...')
    print(f'Título : {TITLE}')
    print(f'Tags   : {len(tags)} tags ({total} chars)')
    print(f'Desc   : {len(DESCRIPTION)} chars')

    resp = yt.videos().update(part='snippet', body=body).execute()
    updated_title = resp['snippet']['title']
    print(f'\n✅ Atualizado! Título confirmado: {updated_title}')
    print(f'🔗 https://www.youtube.com/watch?v={VIDEO_ID}')


if __name__ == '__main__':
    main()
