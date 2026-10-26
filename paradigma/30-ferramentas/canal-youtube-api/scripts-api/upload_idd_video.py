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
_ACERVO_DIR = os.path.join(_SCRIPT_DIR, '..', '..', '04 - Acervo de Episódios')
CLIENT_SECRETS = os.path.join(_SEGREDOS_DIR, 'client_secrets.json')
TOKEN_FILE = os.path.join(_SEGREDOS_DIR, 'token.json')
VIDEO_FILE = os.path.join(_ACERVO_DIR, 'Ep01 - O que é IDD', 'idd_p1_output', 'idd_ponto1_o_que_e_idd.mp4')

TITLE = 'IDD — Ponto 1: O que é IDD? | Base de Conhecimento IDD Ep.1'
DESCRIPTION = """\
🎙️ Base de Conhecimento IDD — Episódio 1: O que é IDD?

Dois co-hosts — Eliezer Rosa (criador do IDD) e GitHub Copilot (IA) — em um deep-dive de ~24 minutos sobre Intent-Driven Development.

📌 Neste episódio:
• O que é IDD e por que surgiu
• As 6 propriedades fundamentais do IDD
• Diferenças entre Vibe-Coding, BDD, DDD e IDD
• O Confirm-Once Pattern
• Exemplo prático no projeto RVM Designações
• Como a IA muda o papel do desenvolvedor

🔗 Projeto RVM Designações: https://rvm-designacoes-antigravity.vercel.app
👤 Eliezer Rosa: https://github.com/EliezerRosa

#IDD #IntentDrivenDevelopment #IA #GitHubCopilot #SoftwareEngineering
"""
TAGS = ['IDD', 'Intent-Driven Development', 'GitHub Copilot', 'IA', 'desenvolvimento de software',
        'podcast', 'deep-dive', 'Eliezer Rosa', 'programação', 'arquitetura de software']
CATEGORY_ID = '22'   # People & Blogs — YouTube category
PRIVACY = 'public'   # 'public' | 'unlisted' | 'private'


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
    print(f'Enviando: {VIDEO_FILE}')
    print(f'Título  : {TITLE}')
    print(f'Status  : {PRIVACY}')
    body = {
        'snippet': {
            'title': TITLE,
            'description': DESCRIPTION,
            'tags': TAGS,
            'categoryId': CATEGORY_ID,
            'defaultLanguage': 'pt',
            'defaultAudioLanguage': 'pt',
        },
        'status': {'privacyStatus': PRIVACY}
    }
    media = MediaFileUpload(VIDEO_FILE, chunksize=4 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part='snippet,status', body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f'  Enviando... {pct}%', end='\r')

    video_id = response['id']
    print(f'\n✅ Upload completo!')
    print(f'   URL: https://www.youtube.com/watch?v={video_id}')
    return video_id


if __name__ == '__main__':
    youtube = get_authenticated_service()
    upload_video(youtube)
