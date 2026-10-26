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
PLAYLIST_ID = "PLNkRuKhFHiBs"
SCOPES = ["https://www.googleapis.com/auth/youtube"]

def main():
    print("=" * 75)
    print("📋 AUDITORIA COMPLETA DA PLAYLIST OFICIAL: IDD na Prática - Leigos")
    print(f"   Playlist ID: {PLAYLIST_ID}")
    print("=" * 75)

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    res = yt.playlists().list(part="snippet,status", id=PLAYLIST_ID).execute()
    if not res.get("items"):
        print("[!] Playlist não encontrada!")
        return

    pl_info = res["items"][0]["snippet"]
    print(f"Título da Playlist: {pl_info['title']}")
    print(f"Canal Responsável : {pl_info['channelTitle']}")
    print("-" * 75)

    items = yt.playlistItems().list(
        part="snippet,status",
        playlistId=PLAYLIST_ID,
        maxResults=50
    ).execute().get("items", [])

    print(f"Total de Vídeos na Playlist: {len(items)}\n")
    for idx, item in enumerate(items):
        sn = item["snippet"]
        vid = sn["resourceId"]["videoId"]
        pos = sn["position"]
        title = sn["title"]
        print(f"[{pos:02d}] {title}")
        print(f"     URL: https://www.youtube.com/watch?v={vid} (Item ID: {item['id']})")

    print("\n" + "=" * 75)
    print("✅ AUDITORIA CONCLUÍDA")
    print("=" * 75)

if __name__ == "__main__":
    main()
