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

queries = [
    "Melissa IDD",
    "Melissa Como uma leiga",
    "NexusLog CRM",
    "Como uma leiga criou um CRM",
    "Eliezer J P Rosa Melissa",
    "Eliezer Rosa Refrigeração"
]

for q in queries:
    print(f"\n==========================================")
    print(f"SEARCH: {q}")
    print(f"==========================================")
    resp = yt.search().list(part="snippet", q=q, maxResults=10, type="video").execute()
    for item in resp.get("items", []):
        vid = item["id"]["videoId"]
        sn = item["snippet"]
        print(f" - [{vid}] {sn['title']} | Canal: {sn['channelTitle']} (ID: {sn['channelId']})")
