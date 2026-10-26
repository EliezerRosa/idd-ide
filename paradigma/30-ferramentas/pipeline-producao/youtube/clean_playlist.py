import json
import sys
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TOKEN_FILE = r'C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json'
with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds_data = json.load(f)
creds = Credentials.from_authorized_user_info(creds_data, ['https://www.googleapis.com/auth/youtube'])
yt = build('youtube', 'v3', credentials=creds)

items = yt.playlistItems().list(part='snippet', playlistId='PLNkRuKhFHiBs', maxResults=50).execute().get('items', [])
for it in items:
    vid = it['snippet']['resourceId']['videoId']
    if vid in ['fC1soefwCLE', 'LSeoDp7cOno']:
        try:
            yt.playlistItems().delete(id=it['id']).execute()
            print('Removido item obsoleto:', vid, it['id'])
        except Exception as e:
            print('Erro ao remover:', e)

items_now = yt.playlistItems().list(part='snippet', playlistId='PLNkRuKhFHiBs', maxResults=50).execute().get('items', [])
print('\nPlaylist Oficial Atualizada:')
for i, it in enumerate(items_now):
    print(f'  {i}. {it["snippet"]["title"]} [https://www.youtube.com/watch?v={it["snippet"]["resourceId"]["videoId"]}]')
