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

PLAYLIST_ID = "PLMWN1EWhq5tM"
MELISSA_VIDEO_ID = "oPcNC5FXnHY"

print(f"Inserindo vídeo da Melissa ({MELISSA_VIDEO_ID}) na posição 0 da playlist {PLAYLIST_ID}...")
try:
    body = {
        "snippet": {
            "playlistId": PLAYLIST_ID,
            "position": 0,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": MELISSA_VIDEO_ID
            }
        }
    }
    resp = yt.playlistItems().insert(part="snippet", body=body).execute()
    print(f"[OK] Inserido com sucesso! Item ID: {resp['id']}")
except Exception as e:
    print(f"[!] Erro ao inserir vídeo da Melissa: {e}")

# Agora listamos a playlist completa
p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
print(f"\n==========================================")
print(f"PLAYLIST ATUALIZADA: IDD na Prática - Leigos ({len(p_items)} itens)")
print(f"==========================================")
for idx, p in enumerate(p_items, 1):
    sn = p["snippet"]
    print(f"{idx}. {sn['title']} [https://www.youtube.com/watch?v={sn['resourceId']['videoId']}]")
