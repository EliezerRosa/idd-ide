#!/usr/bin/env python3
"""
create_idd_p3_video.py — Vídeo deep-dive bilíngue (PT-BR + EN)
"IDD Ep03: A Genealogia do IDD — Das Raízes ao Paradigma"

Layout TELÃO: cada entrada do roteiro exibe um slide de conferência
(título + conteúdo em destaque) no centro da tela, com barra de
apresentador e legenda na parte inferior.

Estrutura do roteiro — 3 falas por slide:
  1. IA (lê/apresenta o slide)
  2. Eliezer (raciocina e aprofunda)
  3. IA (comenta e faz transição)

Pipeline:
  Fase 1  → Roteiro (Gemini 2.5 Pro, ~150 diálogos, ~20 min)
  Fase 2  → Avatares (reutiliza do Ep02 ou gera via Imagen 4)
  Fase 3  → Áudio TTS (Gemini 2.5 Flash TTS, vozes Charon/Kore)
  Fase 4  → Slides PNG (PIL, layout TELÃO HD 1920×1080)
  Fase 5  → Vídeo final (ffmpeg concat imagens + áudio)

Uso:
    python create_idd_p3_video.py                    # tudo
    python create_idd_p3_video.py --phase script     # só roteiro
    python create_idd_p3_video.py --phase mockups    # 3 mockups do layout
    python create_idd_p3_video.py --phase avatars    # só avatares
    python create_idd_p3_video.py --phase audio      # só TTS
    python create_idd_p3_video.py --phase slides     # só slides
    python create_idd_p3_video.py --phase video      # só montagem final
"""

import os, sys, json, struct, wave, time, subprocess, re, argparse
from pathlib import Path
from typing import Optional

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent
_ACERVO     = BASE_DIR.parent / ".." / "04 - Acervo de Episódios"
OUT_DIR     = (_ACERVO / "Ep03 - A Genealogia" / "idd_p3_output").resolve()
SCRIPT_FILE = OUT_DIR / "script.json"
AUDIO_DIR   = OUT_DIR / "audio"
SLIDES_DIR  = OUT_DIR / "slides"
AVATAR_DIR  = OUT_DIR / "avatars"
SEG_DIR     = OUT_DIR / "segments"
MOCK_DIR    = OUT_DIR / "mockups"

