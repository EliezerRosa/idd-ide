import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SEGREDOS_DIR = os.path.join(_SCRIPT_DIR, '..', 'segredos')
CLIENT_SECRETS = os.path.join(_SEGREDOS_DIR, 'client_secrets.json')
TOKEN_FILE = os.path.join(_SEGREDOS_DIR, 'token.json')
VIDEO_FILE = r'C:\Antigravity - RVM Designações\rvm-designacoes-unified\public\tutorial_cs.mp4'


def get_authenticated_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
    return build('youtube', 'v3', credentials=creds)


def upload_video(youtube):
    body = {
        'snippet': {
            'title': 'RVM Designações — Tutorial Portal CS',
            'description': 'Tutorial completo do portal de Coordenação de Serviço do sistema RVM Designações.',
            'categoryId': '22'
        },
        'status': {'privacyStatus': 'unlisted'}
    }
    media = MediaFileUpload(VIDEO_FILE, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part='snippet,status', body=body, media_body=media)
    response = request.execute()
    video_id = response['id']
    print(f'Upload completo! URL: https://www.youtube.com/watch?v={video_id}')
    return video_id


if __name__ == '__main__':
    youtube = get_authenticated_service()
    upload_video(youtube)
