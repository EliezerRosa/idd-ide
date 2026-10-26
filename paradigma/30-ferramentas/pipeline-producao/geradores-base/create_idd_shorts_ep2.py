"""
create_idd_shorts_ep2.py
Corta e faz upload de 5 YouTube Shorts do IDD Ep.2 (Comando Epistêmico vs. Operacional).

USO:
    python create_idd_shorts_ep2.py --list    # mostra timestamps de todas as linhas
    python create_idd_shorts_ep2.py --cut     # corta os 5 Shorts
    python create_idd_shorts_ep2.py --upload  # faz upload dos Shorts cortados
    python create_idd_shorts_ep2.py --all     # cut + upload
"""
import argparse
import json
import os
import struct
import subprocess
import sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

BASE       = r'C:\Antigravity - RVM Designações'
OUTPUT_DIR = os.path.join(BASE, 'idd_p2_output')
AUDIO_DIR  = os.path.join(OUTPUT_DIR, 'audio')
SCRIPT_JSON= os.path.join(OUTPUT_DIR, 'script.json')
VIDEO_FILE = os.path.join(OUTPUT_DIR, 'idd_ponto2_comando_epistemico.mp4')
SHORTS_DIR = os.path.join(OUTPUT_DIR, 'shorts')
TOKEN_FILE = os.path.join(BASE, 'token_youtube.json')
CLIENT_SECRETS = os.path.join(BASE, 'client_secrets.json')
PLAYLIST_ID = 'PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7'
EP2_VIDEO_ID = 'a3tIPjowBMk'

os.makedirs(SHORTS_DIR, exist_ok=True)

SCOPES = ['https://www.googleapis.com/auth/youtube']

# ──────────────────────────────────────────────────────────────
#  SEGMENTOS DOS SHORTS
#  (line_start, line_end): índices 0-based no script.json
#  Duração alvo: 50-60s por Short
# ──────────────────────────────────────────────────────────────
SHORTS_SEGMENTS = [
    # (line_start, line_end, slug, titulo)
    (0,  5, 'hook_af447',
     'Air France 447 e o Comando Epistêmico: a analogia que muda tudo #Shorts #IDD #IA'),
    (6, 12, 'epistemico_vs_operacional',
     'Epistêmico vs Operacional: a fronteira mais importante no desenvolvimento com IA #Shorts #IDD'),
    (25, 32, 'augmenting_vs_automating',
     'Augmenting vs Automating: por que a diferença muda TUDO #Shorts #IDD #GitHubCopilot'),
    (30, 36, 'fe_bayesiana',
     'Fé Bayesiana vs Credulidade: como confiar na IA com sabedoria #Shorts #IDD #AgenticAI'),
    (42, 48, 'paes_mendonca_2pc',
     'Como implementei um 2PC nos anos 90 sem biblioteca nenhuma #Shorts #IDD #EliezerRosa'),
]

SHORT_DESCRIPTION_TEMPLATE = """\
{preview}

Episodio completo: https://www.youtube.com/watch?v={ep2_id}
Playlist IDD: https://www.youtube.com/playlist?list={playlist}

#IDD #IntentDrivenDevelopment #GitHubCopilot #IAParaProgramadores #EngenhariadeSoftware
#ComandoEpistemico #AgenticAI #ProgramacaoComIA #EliezerRosa #TechBR #IA2026 #Shorts
"""

# ──────────────────────────────────────────────────────────────
#  UTILITÁRIOS
# ──────────────────────────────────────────────────────────────
def wav_duration_seconds(path: str) -> float:
    try:
        with open(path, 'rb') as f:
            riff = f.read(4)
            if riff != b'RIFF':
                return 0.0
            f.read(4); f.read(4)  # chunk size + 'WAVE'
            while True:
                chunk_id = f.read(4)
                if len(chunk_id) < 4:
                    return 0.0
                chunk_size = struct.unpack('<I', f.read(4))[0]
                if chunk_id == b'fmt ':
                    fmt = f.read(chunk_size)
                    byte_rate = struct.unpack('<I', fmt[8:12])[0]
                elif chunk_id == b'data':
                    return chunk_size / byte_rate if byte_rate else 0.0
                else:
                    f.read(chunk_size)
    except Exception:
        return 0.0


def build_timeline(script: list) -> list[dict]:
    timeline = []
    cursor = 0.0
    for i, entry in enumerate(script):
        # WAV files são line_0001.wav ... line_0142.wav (1-based)
        idx = entry.get('id', i + 1)
        wav_path = os.path.join(AUDIO_DIR, f'line_{idx:04d}.wav')
        dur = wav_duration_seconds(wav_path) if os.path.exists(wav_path) else 6.0
        timeline.append({
            'line': i,
            'start_s': cursor,
            'end_s': cursor + dur,
            'duration_s': dur,
            'speaker': entry.get('speaker', ''),
            'text_pt': entry.get('pt', entry.get('text', '')),
        })
        cursor += dur
    return timeline


