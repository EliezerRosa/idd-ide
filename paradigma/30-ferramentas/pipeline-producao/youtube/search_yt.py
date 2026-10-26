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
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_youtube.json"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

queries = ["Melissa CRM", "Melissa IDD", "NexusLog CRM", "Eliezer J P Rosa"]
for q in queries:
    print(f"\n--- Busca por: {q} ---")
    s_resp = yt.search().list(part="snippet", q=q, maxResults=5).execute()
    for item in s_resp.get("items", []):
        id_info = item.get("id", {})
        vid = id_info.get("videoId")
        ch_title = item["snippet"]["channelTitle"]
        title = item["snippet"]["title"]
        print(f"[{id_info.get('kind')}] {title} | VideoID: {vid} | Canal: {ch_title}")
