import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_youtube.json")
with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

for pl_id in ["PLAyb9-CLqwPA", "PLNkRuKhFHiBs"]:
    try:
        pl_info = yt.playlists().list(part="snippet", id=pl_id).execute().get("items", [])
        title = pl_info[0]["snippet"]["title"] if pl_info else "Desconhecida"
        print(f"\n==========================================")
        print(f"PLAYLIST: {title} ({pl_id})")
        print(f"==========================================")
        items = yt.playlistItems().list(part="snippet", playlistId=pl_id, maxResults=50).execute().get("items", [])
        for i, item in enumerate(items):
            sn = item["snippet"]
            print(f"  {i}. [{item['id']}] {sn['title']} ({sn['resourceId']['videoId']})")
    except Exception as e:
        print(f"Erro ao listar {pl_id}: {e}")