for d in [OUT_DIR, AUDIO_DIR, SLIDES_DIR, AVATAR_DIR, SEG_DIR, MOCK_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── ENV ──────────────────────────────────────────────────────────────────────
def _load_env():
    d = BASE_DIR
    for _ in range(5):
        env_file = d / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.partition("=")
                    os.environ[k.strip()] = v.strip()
            return
        d = d.parent

_load_env()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    sys.exit("❌ GEMINI_API_KEY não encontrada no .env")

# ─── GEMINI CLIENT ────────────────────────────────────────────────────────────
from google import genai
from google.genai import types as gt

_client: Optional[genai.Client] = None

def client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

# ─── MODELS ───────────────────────────────────────────────────────────────────
MODEL_TEXT          = "gemini-2.5-pro"
MODEL_TEXT_FALLBACK = "gemini-2.5-flash"
MODEL_TEXT_EXTRAS   = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
MODEL_TTS_FLASH     = "gemini-2.5-flash-preview-tts"
MODEL_TTS_PRO       = "gemini-2.5-pro-preview-tts"
MODEL_TTS_FALLBACK  = "gemini-2.5-flash-preview-tts"
MODEL_IMAGEN        = "imagen-4.0-generate-001"

# ── Vozes Gemini TTS (nomes nativos do Gemini — NÃO são vozes Edge TTS) ──────
VOICE_ELIEZER = "Charon"   # grave, autoritativo, caloroso — excelente PT-BR
VOICE_IA      = "Kore"     # claro, preciso, articulado — ótimo voz feminina PT-BR

# ─── VISUAL CONFIG ────────────────────────────────────────────────────────────
VIDEO_W, VIDEO_H = 1920, 1080

BG_TOP       = (7, 11, 22)
BG_BOTTOM    = (4, 8, 16)
SCREEN_BG    = (10, 17, 34)
SCREEN_BORDER= (30, 55, 100)
COL_ELIEZER  = (245, 166, 35)    # gold
COL_IA       = (0, 212, 255)     # cyan
TEXT_WHITE   = (255, 255, 255)
TEXT_BRIGHT  = (230, 240, 255)
TEXT_GRAY    = (160, 175, 200)
TEXT_SUBTT   = (120, 150, 185)
TEXT_DIMMED  = (80, 100, 130)

WIN_FONTS    = Path("C:/Windows/Fonts")

# Layout TELÃO
SCREEN_X     = 70
SCREEN_Y     = 55
SCREEN_W     = VIDEO_W - SCREEN_X * 2   # 1780
SCREEN_H     = 675
SCREEN_R     = 18

POSES_ELIEZER = ["idle", "talking", "listening"]
POSES_IA      = ["idle", "talking", "listening"]


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 1 — ROTEIRO
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_PROMPT = """\
Você é roteirista de podcast educativo de altíssima qualidade em pt-BR.
Crie o roteiro COMPLETO de ~20 minutos para um podcast/talk-show com dois
apresentadores:

• ELIEZER ROSA — criador do paradigma IDD (Intent-Driven Development).
  Arquiteto de software com décadas de experiência. Começou no IBM Brasil
  em 1976 com RPG II. Trabalhou com Cobol, DCAlgol, sistemas UNISYS.
  Arquitetou 2PC customizado no Grupo Paes Mendonça (mecanismo próprio de
  Rollback e Forward em missão crítica online, tempo real). Pesquisas e
  palestras sobre OO e IA em UFBA, Telemar, anos 90. Hoje criador do
  paradigma IDD (Intent-Driven Development) e do projeto AEON.
  Tom: reflexivo, apaixonado, sábio, histórias reais, detalhes técnicos.

• IA — GitHub Copilot, a inteligência artificial parceira de Eliezer.
  Fala com clareza e precisão. Apresenta cada slide de forma envolvente.
  Faz perguntas perspicazes. Às vezes discorda gentilmente com humor.
  Tom: curioso, articulado, entusiasmado com ideias.

═══ TEMA DO EPISÓDIO ═══════════════════════════════════════════════════
  "A Genealogia do IDD"
  Episódio 3 da série: Base de Conhecimento IDD
  Subtítulo: "Das raízes pioneiras ao paradigma intencional"
═══════════════════════════════════════════════════════════════════════

ESTRUTURA OBRIGATÓRIA — 3 FALAS POR SLIDE:
Para cada slide (identificado por slide_number), use EXATAMENTE 3 entradas:
  1. IA: apresenta/lê o slide — DEVE conter "slide_title" e "slide_content"
  2. Eliezer: raciocina, conecta com experiência pessoal real, aprofunda
  3. IA: comenta, sintetiza, faz transição para o próximo slide

SLIDES OBRIGATÓRIOS (35 slides — gere falas criativas para cada um):

slide 1:  title="A Genealogia do IDD"
          content="De onde vêm as ideias que moldam um paradigma?\\nCada inovação se apoia em ombros de gigantes.\\nHoje rastreamos a linhagem intelectual do IDD."

slide 2:  title="Genealogia Intelectual"
          content="Ideias não nascem do nada — elas evoluem.\\nUm paradigma é uma rede de influências.\\nEntender a genealogia é entender o 'porquê' profundo."

slide 3:  title="Vannevar Bush — 1945"
          content="Artigo 'As We May Think' — Atlantic Monthly\\nMemex: dispositivo de memória externa associativa\\nO pensamento humano opera por associação\\nBase conceitual para hipertexto e Web"

slide 4:  title="O Princípio da Associação"
          content="'O cérebro humano opera por associação.\\nCom um item em mãos, ele salta para o próximo.'\\n— Vannevar Bush, 1945\\nLegado: links, hipertexto, semântica associativa"

slide 5:  title="J.C.R. Licklider — 1960"
          content="'Man-Computer Symbiosis'\\nSimbiose: humano + máquina pensando juntos\\nVisão: computadores amplificam, não substituem\\nLegado direto: ARPANET → Internet"

slide 6:  title="Norbert Wiener — Cibernética (1948)"
          content="Feedback loops: o sistema observa seu próprio output\\nCibernética: controle e comunicação em sistemas\\nBaseou toda teoria de controle e automação\\nInfluência: sistemas auto-reguláveis → IDD invariants"

slide 7:  title="Douglas Engelbart — 1962"
          content="'Augmenting Human Intellect' — SRI\\nAumentar, não automatizar: esta é a distinção\\nMouse, janelas, hipertexto: ferramentas cognitivas\\nBase filosófica direta do IDD"

slide 8:  title="The Mother of All Demos — 1968"
          content="NLS: primeiro sistema com mouse + hipertexto + vídeo\\nEngelbart demonstrou tudo em 90 minutos\\n'O futuro' ao vivo, 50 anos antes do tempo\\nAugmenting em ação: humano sempre no centro"

slide 9:  title="Ivan Sutherland — Sketchpad (1963)"
          content="Primeira interface gráfica interativa\\nConstraints: 'esta linha SEMPRE deve ser horizontal'\\nO sistema mantém propriedades declaradas\\nAncestral direto dos invariantes do IDD"

slide 10: title="Constraints: Declarar, Não Programar"
          content="Você declara a PROPRIEDADE desejada\\nO sistema cuida da implementação\\nNão é 'como fazer' — é 'o que deve ser'\\nDNA direto dos invariantes de negócio do IDD"

slide 11: title="Alan Kay — Dynabook (1968–72)"
          content="O computador como instrumento pessoal\\n'Um computador para crianças de todas as idades'\\nMetáfora: computador como livro vivo e interativo\\nAntecipou o iPad 40 anos antes"

slide 12: title="Smalltalk — Objetos e Mensagens"
          content="Objetos como seres autônomos que trocam mensagens\\n'Nunca pensei em variáveis — pensei em mensagens'\\nHerança que a indústria distorceu em Java/C++\\nIDD herda: componentes com intenção própria"

slide 13: title="Amplificar, Não Substituir"
          content="'O computador deve amplificar o que o humano faz,\\nnão substituí-lo.' — Alan Kay\\nDistinção preservada como princípio central do IDD\\nCada ferramenta que substitui empobrece o humano"

slide 14: title="Fred Brooks — The Mythical Man-Month (1975)"
          content="Complexidade essencial vs. acidental\\n9 mulheres não fazem um bebê em 1 mês\\nSoftware tem complexidade irredutível\\nLição: respeitar a natureza do problema"

slide 15: title="Integridade Conceitual — Brooks"
          content="'É melhor um sistema ter menos funcionalidades\\nmas com consistência do que muitas inconsistentes.'\\nO arquiteto único como guardião da visão\\nNo IDD: o epistêmico permanece no humano"

slide 16: title="No Silver Bullet — Brooks (1986)"
          content="Nenhuma técnica elimina a complexidade essencial\\nComplexidade acidental: pode ser reduzida (IDD faz isso)\\nComplexidade essencial: é o domínio em si\\nO IDD ataca o acidental, respeita o essencial"

slide 17: title="Jakob Nielsen — Heurísticas de Usabilidade"
          content="10 princípios para sistemas usáveis (1993)\\nO sistema deve falar a língua do usuário\\nVisibilidade do estado do sistema\\nLegado: intenção do usuário como centro do design"

slide 18: title="Jef Raskin — The Humane Interface (2000)"
          content="'O sistema deve servir à intenção do usuário.'\\nIntenção como unidade mínima de interação\\nNão fluxos de telas — objetivos a alcançar\\nDNA direto do IDD: intenção como artefato"

slide 19: title="Tim Berners-Lee — World Wide Web (1989)"
          content="Hipertexto universal: qualquer doc linka qualquer doc\\nPublicação de intenção: o autor decide a semântica\\nDescentralização: sem autoridade central de significado\\nPrimeiro sistema de intenção em escala global"

slide 20: title="Web Semântica — Berners-Lee (2001)"
          content="'Máquinas entendendo o significado do conteúdo'\\nOWL, RDF: ontologias formais na Web\\nAgentes que inferem, não apenas recuperam\\nAncestral da camada semântica do IDD"

slide 21: title="Tom Gruber — Ontologias (1992+)"
          content="'Uma ontologia é uma especificação explícita\\nde uma conceitualização.' — Gruber, 1993\\nConhecimento explícito, auditável, compartilhável\\nInfluência direta na base de conhecimento do IDD"

slide 22: title="Christopher Alexander — Pattern Language"
          content="Padrões: soluções que emergem do contexto (1977)\\nNão receitas — forças em equilíbrio dinâmico\\nDesign como documentação de intenção estrutural\\nInfluência em Design Patterns, DDD e IDD"

slide 23: title="O Elo Perdido: Intenção como Artefato"
          content="Bush → associação | Licklider → simbiose\\nEngelbart → augmenting | Sutherland → constraints\\nKay → mensagens | Brooks → integridade conceitual\\nTodos apontavam para o mesmo destino: a INTENÇÃO"

slide 24: title="A Grande Convergência"
          content="Todos os pioneiros separaram 'o quê' do 'como'\\nDeclarar o objetivo é mais duradouro que implementar\\nA implementação envelhece; a intenção permanece\\nIDD: intenção como artefato de primeira classe"

slide 25: title="A Crise de Complexidade (2000–2020)"
          content="Frameworks empilhados sobre frameworks\\nO dev mediano gasta 70% do tempo em acidental complexity\\nDocumentação desatualizada nasce morta\\nA intenção original perdida no código"

slide 26: title="LLMs: O Catalisador que Faltava"
          content="GPT-3 (2020): linguagem natural como interface\\nPela primeira vez: a máquina entende intenção\\nO sonho de Engelbart, Bush e Licklider possível\\nIDD: aproveitou essa janela histórica"

slide 27: title="A Virada Semântica (2020–2025)"
          content="Modelos que raciocinam em linguagem natural\\nCode generation: o operacional delegável\\nEmbeddings: semântica vira vetor matemático\\nPeça final do quebra-cabeça que o IDD precisava"

slide 28: title="IDD: Nó de Convergência"
          content="Bush (associação) + Engelbart (augmenting)\\n+ Sutherland (constraints) + Brooks (integridade)\\n+ Berners-Lee (semântica) + Gruber (ontologias)\\n+ LLMs (execução natural) = IDD"

slide 29: title="Eliezer Rosa: O Fio Condutor"
          content="IBM 1976 → UNISYS 2PC → OO/IA UFBA anos 90\\nViu os pioneiros antes de conhecê-los por nome\\nA genealogia confirmou o que a prática ensinou\\n'Eu não inventei — eu reconheci o padrão'"

slide 30: title="IDD ≠ Prompt Engineering"
          content="Prompt Engineering: instrução ad hoc, descartável\\nIDD: intenção como artefato versionado e auditável\\nDiferença: permanência, rastreabilidade, governança\\nÉ a diferença entre código e comentário de código"

slide 31: title="Invariantes: A Constituição do Sistema"
          content="Herdado de Sutherland (constraints) e Brooks\\nInvariante: propriedade que o sistema NUNCA viola\\nEx: 'o status de pedido nunca regride'\\nO agente executa; o invariante governa"

slide 32: title="Runbooks .intent.md"
          content="Intenção + invariantes em linguagem natural estruturada\\nO humano define o epistêmico; o agente, o operacional\\nConfirm-once: um 'go', agente executa até o fim\\nTrace auditável: o epistêmico permanece verificável"

slide 33: title="Projeto AEON"
          content="Orquestrador semântico que materializa o IDD\\nTraduz intenções em arquiteturas executáveis\\nMulti-agent: cada agente com responsabilidade clara\\n'A visão de Engelbart executada por LLMs'"

slide 34: title="A Responsabilidade do Engenheiro"
          content="Quem conhece a genealogia tem responsabilidade\\nNão basta usar LLMs — é preciso entender o porquê\\nA genealogia é a bússola ética e técnica\\nAugmenting: responsabilidade de manter o epistêmico"

slide 35: title="A Missão Continua"
          content="De Bush (1945) a IDD (2024): 79 anos de linhagem\\nCada paradigma preparou o terreno para o próximo\\nO IDD não é o fim — é o próximo ombro de gigante\\nAnúncio: Ep04 — Runbooks: quando a intenção vira código"

ESTILO:
- Diálogo NATURAL — sem frases genéricas, sem clichês motivacionais.
- A IA apresenta cada slide com entusiasmo genuíno, como um co-host engajado.
- Eliezer conecta cada pioneiro com experiências reais da sua carreira.
- Inclua momentos de humor sutil: "Isso é... surpreendentemente familiar para
  alguém que programou em RPG II nos anos 70."
- Cada fala: 1 a 4 frases naturais (não monólogos longos).
- Às vezes 4 falas no mesmo slide está OK — contanto que slide_number seja
  consistente e o total fique entre 140 e 160 entradas.

FORMATO DE SAÍDA — JSON puro (APENAS o array, sem markdown):
[
  {
    "id": 1,
    "slide_number": 1,
    "speaker": "IA",
    "pt": "Fala em português brasileiro natural.",
    "en": "Natural English translation.",
    "note": "tom ou emoção",
    "slide_title": "Título do Slide (<=60 chars)",
    "slide_content": "Linha 1\\nLinha 2\\nLinha 3\\nLinha 4 (max 4 linhas)"
  },
  {
    "id": 2,
    "slide_number": 1,
    "speaker": "Eliezer",
    "pt": "...",
    "en": "...",
    "note": "..."
  },
  {
    "id": 3,
    "slide_number": 1,
    "speaker": "IA",
    "pt": "...",
    "en": "...",
    "note": "..."
  },
  {
    "id": 4,
    "slide_number": 2,
    "speaker": "IA",
    "pt": "...",
    "en": "...",
    "note": "...",
    "slide_title": "...",
    "slide_content": "..."
  },
  ...
]

REGRAS OBRIGATÓRIAS:
- Total: ENTRE 140 e 160 entradas (CRÍTICO — verifique antes de finalizar).
- Retorne APENAS o JSON: começa com [ e termina com ].
- Entry 1 de cada slide_number: speaker="IA", inclui slide_title e slide_content.
- Entry 2: speaker="Eliezer". Entry 3: speaker="IA".
- Nunca coloque slide_title/slide_content nos entries 2+ do mesmo slide.
- Use todos os 35 slides acima na ordem apresentada.
- Distribua uniformemente — não acelere no final.
- Termine com encerramento inspirador (slide 35).
"""


def generate_script() -> list[dict]:
    if SCRIPT_FILE.exists():
        try:
            data = json.loads(SCRIPT_FILE.read_text(encoding="utf-8"))
            if data and "slide_number" in data[0]:
                print(f"✓ Roteiro em cache (formato telão): {len(data)} linhas")
                return data
            else:
                print("⚠ Roteiro sem formato telão — regerando com slide_number…")
                SCRIPT_FILE.unlink()
        except Exception:
            SCRIPT_FILE.unlink()

    print("📝 Gerando roteiro com Gemini (30–120s)…")
    for _text_model in [MODEL_TEXT, MODEL_TEXT_FALLBACK] + MODEL_TEXT_EXTRAS:
        try:
            resp = client().models.generate_content(
                model=_text_model,
                contents=SCRIPT_PROMPT,
                config=gt.GenerateContentConfig(temperature=0.90, max_output_tokens=65536),
            )
            print(f"  Modelo texto: {_text_model}")
            break
        except Exception as _e:
            err_str = str(_e)
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "503" in err_str or "UNAVAILABLE" in err_str:
                print(f"  ⚠ {_text_model} indisponível ({_e.__class__.__name__}) → tentando próximo…")
                continue
            raise
    else:
        raise RuntimeError("Todos os modelos de texto falharam. Verifique quota e conectividade.")
    raw = resp.text.strip()
    raw = re.sub(r"^```[a-z]*\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        script = json.loads(raw)
    except json.JSONDecodeError:
        last_close = raw.rfind("}")
        if last_close > 0:
            cleaned = raw[:last_close + 1].rstrip().rstrip(",") + "\n]"
            bracket = cleaned.find("[")
            if bracket >= 0:
                cleaned = cleaned[bracket:]
            try:
                script = json.loads(cleaned)
                print(f"  ⚠ JSON truncado, recuperado: {len(script)} linhas")
            except json.JSONDecodeError as e2:
                raise RuntimeError(f"JSON parse falhou: {e2}\nRaw[:400]: {raw[:400]}")
        else:
            raise RuntimeError(f"Resposta inválida. Raw[:400]: {raw[:400]}")

    SCRIPT_FILE.write_text(json.dumps(script, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Roteiro gerado: {len(script)} linhas → {SCRIPT_FILE}")
    return script


def _build_slide_data(script: list[dict]) -> dict[int, dict]:
    """Extrai slide_title e slide_content do primeiro entry de cada slide_number."""
    data: dict[int, dict] = {}
    for entry in script:
        sn = entry.get("slide_number", entry["id"])
        if sn not in data and "slide_title" in entry:
            data[sn] = {
                "title": entry["slide_title"],
                "content": entry.get("slide_content", ""),
            }
    return data


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 2 — AVATARES (reutiliza do Ep02)
# ═══════════════════════════════════════════════════════════════════════════════

def _pil_fallback_fullbody(out_path: Path, label: str, is_human: bool):
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGBA", (420, 560), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    color = (180, 130, 30) if is_human else (0, 160, 200)
    d.ellipse([130, 20, 290, 180], fill=color)
    d.rectangle([150, 180, 270, 400], fill=color)
    d.rectangle([150, 400, 200, 540], fill=color)
    d.rectangle([220, 400, 270, 540], fill=color)
    try:
        fnt = ImageFont.truetype(str(WIN_FONTS / "arial.ttf"), 20)
    except Exception:
        fnt = ImageFont.load_default()
    d.text((210, 555), label[:20], fill=(200, 200, 200), font=fnt, anchor="mb")
    img.save(out_path)


def _pil_fallback_background(out_path: Path):
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (VIDEO_W, VIDEO_H), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(VIDEO_H):
        t = y / VIDEO_H
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        d.line([(0, y), (VIDEO_W, y)], fill=(r, g, b))
    img.save(out_path)


def prepare_avatars() -> dict:
    """Reutiliza avatares do Ep02 se disponíveis; caso contrário usa fallback PIL."""
    import shutil
    avatars: dict = {}
    ep2_dir = (_ACERVO / "Ep02 - Comando Epistêmico" / "idd_p2_output" / "avatars").resolve()

    for pose in POSES_ELIEZER:
        dst = AVATAR_DIR / f"eliezer_{pose}.png"
        if not dst.exists():
            src = ep2_dir / f"eliezer_{pose}.png"
            if src.exists():
                shutil.copy2(src, dst)
                print(f"  ✓ Eliezer {pose} reutilizado do Ep02")
            else:
                _pil_fallback_fullbody(dst, f"Eliezer {pose}", True)
                print(f"  ✓ Eliezer {pose} gerado (PIL fallback)")
        else:
            print(f"  ✓ Eliezer {pose} em cache")
        avatars[f"eliezer_{pose}"] = dst

    for pose in POSES_IA:
        dst = AVATAR_DIR / f"ia_{pose}.png"
        if not dst.exists():
            src = ep2_dir / f"ia_{pose}.png"
            if src.exists():
                shutil.copy2(src, dst)
                print(f"  ✓ IA {pose} reutilizado do Ep02")
            else:
                _pil_fallback_fullbody(dst, f"IA {pose}", False)
                print(f"  ✓ IA {pose} gerado (PIL fallback)")
        else:
            print(f"  ✓ IA {pose} em cache")
        avatars[f"ia_{pose}"] = dst

    bg = AVATAR_DIR / "background_talkshow.png"
    if not bg.exists():
        src_bg = ep2_dir / "background_talkshow.png"
        if src_bg.exists():
            shutil.copy2(src_bg, bg)
            print("  ✓ Background reutilizado do Ep02")
        else:
            _pil_fallback_background(bg)
            print("  ✓ Background gerado (PIL fallback)")
    else:
        print("  ✓ Background em cache")
    avatars["background"] = bg
    return avatars


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 3 — ÁUDIO TTS (Gemini TTS nativo)
# ═══════════════════════════════════════════════════════════════════════════════

def pcm_to_wav(pcm: bytes, rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    data_size = len(pcm)
    byte_rate = rate * channels * bits // 8
    block_align = channels * bits // 8
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16, 1, channels, rate,
        byte_rate, block_align, bits,
        b"data", data_size,
    )
    return header + pcm


SILENCE_THRESHOLD = 44 + 24000 * 2 * 2  # ~96kB — abaixo disso = silêncio/vazio

_tts_flash_count = 0
_tts_pro_count = 0


def generate_tts_line(text: str, voice: str, out_path: Path) -> Path:
    global _tts_flash_count, _tts_pro_count

    if out_path.exists():
        if out_path.stat().st_size > SILENCE_THRESHOLD:
            return out_path
        print(f"    ⚠ Arquivo suspeito ({out_path.stat().st_size}B) — regerando…")
        out_path.unlink()

    model = MODEL_TTS_FLASH
    if _tts_flash_count >= 100:
        model = MODEL_TTS_PRO if _tts_pro_count < 50 else MODEL_TTS_FALLBACK
        if model == MODEL_TTS_PRO:
            _tts_pro_count += 1
    else:
        _tts_flash_count += 1

    t = text if len(text) >= 5 else text + "..."

    MAX_ATTEMPTS = 6
    for attempt in range(MAX_ATTEMPTS):
        try:
            resp = client().models.generate_content(
                model=model,
                contents=t,
                config=gt.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=gt.SpeechConfig(
                        voice_config=gt.VoiceConfig(
                            prebuilt_voice_config=gt.PrebuiltVoiceConfig(voice_name=voice)
                        )
                    ),
                ),
            )
            part = resp.candidates[0].content.parts[0]
            pcm_bytes = part.inline_data.data
            mime = part.inline_data.mime_type
            rate_match = re.search(r"rate=(\d+)", mime)
            rate = int(rate_match.group(1)) if rate_match else 24000
            wav_bytes = pcm_to_wav(pcm_bytes, rate=rate)

            if len(wav_bytes) <= SILENCE_THRESHOLD:
                print(f"    ⚠ Resposta muito curta (tentativa {attempt+1}/{MAX_ATTEMPTS})")
                time.sleep(5)
                continue

            out_path.write_bytes(wav_bytes)
            return out_path
        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                wait = 90 if attempt >= 3 else 60
                print(f"    ⚠ Quota 429 (tentativa {attempt+1}/{MAX_ATTEMPTS}) — aguardando {wait}s…")
                time.sleep(wait)
            else:
                # Erros de rede (DNS, timeout) — retry com backoff crescente
                wait = min(30 * (attempt + 1), 120)
                print(f"    ⚠ TTS erro ({e}) — tentativa {attempt+1}/{MAX_ATTEMPTS}, aguardando {wait}s…")
                time.sleep(wait)

    # Fallback: silêncio de 4s
    print(f"    ✗ TTS falhou após {MAX_ATTEMPTS} tentativas — usando silêncio")
    out_path.write_bytes(pcm_to_wav(b"\x00\x00" * 24000 * 4))
    return out_path


def wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 5.0


def generate_all_audio(script: list[dict]) -> dict[int, Path]:
    audio_map: dict[int, Path] = {}
    total = len(script)
    to_gen = [l for l in script if not (AUDIO_DIR / f"line_{l['id']:04d}.wav").exists()
              or (AUDIO_DIR / f"line_{l['id']:04d}.wav").stat().st_size <= SILENCE_THRESHOLD]
    print(f"  → {total - len(to_gen)} OK, {len(to_gen)} a gerar/reger")

    for idx, line in enumerate(script):
        lid = line["id"]
        out = AUDIO_DIR / f"line_{lid:04d}.wav"
        if not out.exists() or out.stat().st_size <= SILENCE_THRESHOLD:
            if out.exists():
                out.unlink()
            voice = VOICE_ELIEZER if line["speaker"] == "Eliezer" else VOICE_IA
            print(f"  🎙 [{idx+1}/{total}] {line['speaker']} ({voice}): {line['pt'][:65]}…")
            generate_tts_line(line["pt"], voice, out)
            time.sleep(7)  # throttle: ~8 req/min < limite 10 RPM
        audio_map[lid] = out

    return audio_map


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 4 — SLIDES PNG (Layout TELÃO)
# ═══════════════════════════════════════════════════════════════════════════════

def _font(size: int, bold: bool = False):
    from PIL import ImageFont
    candidates = (
        ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf", "verdanab.ttf"] if bold
        else ["segoeui.ttf", "arial.ttf", "calibri.ttf", "verdana.ttf"]
    )
    for name in candidates:
        fp = WIN_FONTS / name
        if fp.exists():
            try:
                return ImageFont.truetype(str(fp), size)
            except Exception:
                pass
    from PIL import ImageFont
    return ImageFont.load_default()


def _wrap_text(draw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], []
    for w in words:
        test = " ".join(cur + [w])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] > max_w and cur:
            lines.append(" ".join(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(" ".join(cur))
    return lines or [""]


def _draw_gradient_bg(draw, width: int, height: int):
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))


_avatar_cache: dict[str, object] = {}


def _get_avatar_portrait(avatars: dict, speaker: str, size: int = 72):
    from PIL import Image
    key = f"{speaker}_{size}"
    if key in _avatar_cache:
        return _avatar_cache[key]
    av_key = f"{'eliezer' if speaker == 'Eliezer' else 'ia'}_talking"
    path = avatars.get(av_key)
    if path and Path(path).exists():
        try:
            img = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
            from PIL import ImageDraw
            mask = Image.new("L", (size, size), 0)
            md = ImageDraw.Draw(mask)
            md.ellipse([0, 0, size - 1, size - 1], fill=255)
            result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            result.paste(img, (0, 0), mask)
            _avatar_cache[key] = result
            return result
        except Exception:
            pass
    return None


def create_slide_telao(line: dict, slide_data: dict, avatars: dict,
                       line_idx: int, total: int) -> Path:
    """
    Layout TELÃO:
    ┌──────────────────────────────────────────────────────────────────┐
    │ [progress bar 8px][brand bar 40px]                               │ → 48px
    │                                                                  │
    │ ┌────────────────────────────────────────────────────────────┐   │
    │ │ [accent bar 8px]                                           │   │
    │ │         [TÍTULO DO SLIDE — 52px bold, accent color]        │   │ 675px
    │ │  ─────────────────────────────────────────────             │   │
    │ │  • Linha de conteúdo 1  (38px)                             │   │
    │ │  • Linha de conteúdo 2                                     │   │
    │ │  • Linha de conteúdo 3                                     │   │
    │ │  • Linha de conteúdo 4                                     │   │
    │ └────────────────────────────────────────────────────────────┘   │
    │                                                                  │
    │  [○ avatar]  [Nome speaker]  [Fala atual em branco, 32px]        │ ~285px
    │  [Slide N/35]                                        [EP03]      │
    └──────────────────────────────────────────────────────────────────┘
    """
    from PIL import Image, ImageDraw

    slide_path = SLIDES_DIR / f"slide_{line['id']:04d}.png"
    if slide_path.exists():
        return slide_path

    speaker = line["speaker"]
    pt_text = line["pt"]
    is_el = (speaker == "Eliezer")
    accent = COL_ELIEZER if is_el else COL_IA

    sn = line.get("slide_number", line["id"])
    sinfo = slide_data.get(sn, {"title": "", "content": ""})
    slide_title = sinfo.get("title", "")
    slide_content_raw = sinfo.get("content", "")

    # Canvas + gradiente de fundo
    img = Image.new("RGB", (VIDEO_W, VIDEO_H), BG_TOP)
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, VIDEO_W, VIDEO_H)

    # ── Barra de progresso (8px no topo) ─────────────────────────────────────
    prog_w = int(VIDEO_W * ((line_idx + 1) / max(total, 1)))
    draw.rectangle([0, 0, prog_w, 8], fill=accent)
    draw.rectangle([prog_w, 0, VIDEO_W, 8], fill=(20, 30, 50))

    # ── Barra de marca (9px–48px) ─────────────────────────────────────────────
    brand_fnt = _font(18)
    draw.text((VIDEO_W // 2, 28),
              "IDD Paradigma  ·  Ep03 — A Genealogia do IDD",
              fill=TEXT_DIMMED, font=brand_fnt, anchor="mm")

    # ── Quadro TELÃO ──────────────────────────────────────────────────────────
    sx, sy = SCREEN_X, SCREEN_Y
    sw, sh = SCREEN_W, SCREEN_H
    ex, ey = sx + sw, sy + sh

    draw.rounded_rectangle([sx, sy, ex, ey], radius=SCREEN_R,
                            fill=SCREEN_BG, outline=accent, width=2)
    # Barra lateral esquerda (acento do speaker)
    draw.rectangle([sx, sy, sx + 8, ey], fill=accent)

    # ── Título ────────────────────────────────────────────────────────────────
    title_fnt = _font(52, bold=True)
    inner_x = sx + 30
    inner_w = sw - 60
    title_y = sy + 48

    if slide_title:
        title_lines = _wrap_text(draw, slide_title, title_fnt, inner_w - 30)
        for i, tl in enumerate(title_lines[:2]):
            draw.text((sx + sw // 2, title_y + i * 68), tl,
                      fill=accent, font=title_fnt, anchor="mt")
        sep_y = title_y + len(title_lines[:2]) * 68 + 14
        draw.line([(inner_x + 20, sep_y), (ex - 50, sep_y)],
                  fill=(40, 65, 110), width=2)
        content_start_y = sep_y + 28
    else:
        content_start_y = title_y

    # ── Conteúdo do slide ─────────────────────────────────────────────────────
    content_fnt = _font(36)
    # Expandir \n (literais e reais)
    raw_lines = slide_content_raw.replace("\\n", "\n").split("\n")
    content_lines = [cl.strip() for cl in raw_lines if cl.strip()][:4]

    available_h = ey - content_start_y - 30
    line_spacing = 58
    total_content_h = len(content_lines) * line_spacing
    cy = content_start_y + max(0, (available_h - total_content_h) // 2)

    for cl in content_lines:
        bullet = "•"
        if cl.startswith(("•", "-", '"', "'")):
            display = cl
        else:
            display = f"{bullet}  {cl}"
        wrapped = _wrap_text(draw, display, content_fnt, inner_w - 50)
        for j, wl in enumerate(wrapped[:2]):
            draw.text((inner_x + 45, cy + j * 44), wl,
                      fill=TEXT_BRIGHT, font=content_fnt, anchor="lt")
        cy += line_spacing

    # ── Barra do apresentador (abaixo do telão) ───────────────────────────────
    bar_y = ey + 18
    bar_cy = bar_y + (VIDEO_H - bar_y - 15) // 2

    # Fundo da barra
    bar_bg = Image.new("RGBA", (VIDEO_W, VIDEO_H), (0, 0, 0, 0))
    bb_draw = ImageDraw.Draw(bar_bg)
    bb_draw.rectangle([0, bar_y - 4, VIDEO_W, VIDEO_H], fill=(8, 13, 26, 200))
    img = Image.alpha_composite(img.convert("RGBA"), bar_bg).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Linha de acento superior da barra
    draw.rectangle([0, bar_y - 4, VIDEO_W, bar_y], fill=accent)

    # Avatar circular
    portrait = _get_avatar_portrait(avatars, speaker, size=72)
    av_x = 30
    if portrait:
        img_rgba = img.convert("RGBA")
        img_rgba.paste(portrait, (av_x, bar_cy - 36), portrait)
        img = img_rgba.convert("RGB")
        draw = ImageDraw.Draw(img)
    else:
        circ = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
        cd = ImageDraw.Draw(circ)
        cd.ellipse([0, 0, 71, 71], fill=accent)
        init_fnt = _font(32, bold=True)
        cd.text((36, 36), speaker[0], fill=(10, 15, 30), font=init_fnt, anchor="mm")
        img_rgba = img.convert("RGBA")
        img_rgba.paste(circ, (av_x, bar_cy - 36), circ)
        img = img_rgba.convert("RGB")
        draw = ImageDraw.Draw(img)

    name_x = av_x + 72 + 14
    name_fnt = _font(24, bold=True)
    draw.text((name_x, bar_cy - 24), speaker, fill=accent, font=name_fnt, anchor="lt")

    # Fala atual (legenda)
    spoken_fnt = _font(32)
    spoken_max_w = VIDEO_W - name_x - 240
    spoken_lines = _wrap_text(draw, pt_text, spoken_fnt, spoken_max_w)
    for i, sl in enumerate(spoken_lines[:3]):
        draw.text((name_x, bar_cy + 4 + i * 40), sl,
                  fill=TEXT_WHITE, font=spoken_fnt, anchor="lt")

    # Indicadores
    num_fnt = _font(18)
    total_slides = len(slide_data) if slide_data else 35
    draw.text((VIDEO_W - 20, VIDEO_H - 10),
              f"EP03  ·  Slide {sn}/{total_slides}",
              fill=TEXT_DIMMED, font=num_fnt, anchor="rb")

    img.save(slide_path, optimize=False)
    return slide_path


def create_all_slides(script: list[dict], avatars: dict, slide_data: dict) -> dict[int, Path]:
    total = len(script)
    missing = [l for l in script if not (SLIDES_DIR / f"slide_{l['id']:04d}.png").exists()]
    print(f"  → {total - len(missing)} OK, {len(missing)} a gerar")

    slides: dict[int, Path] = {}
    for idx, line in enumerate(script):
        lid = line["id"]
        p = SLIDES_DIR / f"slide_{lid:04d}.png"
        if not p.exists():
            if idx % 20 == 0 or idx == total - 1:
                print(f"  🖼 Slides: {idx+1}/{total}")
            create_slide_telao(line, slide_data, avatars, idx, total)
        slides[lid] = p

    print(f"  ✓ {total} slides OK")
    return slides


# ═══════════════════════════════════════════════════════════════════════════════
# MOCKUPS — prévia do layout TELÃO (sem API)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_mockups(script: list[dict]):
    print("🖼 Gerando 3 mockups do layout TELÃO (pré-visualização)…")
    if not script:
        print("  ⚠ Use --phase script primeiro para gerar o roteiro.")
        return

    slide_data = _build_slide_data(script)

    avatars: dict = {}
    for pose in POSES_ELIEZER:
        p = AVATAR_DIR / f"eliezer_{pose}.png"
        if not p.exists():
            p = MOCK_DIR / f"el_{pose}_mock.png"
            _pil_fallback_fullbody(p, f"Eliezer {pose}", True)
        avatars[f"eliezer_{pose}"] = p
    for pose in POSES_IA:
        p = AVATAR_DIR / f"ia_{pose}.png"
        if not p.exists():
            p = MOCK_DIR / f"ia_{pose}_mock.png"
            _pil_fallback_fullbody(p, f"IA {pose}", False)
        avatars[f"ia_{pose}"] = p

    indices = [0, len(script) // 2, len(script) - 1]
    for i, idx in enumerate(indices):
        line = script[idx]
        tmp = SLIDES_DIR / f"slide_{line['id']:04d}.png"
        if tmp.exists():
            tmp.unlink()
        create_slide_telao(line, slide_data, avatars, idx, len(script))
        out = MOCK_DIR / f"mockup_{i+1:02d}_slide.png"
        if tmp.exists():
            import shutil
            shutil.copy(tmp, out)
            tmp.unlink()
        print(f"  ✓ Mockup {i+1}: {out.name}")

    print(f"\n📋 Mockups: {MOCK_DIR}")
    for i in range(1, 4):
        print(f"   {MOCK_DIR / f'mockup_{i:02d}_slide.png'}")
    print("\n  ⚠ GATE: revise e dê 'go' para --phase all")


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 5 — MONTAGEM FINAL (ffmpeg)
# ═══════════════════════════════════════════════════════════════════════════════

def _silence_wav(duration_s: float, out_path: Path, rate: int = 24000):
    n_samples = int(rate * duration_s)
    out_path.write_bytes(pcm_to_wav(b"\x00\x00" * n_samples, rate=rate))


def assemble_video(script: list[dict],
                   audio_map: dict[int, Path],
                   slide_map: dict[int, Path]) -> Path:
    final_path = OUT_DIR / "idd_ponto3_a_genealogia_do_idd.mp4"
    if final_path.exists():
        print(f"✓ Vídeo final já existe: {final_path.name}")
        return final_path

    print("  Calculando durações exatas (WAV)…")

    gap_wav = OUT_DIR / "gap_300ms.wav"
    if not gap_wav.exists():
        _silence_wav(0.30, gap_wav)

    slide_concat = OUT_DIR / "slides_concat.txt"
    audio_concat = OUT_DIR / "audio_concat.txt"

    with open(slide_concat, "w", encoding="utf-8") as sv, \
         open(audio_concat, "w", encoding="utf-8") as av:
        for line in script:
            lid = line["id"]
            slide = slide_map.get(lid)
            audio = audio_map.get(lid)
            if not slide or not audio:
                print(f"  ⚠ Faltando arquivo para id={lid}")
                continue
            # Duração exata do WAV + 300ms gap
            dur = wav_duration(audio) + 0.30
            sv.write(f"file '{str(slide).replace(chr(92), chr(47))}'\n")
            sv.write(f"duration {dur:.3f}\n")
            av.write(f"file '{str(audio).replace(chr(92), chr(47))}'\n")
            av.write(f"file '{str(gap_wav).replace(chr(92), chr(47))}'\n")

    print("  🎞 Renderizando slideshow…")
    slideshow_mp4 = OUT_DIR / "slideshow_video.mp4"
    if not slideshow_mp4.exists():
        _run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(slide_concat),
            "-vf", "fps=30,scale=1920:1080:flags=lanczos",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-pix_fmt", "yuv420p",
            str(slideshow_mp4),
        ], label="slideshow")

    print("  🔊 Concatenando áudios…")
    combined_wav = OUT_DIR / "combined_audio.wav"
    if not combined_wav.exists():
        _run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(audio_concat),
            "-c", "copy",
            str(combined_wav),
        ], label="audio_concat")

    print("  🎬 Mesclando vídeo + áudio…")
    _run_ffmpeg([
        "-i", str(slideshow_mp4),
        "-i", str(combined_wav),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(final_path),
    ], label="merge")

    size_mb = final_path.stat().st_size / 1024 / 1024
    print(f"\n  ✅ Vídeo final: {final_path.name}")
    print(f"     Tamanho: {size_mb:.1f} MB")
    return final_path


def _run_ffmpeg(args: list[str], label: str):
    cmd = ["ffmpeg", "-y", "-loglevel", "warning"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ ffmpeg [{label}] stderr:\n{result.stderr[-800:]}")
        raise RuntimeError(f"ffmpeg [{label}] falhou (code {result.returncode})")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

PHASES = ("script", "mockups", "avatars", "audio", "slides", "video", "all")


def main():
    parser = argparse.ArgumentParser(
        description="Gera vídeo IDD Ep03 — A Genealogia do IDD"
    )
    parser.add_argument("--phase", default="all", choices=PHASES,
                        help="Fase a executar (default: all)")
    args = parser.parse_args()
    phase = args.phase

    print("=" * 70)
    print("  IDD — Ep03: A Genealogia do IDD  |  ~20 min  |  Layout TELÃO")
    print("=" * 70)
    print(f"  Vozes Gemini TTS: Eliezer={VOICE_ELIEZER}, IA={VOICE_IA}")
    print(f"  Saída: {OUT_DIR}\n")

    script: list[dict] = []
    slide_data: dict = {}

    if phase in ("all", "script", "audio", "slides", "video", "mockups"):
        print("── FASE 1: ROTEIRO ──────────────────────────────────────────────────")
        script = generate_script()
        slide_data = _build_slide_data(script)
        if phase == "script":
            print(f"\n📋 Preview (primeiras 12 falas):")
            for l in script[:12]:
                sl = l.get("slide_number", "-")
                has_title = "✓" if "slide_title" in l else " "
                print(f"  [Slide {sl:>3}]{has_title} [{l['speaker']:8}] {l['pt'][:80]}…")
            n_slides = len(set(l.get("slide_number", 0) for l in script))
            print(f"\n  Total: {len(script)} falas | {n_slides} slides")
            print(f"  Arquivo: {SCRIPT_FILE}")
            print(f"\n  ⚠ GATE: Revise e rode --phase mockups para ver o layout.")
            return
        print(f"  → {len(slide_data)} slides no roteiro")

    if phase == "mockups":
        generate_mockups(script)
        return

    avatars: dict = {}
    if phase in ("all", "avatars", "slides", "video"):
        print("── FASE 2: AVATARES ─────────────────────────────────────────────────")
        avatars = prepare_avatars()
        if phase == "avatars":
            for k, v in avatars.items():
                print(f"  {k}: {v}")
            return

    audio_map: dict[int, Path] = {}
    if phase in ("all", "audio", "video"):
        if not script:
            script = generate_script()
            slide_data = _build_slide_data(script)
        if not avatars:
            avatars = {f"eliezer_{p}": AVATAR_DIR / f"eliezer_{p}.png"
                       for p in POSES_ELIEZER}
            avatars.update({f"ia_{p}": AVATAR_DIR / f"ia_{p}.png"
                            for p in POSES_IA})
            avatars["background"] = AVATAR_DIR / "background_talkshow.png"
        print(f"── FASE 3: ÁUDIO TTS ({len(script)} linhas) ──────────────────────────────")
        audio_map = generate_all_audio(script)
        if phase == "audio":
            dur = sum(wav_duration(p) for p in audio_map.values())
            print(f"\n  ✓ {len(audio_map)} áudios | ~{dur/60:.1f} min total")
            return

    slide_map: dict[int, Path] = {}
    if phase in ("all", "slides", "video"):
        if not script:
            script = generate_script()
            slide_data = _build_slide_data(script)
        if not avatars:
            avatars = {f"eliezer_{p}": AVATAR_DIR / f"eliezer_{p}.png"
                       for p in POSES_ELIEZER}
            avatars.update({f"ia_{p}": AVATAR_DIR / f"ia_{p}.png"
                            for p in POSES_IA})
        print(f"── FASE 4: SLIDES TELÃO ({len(script)} frames 1920×1080) ──────────────────")
        slide_map = create_all_slides(script, avatars, slide_data)
        if phase == "slides":
            print(f"\n  ✓ {len(slide_map)} slides em: {SLIDES_DIR}")
            return

    if phase in ("all", "video"):
        if not script:
            script = generate_script()
            slide_data = _build_slide_data(script)
        if not audio_map:
            audio_map = {l["id"]: AUDIO_DIR / f"line_{l['id']:04d}.wav"
                         for l in script}
        if not slide_map:
            slide_map = {l["id"]: SLIDES_DIR / f"slide_{l['id']:04d}.png"
                         for l in script}
        print("── FASE 5: MONTAGEM FINAL (ffmpeg) ─────────────────────────────────")
        assemble_video(script, audio_map, slide_map)


if __name__ == "__main__":
    main()
