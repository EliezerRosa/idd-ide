"""Correção de transparência dos Episódios 04 a 10 da Base de Conhecimento IDD.

Para cada vídeo:
  1. Faz backup do snippet/status atuais em JSON (reversível).
  2. Insere no topo da descrição uma Nota de Transparência (roadmap vs. implementado
     + declaração de voz sintética). Idempotente: não duplica se já existir.
  3. Substitui a linha de hashtags por um conjunto enxuto e aderente ao conteúdo.
  4. Substitui as tags por lista enxuta.
  5. Marca status.containsSyntheticMedia = True (política de conteúdo sintético do YouTube).

Uso:
  python fix_transparency_ep04_ep10.py --dry-run   (só mostra o que faria)
  python fix_transparency_ep04_ep10.py             (aplica)
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
BACKUP_DIR = BASE_DIR / "producao_yt" / "backups_metadata"

DRY_RUN = "--dry-run" in sys.argv

MARKER = "⚠️ NOTA DE TRANSPARÊNCIA"

DISCLAIMER = """\
⚠️ NOTA DE TRANSPARÊNCIA (atualizada em 26/10/2026)
Este episódio apresenta a VISÃO e o ROADMAP conceitual do Paradigma IDD. Recursos citados como verificação formal com SMT Solvers (Z3/Dafny), Intent IR, Máquina de Diff de Intenções e protocolo formal em 4 fases são direções de pesquisa e NÃO estão implementados em ferramenta pública até esta data.
O que já existe e opera em produção no IDD: Comando Epistêmico, padrão Confirm-Once, DAV (Deterministic Action Vocabulary — vocabulário fechado e tipado de ações executadas por código determinístico), permission gate e governança por arquivos .intent.md.
🎙️ As vozes deste vídeo são sintéticas (TTS neural). A voz identificada como Eliézer Rosa é gerada por IA a partir de roteiro aprovado pelo autor.
"""

EP10_EXTRA = """\
📝 Esclarecimento: o próprio IDD usa especificação em linguagem natural estruturada (.intent.md). A crítica deste episódio se dirige a especificações sem vocabulário fechado de ações e sem invariantes verificáveis — não ao uso de Markdown em si.
"""

BASE_HASHTAGS = ["#IDD", "#IntentDrivenDevelopment", "#EngenhariaDeSoftware", "#SoftwareEngineering", "#VibeCoding", "#EliezerRosa"]
BASE_TAGS = ["IDD", "Intent-Driven Development", "Engenharia de Software", "Software Engineering", "Vibe Coding", "Eliezer Rosa"]

VIDEOS = {
    "cRx5yKG8n1k": {"ep": "04", "hashtags": ["#NeuroSymbolicAI", "#IAGenerativa"],
                    "tags": ["Neuro-Symbolic AI", "IA Neuro-Simbólica", "LLM", "IA Generativa"]},
    "TluPKmbwKmg": {"ep": "05", "hashtags": ["#PromptEngineering", "#DSPy"],
                    "tags": ["Prompt Engineering", "DSPy", "Compiladores", "LLM"]},
    "BZeVG2CffjU": {"ep": "06", "hashtags": ["#FormalMethods", "#MetodosFormais"],
                    "tags": ["Formal Methods", "Métodos Formais", "Invariantes de Domínio", "Testes de Software"]},
    "hQrqyx0uZk8": {"ep": "07", "hashtags": ["#ConstitutionalAI", "#SchemaEvolution"],
                    "tags": ["Constitutional AI", "Schema Evolution", "Migração de Banco de Dados", "Expand and Contract"]},
    "cDeFecLHP9A": {"ep": "08", "hashtags": ["#Sagas", "#DomainDrivenDesign", "#EventSourcing"],
                    "tags": ["Sagas", "Domain-Driven Design", "Event Sourcing", "Idempotência"]},
    "HAneRk6kqlE": {"ep": "09", "hashtags": ["#ModelContextProtocol", "#MCP", "#AgenticAI"],
                    "tags": ["Model Context Protocol", "MCP", "Agentic AI", "Agentes de IA"]},
    "6pvk9PbkuoE": {"ep": "10", "hashtags": ["#SpecDrivenDevelopment", "#GitHubCopilot", "#Aider"],
                    "tags": ["Spec-Driven Development", "GitHub Copilot", "Aider", "Agentes de Código"]},
}


def get_yt():
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return build('youtube', 'v3', credentials=Credentials.from_authorized_user_info(data))


def rebuild_description(old_desc: str, vid_id: str, cfg: dict) -> str:
    # Remove linhas de hashtags antigas (linhas que começam com '#')
    lines = [ln for ln in old_desc.splitlines() if not ln.strip().startswith("#")]
    body = "\n".join(lines).rstrip()

    if MARKER not in body:
        header = DISCLAIMER
        if cfg["ep"] == "10":
            header += EP10_EXTRA
        body = header + "\n" + body

    hashtags = " ".join(BASE_HASHTAGS + cfg["hashtags"])
    return body + "\n" + hashtags + "\n"


def main():
    yt = get_yt()
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ids = list(VIDEOS.keys())

    res = yt.videos().list(part="snippet,status", id=",".join(ids)).execute()
    items = {it["id"]: it for it in res.get("items", [])}

    if not DRY_RUN:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"backup_ep04_ep10_{stamp}.json"
        backup_file.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"💾 Backup salvo: {backup_file}")

    print("=" * 80)
    print(f"{'[DRY-RUN] ' if DRY_RUN else ''}CORREÇÃO DE TRANSPARÊNCIA — EPISÓDIOS 04 A 10")
    print("=" * 80)

    for vid_id in ids:
        cfg = VIDEOS[vid_id]
        it = items.get(vid_id)
        if not it:
            print(f"❌ Ep. {cfg['ep']} ({vid_id}) não encontrado.")
            continue

        sn = it["snippet"]
        st = it["status"]
        new_desc = rebuild_description(sn.get("description", ""), vid_id, cfg)
        new_tags = BASE_TAGS + cfg["tags"]

        desc_bytes = len(new_desc.encode("utf-8"))
        tags_chars = sum(len(t) for t in new_tags) + 2 * len(new_tags)
        problems = []
        if desc_bytes > 5000:
            problems.append(f"descrição com {desc_bytes} bytes (limite 5000)")
        if "<" in new_desc or ">" in new_desc:
            problems.append("descrição contém '<' ou '>'")
        if tags_chars > 500:
            problems.append(f"tags com ~{tags_chars} caracteres (limite 500)")

        print(f"\n--- Ep. {cfg['ep']} | {sn['title']}")
        print(f"    Descrição: {desc_bytes} bytes | Tags: {len(new_tags)} (~{tags_chars} chars)")
        if problems:
            print(f"    ❌ Pulando: {'; '.join(problems)}")
            continue
        if DRY_RUN:
            print("    (dry-run) Prévia do topo da descrição:")
            for ln in new_desc.splitlines()[:3]:
                print(f"      | {ln}")
            continue

        snippet_body = {
            "title": sn["title"],
            "description": new_desc,
            "tags": new_tags,
            "categoryId": sn.get("categoryId", "28"),
        }
        for k in ("defaultLanguage", "defaultAudioLanguage"):
            if k in sn:
                snippet_body[k] = sn[k]

        status_body = {
            "privacyStatus": st.get("privacyStatus", "public"),
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": True,
        }
        for k in ("embeddable", "license", "publicStatsViewable"):
            if k in st:
                status_body[k] = st[k]

        try:
            upd = yt.videos().update(
                part="snippet,status",
                body={"id": vid_id, "snippet": snippet_body, "status": status_body},
            ).execute()
            flag = upd.get("status", {}).get("containsSyntheticMedia")
            print(f"    ✅ Atualizado | containsSyntheticMedia={flag}")
        except Exception as e:
            print(f"    ⚠️ Falha ao atualizar snippet+status: {e}")
            print("    ↪ Tentando atualizar apenas o snippet...")
            try:
                yt.videos().update(part="snippet", body={"id": vid_id, "snippet": snippet_body}).execute()
                print("    ✅ Snippet atualizado (marcação de mídia sintética NÃO aplicada — fazer no YouTube Studio)")
            except Exception as e2:
                print(f"    ❌ Falha também no snippet: {e2}")

    print("\n" + "=" * 80)
    print("FIM")


if __name__ == "__main__":
    main()
