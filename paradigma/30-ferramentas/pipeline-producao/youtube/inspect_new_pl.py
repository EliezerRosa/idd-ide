import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")
PLAYLIST_ID = "PLW-P0rMNaKDs"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

res = yt.playlistItems().list(part="id,snippet", playlistId=PLAYLIST_ID, maxResults=50).execute()
print(f"Playlist {PLAYLIST_ID} - Total itens: {len(res.get('items', []))}")
for it in res.get("items", []):
    vid = it["snippet"]["resourceId"]["videoId"]
    title = it["snippet"]["title"]
    itemId = it["id"]
    print(f"  Item ID: {itemId} | Video ID: {vid} | Título: {title}")
