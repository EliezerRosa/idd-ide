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

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds_data = json.load(f)

creds = Credentials.from_authorized_user_info(creds_data, ["https://www.googleapis.com/auth/youtube"])
yt = build("youtube", "v3", credentials=creds)

pl = yt.playlists().list(part="snippet", id=PLAYLIST_ID).execute()
if pl.get("items"):
    print(f"Playlist Title: {pl['items'][0]['snippet']['title']}")
    print(f"Playlist ID: {PLAYLIST_ID}")
else:
    print(f"Playlist {PLAYLIST_ID} not found!")

items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute()
for i, it in enumerate(items.get("items", [])):
    pos = it["snippet"]["position"]
    title = it["snippet"]["title"]
    vid = it["snippet"]["resourceId"]["videoId"]
    print(f"[{i}] pos={pos} id={vid} title={title}")
