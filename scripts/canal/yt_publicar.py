"""Publica no YouTube as descrições/títulos/tags revisados em scripts/canal/descricoes/*.json.

Padrão = PRÉVIA: gera um relatório de revisão (antes → depois) e não altera nada.
Com --aplicar: faz backup do estado atual (JSON) e atualiza vídeos, playlists e canal.
Com --reverter <backup.json>: restaura títulos/descrições/tags do backup.

Uso (venv da produção, que tem google-api-python-client):
    PY="C:\\Antigravity - IDD Refrigeração\\producao_yt\\.venv\\Scripts\\python.exe"
    $PY scripts/canal/yt_publicar.py <token.json> [--aplicar | --reverter backup.json]
"""

import argparse
import datetime
import difflib
import json
import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

HERE = Path(__file__).resolve().parent
DESC_DIR = HERE / "descricoes"
LOCAL = HERE.parents[1] / "paradigma" / "_local"
sys.stdout.reconfigure(encoding="utf-8")


def validate(title: str, desc: str, where: str) -> list[str]:
    errs = []
    if len(title) > 100:
        errs.append(f"{where}: título com {len(title)} > 100")
    if len(desc) > 5000:
        errs.append(f"{where}: descrição com {len(desc)} > 5000")
    if any(c in title + desc for c in "<>"):
        errs.append(f"{where}: contém < ou >")
    return errs


def load_drafts():
    videos, extra = {}, None
    for f in sorted(DESC_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            extra = data
            continue
        for v in data:
            videos[v["id"]] = v
    return videos, extra


def fetch_videos(yt, ids):
    out = {}
    for k in range(0, len(ids), 50):
        for v in yt.videos().list(part="snippet", id=",".join(ids[k:k + 50])).execute()["items"]:
            out[v["id"]] = v
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("token")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--aplicar", action="store_true")
    g.add_argument("--reverter")
    a = ap.parse_args()

    yt = build("youtube", "v3", credentials=Credentials.from_authorized_user_info(
        json.loads(Path(a.token).read_text(encoding="utf-8"))))
    channel = yt.channels().list(part="brandingSettings,snippet", mine=True).execute()["items"][0]
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

    if a.reverter:
        bk = json.loads(Path(a.reverter).read_text(encoding="utf-8"))
        for vid, sn in bk["videos"].items():
            yt.videos().update(part="snippet", body={"id": vid, "snippet": sn}).execute()
        for pid, sn in bk["playlists"].items():
            yt.playlists().update(part="snippet", body={"id": pid, "snippet": sn}).execute()
        if bk.get("channel"):
            yt.channels().update(part="brandingSettings", body={"id": channel["id"], "brandingSettings": bk["channel"]}).execute()
        print(f"Revertido a partir de {a.reverter}")
        return 0

    drafts, extra = load_drafts()
    current = fetch_videos(yt, list(drafts))
    missing = [i for i in drafts if i not in current]
    errs = [e for v in drafts.values() for e in validate(v["title"], v["description"], v["id"])]
    pls = {p["id"]: p for p in (extra or {}).get("playlists", [])}
    cur_pls = {}
    if pls:
        for p in yt.playlists().list(part="snippet", id=",".join(pls), maxResults=50).execute()["items"]:
            cur_pls[p["id"]] = p
        errs += [e for p in pls.values() for e in validate(p["title"], p["description"], p["id"])]

    # relatório de revisão
    rep = [f"# Revisão das mudanças no canal {channel['snippet']['title']} — {stamp}\n",
           f"Vídeos: {len(drafts)} (fora deste canal: {len(missing)}) · Playlists: {len(pls)} · "
           f"Canal: {'sim' if extra and extra.get('channel') else 'não'}\n"]
    if errs:
        rep.append("## ❌ Erros de validação\n" + "\n".join(f"- {e}" for e in errs) + "\n")
    if extra and extra.get("channel"):
        rep += ["## Canal\n", "**Antes:**\n", "```text", channel["snippet"].get("description", ""), "```",
                "**Depois:**\n", "```text", extra["channel"]["description"], "```\n"]
    for pid, p in pls.items():
        old = cur_pls.get(pid, {}).get("snippet", {})
        rep += [f"## Playlist {pid} — {p['title']}\n", f"_{p.get('nota', '')}_\n", "```diff",
                *difflib.unified_diff(old.get("description", "").splitlines(), p["description"].splitlines(), lineterm="", n=0),
                "```\n"]
    for vid, v in drafts.items():
        if vid not in current:
            continue
        old = current[vid]["snippet"]
        rep.append(f"## {v.get('selo', '')} [{vid}](https://youtu.be/{vid}) — {v['title']}\n")
        if old["title"] != v["title"]:
            rep.append(f"- **Título:** ~~{old['title']}~~ → **{v['title']}**")
        rep.append(f"- _{v.get('nota', '')}_\n")
        rep += ["```text", v["description"], "```\n"]
    out = LOCAL / f"REVISAO-YT-{stamp}.md"
    out.write_text("\n".join(rep), encoding="utf-8")
    print(f"Relatório: {out}")
    print(f"vídeos={len(drafts) - len(missing)} playlists={len(pls)} erros={len(errs)} fora-do-canal={len(missing)}")
    if errs:
        print("\n".join(errs))
        return 1
    if not a.aplicar:
        print("PRÉVIA — nada foi alterado. Use --aplicar para publicar.")
        return 0

    # backup completo antes de alterar
    backup = {"videos": {i: {k: current[i]["snippet"][k] for k in ("title", "description", "categoryId", "tags",
                                                                    "defaultLanguage") if k in current[i]["snippet"]}
                         for i in drafts if i in current},
              "playlists": {i: {k: p["snippet"][k] for k in ("title", "description")} for i, p in cur_pls.items()},
              "channel": channel.get("brandingSettings")}
    bk = LOCAL / f"yt_backup_{stamp}.json"
    bk.write_text(json.dumps(backup, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Backup: {bk}")

    ok = 0
    for vid, v in drafts.items():
        if vid not in current:
            continue
        sn = dict(backup["videos"][vid])
        sn.update(title=v["title"], description=v["description"])
        if v.get("tags"):
            sn["tags"] = v["tags"]
        yt.videos().update(part="snippet", body={"id": vid, "snippet": sn}).execute()
        ok += 1
    for pid, p in pls.items():
        if pid in cur_pls:
            yt.playlists().update(part="snippet", body={"id": pid, "snippet": {
                "title": p["title"], "description": p["description"]}}).execute()
    if extra and extra.get("channel"):
        bs = channel["brandingSettings"]
        bs["channel"]["description"] = extra["channel"]["description"]
        yt.channels().update(part="brandingSettings", body={"id": channel["id"], "brandingSettings": bs}).execute()
    print(f"Publicado: {ok} vídeos, {len(cur_pls)} playlists, canal={'sim' if extra else 'não'}. "
          f"Para desfazer: --reverter {bk}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
