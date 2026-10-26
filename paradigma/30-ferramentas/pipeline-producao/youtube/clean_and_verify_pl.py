import json
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
PLAYLIST_ID = "PLNkRuKhFHiBs"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds_data = json.load(f)

creds = Credentials.from_authorized_user_info(creds_data, ["https://www.googleapis.com/auth/youtube"])
yt = build("youtube", "v3", credentials=creds)

items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
print(f"Total itens na playlist {PLAYLIST_ID}: {len(items)}")

for it in items:
    vid = it["snippet"]["resourceId"]["videoId"]
    pos = it["snippet"]["position"]
    title = it["snippet"]["title"]
    item_id = it["id"]
    print(f"Pos {pos} | ID: {vid} | Item: {item_id} | Title: {title}")
    if vid == "rUaJn-r-p8I":
        print(f" -> Removendo item antigo do Ep. 3 ({item_id})...")
        yt.playlistItems().delete(id=item_id).execute()
        print(" -> Removido com sucesso!")

print("\n--- Estado Atualizado ---")
items_after = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
for idx, it in enumerate(items_after):
    vid = it["snippet"]["resourceId"]["videoId"]
    title = it["snippet"]["title"]
    print(f"{idx}: [{vid}] {title}")
