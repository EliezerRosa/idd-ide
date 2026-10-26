import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token_path = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")
with open(token_path, "r", encoding="utf-8") as f:
    creds_data = json.load(f)

creds = Credentials.from_authorized_user_info(creds_data, ["https://www.googleapis.com/auth/youtube"])
yt = build("youtube", "v3", credentials=creds)

res = yt.playlists().list(part="snippet,contentDetails", mine=True, maxResults=50).execute()
items = res.get("items", [])
print(f"Total Playlists encontradas na conta: {len(items)}\n")

target_pl_id = None
for pl in items:
    title = pl["snippet"]["title"]
    count = pl["contentDetails"]["itemCount"]
    pl_id = pl["id"]
    print(f"• [{pl_id}] {title} ({count} vídeos)")
    if "Base de Conhecimento" in title or "base de conhecimento" in title.lower():
        target_pl_id = pl_id

if not target_pl_id:
    # procurar por palavras chave
    for pl in items:
        if "IDD" in pl["snippet"]["title"]:
            print(f"  -> Candidata IDD: {pl['snippet']['title']} (ID: {pl['id']})")
else:
    print(f"\n==================================================")
    print(f"🔍 DETALHES DA PLAYLIST ALVO: {target_pl_id}")
    print(f"==================================================")
    pl_items = yt.playlistItems().list(part="snippet", playlistId=target_pl_id, maxResults=50).execute().get("items", [])
    for idx, it in enumerate(pl_items):
        sn = it["snippet"]
        vid = sn["resourceId"]["videoId"]
        pos = sn.get("position", idx)
        print(f"  [{pos}] {sn['title']} (https://www.youtube.com/watch?v={vid})")
