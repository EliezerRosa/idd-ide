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

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

res = yt.playlists().list(part="snippet", mine=True, maxResults=50).execute()
print(f"Total playlists: {len(res.get('items', []))}")
for pl in res.get('items', []):
    pl_id = pl['id']
    title = pl['snippet']['title']
    print(f"{pl_id} | {title}")
