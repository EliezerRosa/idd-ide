import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")
with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

ch = yt.channels().list(part="snippet", mine=True).execute()
for c in ch.get("items", []):
    print("Canal Autenticado:", c["snippet"]["title"], "| ID:", c["id"])

pls = yt.playlists().list(part="snippet", mine=True, maxResults=50).execute().get("items", [])
print(f"\nTotal Playlists do Canal ({len(pls)}):")
for pl in pls:
    print(f"- [{pl['id']}] {pl['snippet']['title']}")
    items = yt.playlistItems().list(part="snippet", playlistId=pl["id"], maxResults=50).execute().get("items", [])
    for idx, it in enumerate(items):
        print(f"    {idx}. [{it['snippet']['resourceId']['videoId']}] {it['snippet']['title']}")
