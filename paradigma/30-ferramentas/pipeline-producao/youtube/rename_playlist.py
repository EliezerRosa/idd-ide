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
NEW_TITLE = "IDD na Prática - Refrigeração (Gerência de Manutenção)"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds_data = json.load(f)

creds = Credentials.from_authorized_user_info(creds_data, ["https://www.googleapis.com/auth/youtube"])
yt = build("youtube", "v3", credentials=creds)

pl_resp = yt.playlists().list(part="snippet", id=PLAYLIST_ID).execute()
if not pl_resp.get("items"):
    print(f"Playlist {PLAYLIST_ID} não encontrada.")
    sys.exit(1)

current_snippet = pl_resp["items"][0]["snippet"]
old_title = current_snippet["title"]
print(f"Título Antigo: {old_title}")

body = {
    "id": PLAYLIST_ID,
    "snippet": {
        "title": NEW_TITLE,
        "description": current_snippet.get("description", "Série oficial do Paradigma Intent-Driven Development (IDD) aplicada à Refrigeração Comercial e Industrial (HVAC-R)."),
        "defaultLanguage": "pt"
    }
}

update_resp = yt.playlists().update(part="snippet", body=body).execute()
print(f"Novo Título Atualizado: {update_resp['snippet']['title']}")
print("[OK] Playlist renomeada com sucesso no YouTube!")
