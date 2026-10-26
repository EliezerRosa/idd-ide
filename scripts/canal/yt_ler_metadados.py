"""Lê (somente leitura) título, descrição e tags de todos os uploads e playlists de um canal.

Uso (com o venv da produção, que tem google-api-python-client):
    "C:\\Antigravity - IDD Refrigeração\\producao_yt\\.venv\\Scripts\\python.exe" \
        scripts/canal/yt_ler_metadados.py <token.json> <saida.json>
"""

import json
import sys

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def main(token_path: str, out_path: str) -> None:
    with open(token_path, encoding="utf-8") as f:
        yt = build("youtube", "v3", credentials=Credentials.from_authorized_user_info(json.load(f)))

    ch = yt.channels().list(part="snippet,contentDetails,brandingSettings", mine=True).execute()["items"][0]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]

    ids, page = [], None
    while True:
        r = yt.playlistItems().list(part="contentDetails", playlistId=uploads, maxResults=50, pageToken=page).execute()
        ids += [i["contentDetails"]["videoId"] for i in r["items"]]
        page = r.get("nextPageToken")
        if not page:
            break

    videos = []
    for k in range(0, len(ids), 50):
        r = yt.videos().list(part="snippet,status", id=",".join(ids[k:k + 50])).execute()
        for v in r["items"]:
            s = v["snippet"]
            videos.append({
                "id": v["id"], "title": s["title"], "description": s["description"],
                "tags": s.get("tags", []), "categoryId": s.get("categoryId"),
                "publishedAt": s["publishedAt"], "privacy": v["status"]["privacyStatus"],
            })

    playlists, page = [], None
    while True:
        r = yt.playlists().list(part="snippet,status", mine=True, maxResults=50, pageToken=page).execute()
        playlists += [{"id": p["id"], "title": p["snippet"]["title"], "description": p["snippet"]["description"],
                       "privacy": p["status"]["privacyStatus"]} for p in r["items"]]
        page = r.get("nextPageToken")
        if not page:
            break

    out = {
        "channel": {"id": ch["id"], "title": ch["snippet"]["title"],
                    "description": ch["snippet"].get("description", ""),
                    "keywords": ch.get("brandingSettings", {}).get("channel", {}).get("keywords", "")},
        "videos": sorted(videos, key=lambda v: v["publishedAt"]),
        "playlists": playlists,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{out['channel']['title']}: {len(videos)} vídeos, {len(playlists)} playlists -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
