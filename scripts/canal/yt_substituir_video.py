"""Substitui um vídeo publicado por uma versão re-renderizada (o YouTube não permite trocar o arquivo).

Para cada par (antigo → mp4 novo):
  1. envia o mp4 como vídeo público com o mesmo título/descrição/tags/categoria do antigo,
     acrescentando no topo da descrição uma nota de revisão com link para a versão anterior;
  2. copia a miniatura do antigo (se disponível);
  3. coloca o novo em cada playlist do canal que continha o antigo, na mesma posição, e remove o antigo;
  4. torna o antigo NÃO LISTADO, com nota no topo apontando para a versão revisada.

O progresso fica em paradigma/_local/substituicoes.json; reexecutar retoma de onde parou.
Cota: cada envio custa ~1.600 unidades (cota diária padrão: 10.000). Ao estourar, o script para
e grava o estado; rode de novo no dia seguinte.

Uso (venv da produção):
    $PY scripts/canal/yt_substituir_video.py <token.json> <plano.json> [--aplicar]
plano.json: [{"antigo": "BZeVG2CffjU", "mp4": "C:/.../video.mp4"}, ...]
"""

import argparse
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

sys.stdout.reconfigure(encoding="utf-8")
ESTADO = Path(__file__).resolve().parents[2] / "paradigma" / "_local" / "substituicoes.json"
NOTA_NOVO = ("🔁 Versão revisada em {data}: a narração foi corrigida para distinguir o que está "
             "implementado do que é proposta. Versão anterior (não listada): https://youtu.be/{antigo}\n\n")
NOTA_ANTIGO = ("⚠️ Esta versão foi substituída. Assista à versão revisada: https://youtu.be/{novo}\n\n")


def playlists_com(yt, video_id):
    out, page = [], None
    while True:
        r = yt.playlists().list(part="id", mine=True, maxResults=50, pageToken=page).execute()
        for p in r["items"]:
            pg = None
            while True:
                it = yt.playlistItems().list(part="snippet", playlistId=p["id"], maxResults=50, pageToken=pg).execute()
                for i in it["items"]:
                    if i["snippet"]["resourceId"].get("videoId") == video_id:
                        out.append({"playlist": p["id"], "item": i["id"], "pos": i["snippet"]["position"]})
                pg = it.get("nextPageToken")
                if not pg:
                    break
        page = r.get("nextPageToken")
        if not page:
            return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("token")
    ap.add_argument("plano")
    ap.add_argument("--aplicar", action="store_true")
    a = ap.parse_args()
    yt = build("youtube", "v3", credentials=Credentials.from_authorized_user_info(
        json.loads(Path(a.token).read_text(encoding="utf-8"))))
    plano = json.loads(Path(a.plano).read_text(encoding="utf-8"))
    estado = json.loads(ESTADO.read_text(encoding="utf-8")) if ESTADO.exists() else {}
    from datetime import date
    hoje = date.today().strftime("%d/%m/%Y")

    for job in plano:
        antigo, mp4 = job["antigo"], Path(job["mp4"])
        st = estado.setdefault(antigo, {"etapa": "pendente"})
        if st["etapa"] == "concluido":
            print(f"✔ {antigo} já substituído por {st['novo']}")
            continue
        if not mp4.exists():
            print(f"✖ {antigo}: mp4 não encontrado ({mp4})")
            continue
        v = yt.videos().list(part="snippet,status", id=antigo).execute()["items"][0]
        sn = v["snippet"]
        pls = st.get("playlists") or playlists_com(yt, antigo)
        print(f"• {antigo} → {mp4.name} | {sn['title']} | playlists: {[p['playlist'] for p in pls]}")
        if not a.aplicar:
            continue
        try:
            if "novo" not in st:
                body = {"snippet": {"title": sn["title"],
                                    "description": NOTA_NOVO.format(data=hoje, antigo=antigo) + sn["description"],
                                    "tags": sn.get("tags", []), "categoryId": sn.get("categoryId", "27"),
                                    "defaultLanguage": sn.get("defaultLanguage", "pt-BR")},
                        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False}}
                req = yt.videos().insert(part="snippet,status", body=body,
                                         media_body=MediaFileUpload(str(mp4), chunksize=-1, resumable=True))
                resp = None
                while resp is None:
                    _, resp = req.next_chunk()
                st.update(novo=resp["id"], playlists=pls, etapa="enviado")
                ESTADO.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"  enviado: {resp['id']}")
                thumbs = sn.get("thumbnails", {})
                url = (thumbs.get("maxres") or thumbs.get("high") or {}).get("url")
                if url:
                    try:
                        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as t:
                            t.write(urllib.request.urlopen(url).read())
                        yt.thumbnails().set(videoId=resp["id"], media_body=MediaFileUpload(t.name)).execute()
                    except HttpError as e:
                        print(f"  (miniatura não copiada: {e.reason})")
            novo = st["novo"]
            if st["etapa"] == "enviado":
                for p in sorted(pls, key=lambda p: p["pos"]):
                    yt.playlistItems().insert(part="snippet", body={"snippet": {
                        "playlistId": p["playlist"], "position": p["pos"],
                        "resourceId": {"kind": "youtube#video", "videoId": novo}}}).execute()
                    yt.playlistItems().delete(id=p["item"]).execute()
                st["etapa"] = "playlists"
                ESTADO.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
            if st["etapa"] == "playlists":
                sn2 = {k: sn[k] for k in ("title", "categoryId", "tags", "defaultLanguage") if k in sn}
                sn2["description"] = NOTA_ANTIGO.format(novo=novo) + sn["description"]
                yt.videos().update(part="snippet", body={"id": antigo, "snippet": sn2}).execute()
                status = {k: v["status"][k] for k in ("embeddable", "license", "publicStatsViewable",
                                                      "selfDeclaredMadeForKids") if k in v["status"]}
                status["privacyStatus"] = "unlisted"
                yt.videos().update(part="status", body={"id": antigo, "status": status}).execute()
                st["etapa"] = "concluido"
                ESTADO.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"  ✔ concluído: {antigo} (não listado) → {novo}")
        except HttpError as e:
            ESTADO.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
            if "quota" in str(e).lower():
                print(f"⏸ Cota diária esgotada em {antigo}. Estado salvo; rode novamente amanhã.")
                return 2
            raise
    if not a.aplicar:
        print("PRÉVIA — nada foi alterado. Use --aplicar.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
