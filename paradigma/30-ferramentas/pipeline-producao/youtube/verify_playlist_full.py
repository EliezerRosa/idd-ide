"""Verifica o estado final e a ordenação de todos os itens da playlist
IDD — Base de Conhecimento (Série Completa).
"""

import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
PLAYLIST_ID = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"

def get_yt_service():
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    creds = Credentials.from_authorized_user_info(data)
    return build('youtube', 'v3', credentials=creds)

def verify():
    yt = get_yt_service()

    # Informações da playlist
    pl_res = yt.playlists().list(part="snippet,contentDetails", id=PLAYLIST_ID).execute()
    pl = pl_res.get("items", [])[0]
    print("=" * 80)
    print(f"PLAYLIST: {pl['snippet']['title']}")
    print(f"ID: {PLAYLIST_ID}")
    print(f"Total de Vídeos: {pl['contentDetails']['itemCount']}")
    print("=" * 80)

    # Itens
    items = []
    page_token = None
    while True:
        res = yt.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=PLAYLIST_ID,
            maxResults=50,
            pageToken=page_token
        ).execute()
        items.extend(res.get("items", []))
        page_token = res.get("nextPageToken")
        if not page_token:
            break

    print(f"\nLISTA COMPLETA DE VÍDEOS ({len(items)} itens):\n")
    for idx, it in enumerate(items):
        sn = it["snippet"]
        vid_id = sn["resourceId"]["videoId"]
        pos = sn.get("position", idx)
        title = sn["title"]
        print(f"[{pos:02d}] {title} (ID: {vid_id})")

    print("\n" + "=" * 80)

if __name__ == "__main__":
    verify()
