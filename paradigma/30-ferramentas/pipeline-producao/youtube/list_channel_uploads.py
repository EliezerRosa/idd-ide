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

ch_resp = yt.channels().list(part="contentDetails,snippet", mine=True).execute()
for ch in ch_resp.get("items", []):
    print(f"Canal: {ch['snippet']['title']} (ID: {ch['id']})")
    uploads_id = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    print(f"Uploads Playlist ID: {uploads_id}")
    
    v_resp = yt.playlistItems().list(part="snippet", playlistId=uploads_id, maxResults=30).execute()
    for item in v_resp.get("items", []):
        sn = item["snippet"]
        print(f" - [{sn['resourceId']['videoId']}] {sn['title']} ({sn['publishedAt']})")
