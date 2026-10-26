import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

creds_file = r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json"
creds = Credentials.from_authorized_user_info(json.load(open(creds_file)), ["https://www.googleapis.com/auth/youtube"])
yt = build("youtube", "v3", credentials=creds)

items = yt.playlistItems().list(part="snippet", playlistId="PLNkRuKhFHiBs", maxResults=50).execute().get("items", [])
for i, it in enumerate(items):
    print(f"{i}. {it['snippet']['title']} [{it['snippet']['resourceId']['videoId']}] (item_id: {it['id']})")
