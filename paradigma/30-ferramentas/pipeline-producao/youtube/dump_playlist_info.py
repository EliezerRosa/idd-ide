import json
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

res = yt.playlists().list(
    part="snippet,status",
    id="PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"
).execute()

output_path = BASE_DIR / "producao_yt" / "playlist_base_conhecimento_debug.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(res, f, indent=2, ensure_ascii=False)

print("Playlist debug gravado com sucesso.")
