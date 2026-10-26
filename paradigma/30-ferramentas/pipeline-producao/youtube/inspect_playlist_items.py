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

resp = yt.playlistItems().list(part="snippet,contentDetails", playlistId="PLMWN1EWhq5tM", maxResults=50).execute()
items = resp.get("items", [])
print(f"Total itens retornados: {len(items)}")
for it in items:
    sn = it["snippet"]
    pos = sn.get("position")
    vid = sn.get("resourceId", {}).get("videoId")
    title = sn.get("title")
    print(f"Pos: {pos} | ItemID: {it['id']} | VideoId: {vid} | Title: {title}")