def fmt(seconds: float) -> str:
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f'{m:02d}:{s:02d}'


def cut_short(video: str, start_s: float, end_s: float, out_path: str) -> bool:
    duration = end_s - start_s
    vf = (
        'scale=1080:1920:force_original_aspect_ratio=decrease,'
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black'
    )
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start_s),
        '-i', video,
        '-t', str(duration),
        '-vf', vf,
        '-c:v', 'libx264', '-crf', '22', '-preset', 'fast',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        out_path
    ]
    print(f'  ffmpeg: {fmt(start_s)} → {fmt(end_s)} ({duration:.1f}s)')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'  ERRO ffmpeg:\n{result.stderr[-500:]}')
        return False
    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f'  ✅ {os.path.basename(out_path)} ({size_mb:.1f} MB)')
    return True


def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            from google_auth_oauthlib.flow import InstalledAppFlow
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
    return creds


def upload_short(yt, video_path: str, title: str, description: str):
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': ['IDD', 'IntentDrivenDevelopment', 'GitHubCopilot', 'Shorts',
                     'IAParaProgramadores', 'EngenhariadeSoftware', 'AgenticAI',
                     'ComandoEpistemico', 'ProgramacaoComIA', 'EliezerRosa', 'TechBR'],
            'categoryId': '28',
            'defaultLanguage': 'pt',
            'defaultAudioLanguage': 'pt',
        },
        'status': {'privacyStatus': 'public', 'selfDeclaredMadeForKids': False}
    }
    media = MediaFileUpload(video_path, chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part='snippet,status', body=body, media_body=media)
    response = None
    while response is None:
        status, response = req.next_chunk()
        if status:
            print(f'    Enviando... {int(status.progress() * 100)}%', end='\r')
    vid_id = response['id']
    print(f'    ✅ Short publicado: https://www.youtube.com/watch?v={vid_id}')

    try:
        yt.playlistItems().insert(
            part='snippet',
            body={'snippet': {
                'playlistId': PLAYLIST_ID,
                'resourceId': {'kind': 'youtube#video', 'videoId': vid_id}
            }}
        ).execute()
        print(f'    ✅ Adicionado à playlist IDD')
    except Exception as e:
        print(f'    ⚠ Playlist: {e}')
    return vid_id


# ──────────────────────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--list',   action='store_true', help='Mostra timeline completa')
    parser.add_argument('--cut',    action='store_true', help='Corta os Shorts')
    parser.add_argument('--upload', action='store_true', help='Faz upload dos Shorts')
    parser.add_argument('--all',    action='store_true', help='cut + upload')
    args = parser.parse_args()

    if not any([args.list, args.cut, args.upload, args.all]):
        parser.print_help()
        return

    with open(SCRIPT_JSON, encoding='utf-8') as f:
        script = json.load(f)

    timeline = build_timeline(script)

    if args.list:
        print(f'\n{"LINE":>4} {"MM:SS":>6}  {"SPEAKER":8}  TEXT[:60]')
        for t in timeline:
            print(f'[{t["line"]:03d}] {fmt(t["start_s"]):>5}  '
                  f'{t["speaker"]:8}  {t["text_pt"][:60]}')

    if args.cut or args.all:
        print('\n── CORTANDO SHORTS ──────────────────────────────────')
        for line_start, line_end, slug, title in SHORTS_SEGMENTS:
            out_path = os.path.join(SHORTS_DIR, f'short_ep2_{slug}.mp4')
            if os.path.exists(out_path):
                print(f'  ⏭ Já existe: {slug}')
                continue
            start_s = timeline[line_start]['start_s']
            end_s   = timeline[min(line_end, len(timeline) - 1)]['end_s']
            print(f'\n  [{slug}] linhas {line_start}-{line_end}')
            cut_short(VIDEO_FILE, start_s, end_s, out_path)

    if args.upload or args.all:
        print('\n── FAZENDO UPLOAD DOS SHORTS ─────────────────────────')
        creds = get_credentials()
        yt = build('youtube', 'v3', credentials=creds)

        for line_start, line_end, slug, title in SHORTS_SEGMENTS:
            out_path = os.path.join(SHORTS_DIR, f'short_ep2_{slug}.mp4')
            if not os.path.exists(out_path):
                print(f'  ⚠ Arquivo não encontrado: {out_path} (rode --cut primeiro)')
                continue
            start_s = timeline[line_start]['start_s']
            end_s   = timeline[min(line_end, len(timeline) - 1)]['end_s']
            preview_lines = [t['text_pt'] for t in timeline[line_start:line_end + 1]]
            preview = ' '.join(preview_lines)[:200]
            description = SHORT_DESCRIPTION_TEMPLATE.format(
                preview=preview, ep2_id=EP2_VIDEO_ID, playlist=PLAYLIST_ID
            )
            print(f'\n  Uploading: {slug}')
            upload_short(yt, out_path, title, description)

    print('\n✅ Concluído!')


if __name__ == '__main__':
    main()
