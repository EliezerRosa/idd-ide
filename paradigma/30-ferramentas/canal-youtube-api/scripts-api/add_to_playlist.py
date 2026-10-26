"""
Adiciona o vídeo IDD ao playlist 'Engenharia de Software' no YouTube.
Usa escopo youtube (full) para playlist management.
"""
import json
import os
import sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SEGREDOS_DIR = os.path.join(_SCRIPT_DIR, '..', 'segredos')
CLIENT_SECRETS = os.path.join(_SEGREDOS_DIR, 'client_secrets.json')
TOKEN_FILE = os.path.join(_SEGREDOS_DIR, 'token_youtube.json')
VIDEO_ID = 'lNEr7vb0Gyo'
PLAYLIST_NAME = 'ENGENHARIA DE SOFTWARE COM IA AUTÔNOMA'

SCOPES = ['https://www.googleapis.com/auth/youtube']

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
    return creds

def find_playlist(yt, name):
    """Localiza playlist pelo nome."""
    req = yt.playlists().list(part='snippet', mine=True, maxResults=50)
    while req:
        resp = req.execute()
        for item in resp.get('items', []):
            if item['snippet']['title'].lower() == name.lower():
                return item['id'], item['snippet']['title']
        req = yt.playlists().list_next(req, resp)
    return None, None

def add_video_to_playlist(yt, playlist_id, video_id):
    body = {
        'snippet': {
            'playlistId': playlist_id,
            'resourceId': {
                'kind': 'youtube#video',
                'videoId': video_id
            }
        }
    }
    result = yt.playlistItems().insert(part='snippet', body=body).execute()
    return result

def main():
    print("Autenticando no YouTube...")
    creds = get_credentials()
    yt = build('youtube', 'v3', credentials=creds)

    print(f"\nProcurando playlist '{PLAYLIST_NAME}'...")
    pl_id, pl_title = find_playlist(yt, PLAYLIST_NAME)

    if not pl_id:
        print("\nPlaylists disponíveis:")
        resp = yt.playlists().list(part='snippet', mine=True, maxResults=50).execute()
        for item in resp.get('items', []):
            print(f"  - {item['snippet']['title']} (ID: {item['id']})")
        print(f"\nERRO: Playlist '{PLAYLIST_NAME}' não encontrada.")
        sys.exit(1)

    print(f"Playlist encontrada: '{pl_title}' (ID: {pl_id})")
    print(f"\nAdicionando vídeo {VIDEO_ID} à playlist...")
    result = add_video_to_playlist(yt, pl_id, VIDEO_ID)
    item_id = result.get('id', 'N/A')
    print(f"Sucesso! Item de playlist criado: {item_id}")
    print(f"\nVídeo: https://www.youtube.com/watch?v={VIDEO_ID}")
    print(f"Playlist: https://www.youtube.com/playlist?list={pl_id}")

if __name__ == '__main__':
    main()
