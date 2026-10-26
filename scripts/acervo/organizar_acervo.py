"""Consolida todo o material do Paradigma IDD em `paradigma/`.

Fontes espalhadas pelo disco (IDD Paradigma, IDD Refrigeração, RVM Designações,
IDE IDD Claude, Downloads, OneDrive) são mapeadas para uma taxonomia única.

Regras:
- Origens NUNCA são alteradas (somente leitura).
- Arquivos leves (texto, código, docs, PDF) são COPIADOS e versionados no git.
- Mídias/binários pesados viram HARD LINKS (NTFS, mesmo volume: custo zero de
  disco) e ficam fora do git via `paradigma/.gitignore`. Se o hard link falhar
  (ex.: OneDrive), o arquivo só entra no catálogo como "externo".
- Duplicatas (mesmo SHA-256) são colocadas uma única vez; todas as origens ficam
  registradas no catálogo.
- Segredos e dados pessoais são excluídos (pastas/arquivos conhecidos + regex).

Uso:
    python -I scripts/acervo/organizar_acervo.py            # dry-run
    python -I scripts/acervo/organizar_acervo.py --aplicar  # executa
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import re
import shutil
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path, PureWindowsPath

REPO = Path(__file__).resolve().parents[2]
DEST = REPO / "paradigma"
LOCAL = DEST / "_local"  # relatórios locais (gitignored)

HOME = Path(os.environ.get("USERPROFILE", r"C:\Users\Eliez"))
VSC = Path(r"C:\IDE IDD Claude-VS Code")
REFRIG = Path(r"C:\Antigravity - IDD Refrigeração")
RVM = Path(r"C:\Antigravity - RVM Designações")
CLAUDE = Path(r"C:\IDE IDD Claude")
ONEDRIVE_ES = HOME / "OneDrive" / "Aprenda Fazendo - Treinamento em TI" / "Engenharia de Software - IA"

# Extensões que nunca entram no git (viram hard link + .gitignore).
HEAVY_EXT = {
    ".mp4", ".webm", ".mov", ".mkv", ".avi", ".wav", ".mp3", ".aac", ".m4a", ".ogg",
    ".jwlplaylist", ".pptx", ".pptm", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
    ".ttf", ".otf", ".woff", ".woff2", ".db", ".sqlite", ".bin", ".mpack", ".ods",
    ".xlsx", ".xls", ".zip", ".7z", ".log",
}
LIGHT_MAX = 5 * 1024 * 1024  # acima disso, mesmo texto vira "pesado"

SKIP_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__", ".vs", ".pw_profile",
    ".playwright-mcp", "segredos", "segredos_backup", "dados_sensiveis", "backups",
    ".roo", ".pytest_cache", "RM Desacoplado",
}
SKIP_FILE_RE = re.compile(
    r"(^\.env($|\.)|^token.*\.json$|^client_secret.*|^credentials.*\.json$|\.crdownload$"
    r"|^\.gitignore$|^\.gitattributes$|\.pyc$|\.db-wal$|\.db-shm$|\.vsidx$|\.wsuo$"
    r"|^teste_motor_vs_agente_resultado\.json$|^Z-api Passo 1.*|^idd-ide-main\.zip$"
    r"|^Umbiguidade-Ubiquidada\.zip$|^files\.zip$|^VS Code Frontend Teste Impressão Pauta.*)",
    re.IGNORECASE,
)
SECRET_RE = re.compile(
    rb"(AIza[0-9A-Za-z_\-]{35}|sk-[A-Za-z0-9_\-]{20,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}"
    rb"|xox[abp]-[A-Za-z0-9\-]{10,}|\"refresh_token\"\s*:\s*\"[^\"]{10,}|\"private_key\"\s*:"
    rb"|eyJ[A-Za-z0-9_\-]{20,}\.eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}"
    rb"|-----BEGIN [A-Z ]*PRIVATE KEY-----|client_secret\"\s*:\s*\"[^\"]{8,}"
    rb"|(?i:api[_-]?key|password|senha|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-.]{16,}['\"])"
)


@dataclass
class Rule:
    """Mapeia um prefixo relativo da fonte para uma pasta de destino."""

    prefix: str  # "" = raiz da fonte; caminho com "/" ; arquivo exato também vale
    dest: str  # relativo a paradigma/ ; None-like "" não usado


@dataclass
class Source:
    name: str
    root: Path
    rules: list[Rule]
    only_listed: bool = True  # arquivos fora das regras são ignorados


P = "IDD Paradigma"
SOURCES: list[Source] = [
    Source("vsc-paradigma", VSC / P, [
        Rule("01 - Conceito e Base", "01-fundamentos/conceito-e-base"),
        Rule("IDD-ebook-v0.2-2026-04-13.pdf", "01-fundamentos"),
        Rule("Compilar LN sem ambiguidade.pdf", "01-fundamentos/desambiguacao-ln"),
        Rule("Intent-Driven Development _ intent-driven.dev.mht", "06-biblioteca/referencias-externas"),
        Rule("apresentacao_refrigeracao.html", "03-casos-de-uso/refrigeracao-hvacr/apresentacao"),
        Rule("Paradigma_IDD na Prática 01.jwlplaylist", "04-canal-youtube/videos-finais"),
        Rule("Paradigma_IDD.jwlplaylist", "04-canal-youtube/videos-finais"),
        Rule("Refrigeração IDD Vídeo 1.mp4", "04-canal-youtube/videos-finais"),
        Rule("02 - Planejamento Editorial", "04-canal-youtube/planejamento-editorial"),
        Rule("03 - Pipeline de Produção", "05-software/pipeline-producao"),
        Rule("04 - Acervo de Episódios", "04-canal-youtube/episodios"),
        Rule("05 - Operação do Canal", "04-canal-youtube/operacao"),
        Rule("06 - Biblioteca e Referências", "06-biblioteca"),
        Rule("DUVIDAS", "07-duvidas"),
        Rule("DÚVIDAS", "07-duvidas"),
        Rule("IDD Prática Melissa", "03-casos-de-uso/pratica-melissa"),
        Rule("_checkpoint", "99-historico/checkpoints-reorganizacao-2026-05-18"),
    ]),
    Source("refrigeracao", REFRIG, [
        Rule("docs/idd_seo_academic_keywords_manifest.md", "01-fundamentos"),
        Rule("docs", "03-casos-de-uso/refrigeracao-hvacr/docs"),
        Rule("apresentacao", "03-casos-de-uso/refrigeracao-hvacr/apresentacao"),
        Rule("plans", "03-casos-de-uso/refrigeracao-hvacr/plans"),
        Rule("README.md", "03-casos-de-uso/refrigeracao-hvacr"),
        Rule("_ESTADO-ATUAL.md", "03-casos-de-uso/refrigeracao-hvacr"),
        Rule("apps_exemplos", "03-casos-de-uso/apps-exemplos"),
        Rule("artefatos", "04-canal-youtube/videos-finais"),
        Rule("producao_yt", "04-canal-youtube/producao-yt"),
        Rule("motion_graphics_renderer", "05-software/motion-graphics-renderer"),
        Rule("temp_text_generator", "05-software/temp-text-generator"),
        Rule("outputs", "99-historico/refrigeracao-raiz/outputs"),
        Rule("", "99-historico/refrigeracao-raiz"),  # testes soltos da raiz
    ]),
    Source("ide-idd-claude", CLAUDE, [
        Rule("IDD-ebook-v0.2-2026-04-13.pdf", "01-fundamentos"),
        Rule("Compilar LN sem ambiguidade.pdf", "01-fundamentos/desambiguacao-ln"),
        Rule("Compilar LN sem ambiguidade Promptr para Claude.txt", "01-fundamentos/desambiguacao-ln"),
        Rule("Intent-Driven Development _ intent-driven.dev.mht", "06-biblioteca/referencias-externas"),
        Rule("Comandos para execução automática de Ajustes", "02-ide/comandos-fases"),
        Rule("", "02-ide/especificacoes-origem"),
    ]),
    Source("vsc-raiz", VSC, [
        Rule("Umbiguidade-Ubiquidada", "05-software/umbiguidade-ubiquidada"),
        Rule("ANALISE_IDD_IDE_PARADIGMA.md", "02-ide"),
        Rule("apresentacao_idd_ide_excalidraw.html", "02-ide/diagramas"),
        Rule("modelo_grafico_paradigma_idd.excalidraw", "01-fundamentos/diagramas"),
        Rule("modelo_grafico_projeto_ide_idd.excalidraw", "02-ide/diagramas"),
        Rule("Gerência Inteligente da Comunicação via WhatsApp (Z-API).md", "03-casos-de-uso/rvm-designacoes/planos"),
    ]),
    Source("rvm", RVM, [
        Rule("Novo Projeto", "03-casos-de-uso/rvm-designacoes/especificacao-inicial-2025-12"),
        Rule("rvm-designacoes-unified/.docs/interface-semantica-ergonomica-intuitiva",
             "03-casos-de-uso/rvm-designacoes/interface-semantica"),
        Rule("rvm-designacoes-unified/docs/ai-tooling-for-idd.md", "03-casos-de-uso/rvm-designacoes/docs"),
        Rule("rvm-designacoes-unified/docs/manifesto_tecnico_rvm_designacoes.md", "03-casos-de-uso/rvm-designacoes/docs"),
        Rule("rvm-designacoes-unified/ANTIGRAVITY_HANDOFF.md", "03-casos-de-uso/rvm-designacoes/docs"),
        Rule("rvm-designacoes-unified/README.md", "03-casos-de-uso/rvm-designacoes/docs"),
        Rule("rvm-designacoes-unified/.agents/workflows/rotate-secrets.intent.md", "03-casos-de-uso/rvm-designacoes/intents"),
        Rule("MGP_PLANO_OFICIAL.md", "03-casos-de-uso/rvm-designacoes/planos"),
        Rule("Metodologia_ES_IA_Enriquecida.pptx", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("Metodologia_ES_IA_Enriquecida_àudios.pptm", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("Metodologia_IA_Autonoma.pptx", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("Metodologia_IA_Autonoma.mp4", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("Metodologia_IA_Autonoma v2.mp4", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("generate_methodology_presentation.py", "03-casos-de-uso/rvm-designacoes/metodologia"),
        Rule("Apresentacao_Teste_Motor_vs_Agente_2026-07-06.pptx", "03-casos-de-uso/rvm-designacoes/motor-vs-agente"),
        Rule("teste_motor_vs_agente.py", "03-casos-de-uso/rvm-designacoes/motor-vs-agente"),
        Rule("apresentacao_perfil_eliezer.html", "06-biblioteca/autor"),
        Rule("eliezer_photo.jpg", "06-biblioteca/autor"),
        Rule("Diagrama - Agente RVM AI Data Flow.png", "03-casos-de-uso/rvm-designacoes/diagramas"),
        Rule("Diagrama - Agente RVM AI Data Flow v2.png", "03-casos-de-uso/rvm-designacoes/diagramas"),
        Rule("mermaid-config.json", "03-casos-de-uso/rvm-designacoes/diagramas"),
        Rule("diagrama_*", "03-casos-de-uso/rvm-designacoes/diagramas"),  # glob na raiz
    ]),
    Source("downloads", HOME / "Downloads", [
        Rule("Compilar LN sem ambiguidade.pdf", "01-fundamentos/desambiguacao-ln"),
        Rule("DDD, IA e Desenvolvimento Intencional.md", "00-precursores"),
        Rule("Fefrigeração - IDD Vídeo 2.mp4", "04-canal-youtube/videos-finais"),
        Rule("idd_presentation.html", "06-biblioteca/apresentacoes-historicas"),
        Rule("Modelo de Classes do Negócio IDD Intent Specification Validação.md", "02-ide/especificacoes-origem"),
        Rule("Modelo Entidade-Relacionamento - IDD Refrigeração.md", "03-casos-de-uso/refrigeracao-hvacr/docs"),
        Rule("research_idd_unisys.md", "06-biblioteca/estudos-e-papers"),
        Rule("Paradigma_IDD na Prática 01.mp4", "04-canal-youtube/videos-finais"),
        Rule("Paradigma_IDD na Prática 01.jwlplaylist", "04-canal-youtube/videos-finais"),
    ]),
    Source("onedrive", ONEDRIVE_ES, [
        Rule("DDD, IA e Desenvolvimento Intencional.md", "00-precursores"),
        Rule("Paradigma IDD para Engenharia de Software.html", "06-biblioteca/apresentacoes-historicas"),
        Rule("Paradigma IDD para Engenharia de Software v2.html", "06-biblioteca/apresentacoes-historicas"),
        Rule("Para YouTuber/apresentacao_idd_paradigma_3_perspectivas.html", "01-fundamentos/conceito-e-base"),
        Rule("Para YouTuber/quiz_idd_avatar.mp4", "04-canal-youtube/episodios/Quiz IDD"),
        Rule("Para YouTuber/Publicados", "04-canal-youtube/videos-publicados-onedrive"),
        Rule("Para YouTuber/Rascunhos", "06-biblioteca/apresentacoes-historicas/rascunhos-youtuber"),
    ]),
    Source("onedrive-alma", HOME / "OneDrive" / "Aprenda Fazendo - Treinamento em TI"
           / "Aprenda Fazendo - Programação com IA" / "Aprenda Fazendo IA" / "ALMA Rascunhos", [
        Rule("Documentação do Paradigma OOI e da Linguagem Alma.pdf", "00-precursores/alma-ooi"),
        Rule("Paradigma_OOI_Linguagem_Alma.md", "00-precursores/alma-ooi"),
    ]),
    # Por último: cópia quase idêntica de "IDD Paradigma" dentro do Refrigeração.
    Source("refrig-paradigma", REFRIG / P, [
        Rule("IDD Paradigma - Ciclo Vida Na Proposta", "01-fundamentos/ciclo-de-vida"),
        Rule("Paradigma_IDD na Prática 01.mp4", "04-canal-youtube/videos-finais"),
        Rule("01 - Conceito e Base", "01-fundamentos/conceito-e-base"),
        Rule("02 - Planejamento Editorial", "04-canal-youtube/planejamento-editorial"),
        Rule("03 - Pipeline de Produção", "05-software/pipeline-producao"),
        Rule("04 - Acervo de Episódios", "04-canal-youtube/episodios"),
        Rule("05 - Operação do Canal", "04-canal-youtube/operacao"),
        Rule("06 - Biblioteca e Referências", "06-biblioteca"),
        Rule("DUVIDAS", "07-duvidas"),
        Rule("DÚVIDAS", "07-duvidas"),
        Rule("IDD Prática Melissa", "03-casos-de-uso/pratica-melissa"),
    ]),
]


@dataclass
class Item:
    src: Path
    source: str
    dest_rel: str  # relativo a paradigma/, com "/"
    size: int
    heavy: bool
    sha: str = ""
    origins: list[str] = field(default_factory=list)
    status: str = ""  # git | acervo | externo | excluido-segredo | erro


def long(p: Path) -> str:
    s = str(p)
    return s if s.startswith("\\\\?\\") else "\\\\?\\" + s


def is_cloud_placeholder(p: Path) -> bool:
    try:
        attrs = os.stat(long(p)).st_file_attributes  # type: ignore[attr-defined]
    except (OSError, AttributeError):
        return False
    # RECALL_ON_DATA_ACCESS | OFFLINE. (0x40000 não serve: é RECALL_ON_OPEN *e* EA.)
    return bool(attrs & (0x400000 | 0x1000))


def match_rule(rel: str, rules: list[Rule]) -> tuple[Rule, str] | None:
    """Regra mais específica primeiro (ordem declarada). Retorna (regra, resto)."""
    for r in rules:
        if r.prefix == "":
            if "/" not in rel:
                return r, rel
            continue
        if "*" in r.prefix:
            if "/" not in rel and PureWindowsPath(rel).match(r.prefix):
                return r, rel
            continue
        if rel == r.prefix:
            return r, PureWindowsPath(rel).name
        if rel.startswith(r.prefix + "/"):
            return r, rel[len(r.prefix) + 1:]
    return None


def walk(src: Source):
    if not src.root.exists():
        print(f"  [aviso] fonte ausente: {src.root}")
        return
    for dirpath, dirnames, filenames in os.walk(src.root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        # na fonte vsc-raiz, não descer no próprio repo nem na pasta IDD Paradigma
        if Path(dirpath) == VSC:
            dirnames[:] = [d for d in dirnames if d not in {"idd-ide", P}]
        if Path(dirpath) == REFRIG:
            dirnames[:] = [d for d in dirnames if d != P]
        for fn in filenames:
            full = Path(dirpath) / fn
            rel = full.relative_to(src.root).as_posix()
            yield full, rel, fn


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(long(p), "rb") as f:
        for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def has_secret(p: Path) -> bool:
    try:
        with open(long(p), "rb") as f:
            return bool(SECRET_RE.search(f.read(LIGHT_MAX)))
    except OSError:
        return False


CODE_EXT = {".py", ".js", ".cjs", ".mjs", ".ts", ".ps1", ".bat", ".cmd", ".sh"}
COM = "50-comunicacao"
REF = f"{COM}/serie-refrigeracao"
BASE = f"{COM}/serie-base-conhecimento"
ESP = f"{COM}/especiais"
ARQ = "90-arquivo"


def remap(d: str) -> str:
    """Etapa 2: taxonomia por papel epistêmico (ver PROPOSTA-REORGANIZACAO.md).

    Recebe o caminho da etapa 1 (por origem) e devolve o caminho final. Episódios
    ficam autocontidos em 50-comunicacao/<série>/<ep>/; código vai para 30-ferramentas.
    """
    name = PureWindowsPath(d).name
    ext = PureWindowsPath(d).suffix.lower()
    sub = lambda pat, rep: re.sub(pat, rep, d, count=1, flags=re.IGNORECASE)  # noqa: E731
    m = lambda pat: re.match(pat, d, flags=re.IGNORECASE)  # noqa: E731

    # --- assets de episódios (motion graphics renderer) -------------------------
    mg = "05-software/motion-graphics-renderer"
    if m(rf"{mg}/idd_video_(\w+?)_assets/"):
        return sub(rf"^{mg}/idd_video_(\w+?)_assets/", lambda x: f"{REF}/ep{x[1].lower()}/assets/")
    if m(rf"{mg}/idd_teoria_ep(\d+)_assets/"):
        return sub(rf"^{mg}/idd_teoria_ep(\d+)_assets/", rf"{BASE}/ep\1/assets/")
    if m(rf"{mg}/idd_novo_video_assets/"):
        return sub(rf"^{mg}/idd_novo_video_assets/", f"{ESP}/manifesto/assets/")
    if m(rf"{mg}/idd_perspectiva_tecnica_assets/"):
        return sub(rf"^{mg}/idd_perspectiva_tecnica_assets/", f"{ESP}/perspectiva-tecnica/assets/")
    if m(rf"{mg}/(outputs|temp_recordings|test\w*)/") or (m(rf"{mg}/[^/]+$") and name.startswith("test")):
        return sub(rf"^{mg}/", f"{ARQ}/renderer-testes-e-outputs/")
    if m(rf"{mg}/"):
        return sub(rf"^{mg}/", "30-ferramentas/motion-graphics-renderer/")

    # --- produção YouTube (scripts + mídia misturados) --------------------------
    yt = "04-canal-youtube/producao-yt"
    dirs = [
        (r"(barbearia|cafeteria|racha)_assets", lambda x: f"{COM}/serie-casos-de-uso/{x[1].lower()}/assets/"),
        (r"melissa_assets", f"{ESP}/melissa-crm/assets/"),
        (r"refrigeracao_talkshow", f"{ESP}/talkshow-refrigeracao/"),
        (r"shorts_idd", f"{COM}/shorts/"),
        (r"capas", f"{COM}/canal/capas/"),
        (r"avatares", f"{COM}/canal/avatares/"),
        (r"v(\d)_(\w+)", lambda x: f"{REF}/ep{x[1]}/producao-audio/v{x[1]}_{x[2]}/"),
        (r"audio_segs", f"{REF}/ep1/producao-audio/audio_segs/"),
    ]
    for pat, rep in dirs:
        if m(rf"{yt}/{pat}/"):
            return sub(rf"^{yt}/{pat}/", rep)
    if m(rf"{yt}/[^/]+/"):
        return sub(rf"^{yt}/", f"{ARQ}/producao-yt-diagnosticos/")
    if m(rf"{yt}/[^/]+$"):
        if ext in CODE_EXT:
            return f"30-ferramentas/pipeline-producao/youtube/{name}"
        if x := re.match(r"IDD_Base_Conhecimento_Ep(\d+)", name):
            return f"{BASE}/ep{x[1]}/{name}"
        if x := re.match(r"IDD_Refrigeracao_Novo_Episodio_(\w+?)\.", name):
            return f"{REF}/ep{x[1].lower()}/{name}"
        if x := re.match(r"Refrigeracao_IDD_Video_(\d)_", name):
            return f"{REF}/ep{x[1]}/versoes/{name}"
        if "Manifesto" in name:
            return f"{ESP}/manifesto/{name}"
        if "Perspectiva_Tecnica" in name:
            return f"{ESP}/perspectiva-tecnica/{name}"
        if "Melissa" in name:
            return f"{ESP}/melissa-crm/{name}"
        if re.match(r"(upload_manifest|descricoes_completas|playlist_|channel_branding)", name):
            return f"{COM}/canal/metadados/{name}"
        if re.match(r"(roteiro_enxuto_antonio|transcricao|legenda_antonio|blocos_orig|f0_por_segmento|teste_antonio)", name):
            return f"{REF}/ep1/producao-audio/{name}"
        return f"{ARQ}/producao-yt-diagnosticos/{name}"

    # --- episódios da série base ------------------------------------------------
    if x := m(r"04-canal-youtube/episodios/Ep0(\d)[^/]*/"):
        return sub(r"^04-canal-youtube/episodios/Ep0\d[^/]*/", f"{BASE}/ep0{x[1]}/")
    if m(r"04-canal-youtube/episodios/Quiz IDD/"):
        return sub(r"^04-canal-youtube/episodios/Quiz IDD/", f"{BASE}/quiz/")
    if m(r"04-canal-youtube/videos-publicados-onedrive/"):
        return f"{BASE}/ep02/{name}" if "ponto2" in name else f"{BASE}/ep01/{name}"
    if m(r"04-canal-youtube/videos-finais/"):
        if x := re.search(r"V[ií]deo (\d)", name):
            return f"{REF}/ep{x[1]}/{name}"
        return f"{REF}/ep1/{name}"
    if x := m(r"04-canal-youtube/planejamento-editorial/roteiros-aprovados/Ep0(\d)"):
        return f"{BASE}/ep0{x[1]}/roteiro/{name}"
    if m(r"04-canal-youtube/planejamento-editorial/"):
        return sub(r"^04-canal-youtube/", f"{COM}/canal/")
    if m(r"04-canal-youtube/operacao/"):
        return sub(r"^04-canal-youtube/operacao/", "30-ferramentas/canal-youtube-api/")

    # --- apresentações do caso Refrigeração ---------------------------------------
    ap = "03-casos-de-uso/refrigeracao-hvacr/apresentacao"
    if m(rf"{ap}/"):
        if x := re.search(r"V[ií]deo (\d)", name):
            return f"{REF}/ep{x[1]}/versoes/{name}"
        if ext == ".html" or m(rf"{ap}/(gifs|slides_preview)/"):
            return sub(rf"^{ap}/", f"{COM}/apresentacoes/refrigeracao/")
        if ext in CODE_EXT:
            return f"30-ferramentas/apresentacoes-tooling/{name}"
        return f"{ARQ}/apresentacoes-capturas/{name}"

    # --- fundamentos / método / ferramentas / evidências -----------------------
    cb = "01-fundamentos/conceito-e-base"
    if m(rf"{cb}/"):
        if name.startswith("IDD_IDE_"):
            return f"30-ferramentas/idd-ide/especificacoes/{name}"
        if ext == ".html":
            return f"{COM}/apresentacoes/{name}"
        if name == "IDD-knowledge-base.md":
            return f"10-fundamentos/linhagem/{name}"
        if name.startswith("plano_manifesto"):
            return f"{ESP}/manifesto/{name}"
        return f"10-fundamentos/{name}"
    rules = [
        (r"^00-precursores/", "10-fundamentos/precursores-proprios/"),
        (r"^01-fundamentos/IDD-ebook", "60-referencias-externas/IDD-ebook"),
        (r"^01-fundamentos/idd_seo", "10-fundamentos/sete-perspectivas/idd_seo"),
        (r"^01-fundamentos/ciclo-de-vida/", "20-metodo/ciclo-de-vida/"),
        (r"^01-fundamentos/", "10-fundamentos/"),
        (r"^02-ide/", "30-ferramentas/idd-ide/"),
        (r"^03-casos-de-uso/refrigeracao-hvacr/", "40-evidencias/refrigeracao-hvacr/"),
        (r"^03-casos-de-uso/apps-exemplos/", "40-evidencias/apps-exemplos/"),
        (r"^03-casos-de-uso/pratica-melissa/", "40-evidencias/nexuslog-crm-melissa/"),
        (r"^03-casos-de-uso/rvm-designacoes/intents/", "20-metodo/runbooks/"),
        (r"^03-casos-de-uso/rvm-designacoes/", "40-evidencias/rvm-designacoes/"),
        (r"^05-software/pipeline-producao/scripts-geradores/(?=.*\.wav$)", f"{ARQ}/pipeline-producao/"),
        (r"^05-software/pipeline-producao/scripts-geradores/", "30-ferramentas/pipeline-producao/geradores-base/"),
        (r"^05-software/pipeline-producao/rvm-visual-pipeline/", "30-ferramentas/rvm-visual-pipeline/"),
        (r"^05-software/umbiguidade-ubiquidada/", "30-ferramentas/umbiguidade-ubiquidada/"),
        (r"^05-software/", f"{ARQ}/"),
        (r"^06-biblioteca/estudos-e-papers/(?=research_)", "60-referencias-externas/"),
        (r"^06-biblioteca/estudos-e-papers/", "10-fundamentos/estudos/"),
        (r"^06-biblioteca/referencias-externas/", "60-referencias-externas/"),
        (r"^06-biblioteca/autor/", f"{COM}/canal/autor/"),
        (r"^06-biblioteca/apresentacoes-historicas/", f"{COM}/apresentacoes/historicas/"),
        (r"^07-duvidas/", f"{ARQ}/duvidas/"),
        (r"^99-historico/", f"{ARQ}/"),
    ]
    for pat, rep in rules:
        if re.match(pat, d, flags=re.IGNORECASE):
            return re.sub(pat, rep, d, count=1, flags=re.IGNORECASE)
    return d


# Escritos à mão: nunca removidos pela limpeza nem sobrescritos.
MANUAL_NAMES = {"STATUS.md", "LEIA-ME.md", "CANAIS-YOUTUBE.md"}


def is_manual(rel: str) -> bool:
    return rel.startswith("00-canone/") or PureWindowsPath(rel).name in MANUAL_NAMES


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--aplicar", action="store_true", help="executa (padrão: dry-run)")
    args = ap.parse_args()

    excluded: list[tuple[str, str]] = []
    items: list[Item] = []

    print("1/4 Varrendo fontes...")
    for src in SOURCES:
        n0 = len(items)
        for full, rel, fn in walk(src):
            if SKIP_FILE_RE.search(fn):
                excluded.append((str(full), "padrão de exclusão"))
                continue
            m = match_rule(rel, src.rules)
            if not m:
                continue
            rule, rest = m
            try:
                size = os.stat(long(full)).st_size
            except OSError as e:
                excluded.append((str(full), f"erro stat: {e}"))
                continue
            ext = full.suffix.lower()
            heavy = ext in HEAVY_EXT or size > LIGHT_MAX
            items.append(Item(full, src.name, remap(f"{rule.dest}/{rest}"), size, heavy))
        print(f"  {src.name:18} {len(items) - n0:6} arquivos")

    print("2/4 Deduplicando (hash só onde o tamanho colide)...")
    by_size: dict[int, list[Item]] = defaultdict(list)
    for it in items:
        by_size[it.size].append(it)
    for group in by_size.values():
        if len(group) > 1:
            for it in group:
                if is_cloud_placeholder(it.src):
                    it.sha = f"cloud:{it.src}"  # não força download
                    continue
                try:
                    it.sha = sha256(it.src)
                except OSError as e:
                    it.sha = f"erro:{it.src}"
                    excluded.append((str(it.src), f"erro leitura: {e}"))
    unique: dict[str, Item] = {}
    placed: list[Item] = []
    for it in items:
        key = it.sha or f"uniq:{it.src}"
        if key in unique:
            unique[key].origins.append(str(it.src))
            continue
        it.origins.append(str(it.src))
        unique[key] = it
        placed.append(it)

    # colisões de nome com conteúdo diferente
    seen: dict[str, Item] = {}
    for it in placed:
        d = it.dest_rel
        if d.lower() in seen:
            stem, ext = os.path.splitext(d)
            k = 2
            while f"{stem} ({k}){ext}".lower() in seen:
                k += 1
            d = f"{stem} ({k}){ext}"
            it.dest_rel = d
        seen[d.lower()] = it

    print("3/4 Classificando (segredos / nuvem)...")
    for it in placed:
        if not it.heavy:
            it.status = "excluido-segredo" if has_secret(it.src) else "git"
        else:
            it.status = "externo" if is_cloud_placeholder(it.src) or "OneDrive" in str(it.src) else "acervo"
    for it in placed:
        if it.status == "excluido-segredo":
            excluded.append((str(it.src), "possível segredo no conteúdo"))

    def total(st):
        sel = [i for i in placed if i.status == st]
        return len(sel), sum(i.size for i in sel) / 1024**2

    dups = len(items) - len(placed)
    print(f"  candidatos={len(items)}  únicos={len(placed)}  duplicatas={dups}")
    for st in ("git", "acervo", "externo", "excluido-segredo"):
        n, mb = total(st)
        print(f"  {st:17} {n:6} arquivos {mb:10.1f} MB")
    print(f"  excluídos por regra: {len(excluded)}")

    if not args.aplicar:
        print("\nDry-run. Use --aplicar para executar.")
        for it in placed:
            if it.status == "excluido-segredo":
                print("  SEGREDO?", it.src)
        return 0

    print("4/4 Aplicando...")
    errors = 0
    # Remove do destino o que deixou de ser esperado (segredo detectado depois, mudança
    # de taxonomia). Preserva a raiz de paradigma/, _local/ e os arquivos manuais.
    expected = {(DEST / it.dest_rel).resolve() for it in placed if it.status in ("git", "acervo")}
    removed = 0
    for root, _, files in os.walk(DEST):
        if Path(root) == DEST or Path(root) == LOCAL or LOCAL in Path(root).parents:
            continue
        for fn in files:
            p = (Path(root) / fn).resolve()
            if p not in expected and not is_manual(p.relative_to(DEST).as_posix()):
                os.remove(long(p))
                removed += 1
    for root, dirs, files in sorted(os.walk(DEST), key=lambda t: -len(t[0])):
        if Path(root) != DEST and not os.listdir(long(Path(root))):
            os.rmdir(long(Path(root)))
    print(f"  removidos (não mais esperados): {removed}")
    for it in placed:
        if it.status in ("excluido-segredo", "externo"):
            continue
        dst = DEST / it.dest_rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            if it.status == "acervo" and dst.stat().st_size == it.size:
                continue
            # cópia leve editada aqui (ex.: selo de status) é mais nova que a origem: preservar
            if it.status == "git" and dst.stat().st_mtime >= it.src.stat().st_mtime:
                continue
        try:
            if it.status == "git":
                shutil.copy2(long(it.src), long(dst))
            else:
                try:
                    os.link(long(it.src), long(dst))
                except OSError:
                    if it.size < 50 * 1024**2:
                        shutil.copy2(long(it.src), long(dst))
                    else:
                        it.status = "externo"
        except OSError as e:
            it.status = "erro"
            errors += 1
            print(f"  ERRO {it.src}: {e}")

    LOCAL.mkdir(parents=True, exist_ok=True)
    with open(DEST / "catalogo.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["destino", "bytes", "sha256", "armazenamento", "origens"])
        for it in sorted(placed, key=lambda i: i.dest_rel.lower()):
            if it.status == "excluido-segredo":
                continue
            sha = it.sha if it.sha and ":" not in it.sha else ""
            w.writerow([it.dest_rel, it.size, sha, it.status, " | ".join(it.origins)])
    with open(LOCAL / "exclusoes.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["origem", "motivo"])
        w.writerows(excluded)

    # gitignore explícito para arquivos "pesados" sem extensão pesada (texto > 5 MB)
    big_text = sorted(
        it.dest_rel for it in placed
        if it.status == "acervo" and PureWindowsPath(it.dest_rel).suffix.lower() not in HEAVY_EXT
    )
    gi = DEST / ".gitignore"
    lines = [
        "# Gerado por scripts/acervo/organizar_acervo.py — mídias ficam só no disco (hard links).",
        "_local/",
        *sorted(f"*{e}" for e in HEAVY_EXT),
        "!*.svg",
        *("/" + p for p in big_text),
    ]
    gi.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Concluído. erros={errors}. Catálogo: {DEST / 'catalogo.csv'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
