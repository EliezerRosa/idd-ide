import json
import sys
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

playlist_id = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"

res = yt.playlistItems().list(
    part="snippet,contentDetails",
    playlistId=playlist_id,
    maxResults=50
).execute()

items = res.get("items", [])
print(f"Total de itens na Playlist 'IDD - Base de Conhecimento': {len(items)}")
for it in items:
    sn = it["snippet"]
    pos = sn.get("position")
    vid = sn.get("resourceId", {}).get("videoId")
    title = sn.get("title")
    print(f"[{pos}] ID: {vid} | Título: {title}")
