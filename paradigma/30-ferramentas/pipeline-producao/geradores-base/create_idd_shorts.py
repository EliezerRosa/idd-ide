"""
Gera e faz upload de YouTube Shorts a partir do vídeo IDD Ep.1.
- Lê script.json + WAVs para calcular timestamps reais por linha
- Corta segmentos de 50-58s com ffmpeg (formato vertical 9:16)
- Faz upload como Shorts (título com #Shorts, descrição otimizada)

USO:
    python create_idd_shorts.py --list          # mostra timestamps de todas as linhas
    python create_idd_shorts.py --cut           # corta os 5 Shorts definidos em SHORTS_SEGMENTS
    python create_idd_shorts.py --upload        # faz upload dos Shorts cortados
    python create_idd_shorts.py --all           # cut + upload
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

BASE         = r'C:\Antigravity - RVM Designações'
OUTPUT_DIR   = os.path.join(BASE, 'idd_p1_output')
AUDIO_DIR    = os.path.join(OUTPUT_DIR, 'audio')
SCRIPT_JSON  = os.path.join(OUTPUT_DIR, 'script.json')
VIDEO_FILE   = os.path.join(OUTPUT_DIR, 'idd_ponto1_o_que_e_idd.mp4')
SHORTS_DIR   = os.path.join(OUTPUT_DIR, 'shorts')
TOKEN_FILE   = os.path.join(BASE, 'token_youtube.json')
CLIENT_SECRETS = os.path.join(BASE, 'client_secrets.json')
PLAYLIST_ID  = 'PLkbRMhsplHjbaVoM7tatoBmOKm5k3SHMy'

os.makedirs(SHORTS_DIR, exist_ok=True)

SCOPES = ['https://www.googleapis.com/auth/youtube']

# ──────────────────────────────────────────────────────────────
#  SEGMENTOS DOS SHORTS  (linha_inicio, linha_fim, slug, título)
#  Edite estes valores após rodar --list para ver os timestamps.
# ──────────────────────────────────────────────────────────────
SHORTS_SEGMENTS = [
    # (line_start, line_end, slug, titulo_curto)
    # line_start e line_end são índices 0-based no script.json
    (0,   5,  'hook',         'O que é IDD? Em 60 segundos #Shorts #IDD #GitHubCopilot #IA'),
    (31, 36,  'vibing',       'Vibe Coding vs IDD: qual a diferença? #Shorts #IDD #VibeCoding #IA'),
    (40, 44,  'gps',          'IDD é um GPS para seu código! #Shorts #IDD #IntentDrivenDevelopment #IA'),
    (50, 55,  'confirmonce',  'Confirm-Once: IA autônoma com controle total #Shorts #IDD #CopilotAgent #IA'),
    (111, 120, 'paradigma',   'Requisito passivo vs Intenção ativa: a virada de paradigma #Shorts #IDD #IA'),
]

SHORT_DESCRIPTION_TEMPLATE = """\
{preview}

▶ Episódio completo: https://www.youtube.com/watch?v=lNEr7vb0Gyo
📚 Série "Base de Conhecimento IDD" — Ep.1: O que é IDD?

#IDD #IntentDrivenDevelopment #GitHubCopilot #IAParaProgramadores #EngenhariadeSoftware #VibeCoding #AgenticAI #ProgramacaoComIA #EliezerRosa #TechBR #IA2026 #Shorts
"""


# ──────────────────────────────────────────────────────────────
#  UTILITÁRIOS
# ──────────────────────────────────────────────────────────────

def wav_duration_seconds(path: str) -> float:
    """Retorna duração em segundos de um arquivo WAV sem dependências externas."""
    try:
        with open(path, 'rb') as f:
            riff = f.read(4)
            if riff != b'RIFF':
                return 0.0
            f.read(4)   # chunk size
            f.read(4)   # 'WAVE'
            while True:
                chunk_id = f.read(4)
                if len(chunk_id) < 4:
                    return 0.0
                chunk_size = struct.unpack('<I', f.read(4))[0]
                if chunk_id == b'fmt ':
                    fmt = f.read(chunk_size)
                    sample_rate = struct.unpack('<I', fmt[4:8])[0]
                    byte_rate   = struct.unpack('<I', fmt[8:12])[0]
                elif chunk_id == b'data':
                    return chunk_size / byte_rate if byte_rate else 0.0
                else:
                    f.read(chunk_size)
    except Exception:
        return 0.0


def build_timeline(script: list) -> list[dict]:
    """Retorna lista de {line, start_s, end_s, speaker, text} com timestamps reais."""
    timeline = []
    cursor = 0.0
    for i, entry in enumerate(script):
        wav_path = os.path.join(AUDIO_DIR, f'line_{i:04d}.wav')
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


def cut_short(video: str, start_s: float, end_s: float, out_path: str):
    """Corta segmento do vídeo e converte para 9:16 (1080x1920) com letterbox."""
    duration = end_s - start_s
    # Crop central 9:16 a partir de 16:9 1080p → 608×1080, depois scale para 1080×1920
    # com pillarbox preto para manter qualidade sem distorção
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
    print(f'  ✅ {out_path} ({size_mb:.1f} MB)')
    return True


def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, 'w') as f:
                f.write(creds.to_json())
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
                     'IAParaProgramadores', 'VibeCoding', 'EngenhariadeSoftware',
                     'AgenticAI', 'EliezerRosa', 'TechBR', 'programacaoComIA'],
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
            print(f'    Enviando... {int(status.progress()*100)}%', end='\r')
    vid_id = response['id']
    print(f'    ✅ Short publicado: https://www.youtube.com/watch?v={vid_id}')

    # Adicionar à playlist da série
    try:
        yt.playlistItems().insert(
            part='snippet',
            body={'snippet': {
                'playlistId': PLAYLIST_ID,
                'resourceId': {'kind': 'youtube#video', 'videoId': vid_id}
            }}
        ).execute()
        print(f'    ✅ Adicionado à playlist')
    except Exception as e:
        print(f'    ⚠ Não adicionado à playlist: {e}')

    return vid_id


# ──────────────────────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--list',   action='store_true', help='Listar timestamps de todas as linhas')
    parser.add_argument('--cut',    action='store_true', help='Cortar os Shorts com ffmpeg')
    parser.add_argument('--upload', action='store_true', help='Fazer upload dos Shorts cortados')
    parser.add_argument('--all',    action='store_true', help='cut + upload')
    args = parser.parse_args()

    if not any([args.list, args.cut, args.upload, args.all]):
        parser.print_help()
        return

    # Carregar script
    with open(SCRIPT_JSON, encoding='utf-8') as f:
        script = json.load(f)

    timeline = build_timeline(script)
    total_s = timeline[-1]['end_s']
    print(f'Script: {len(timeline)} linhas | Duração total: {fmt(total_s)} ({total_s:.0f}s)')

    if args.list:
        print(f'\n{"IDX":>4}  {"START":>6}  {"END":>6}  {"DUR":>5}  {"SPK":>10}  TEXTO')
        print('-' * 100)
        for t in timeline:
            text = t['text_pt'][:60]
            print(f"{t['line']:>4}  {fmt(t['start_s']):>6}  {fmt(t['end_s']):>6}  "
                  f"{t['duration_s']:>5.1f}  {t['speaker']:>10}  {text}")
        return

    if args.cut or args.all:
        print('\n── CORTANDO SHORTS ──────────────────────────────────')
        for ls, le, slug, title in SHORTS_SEGMENTS:
            start_s = timeline[ls]['start_s']
            end_s   = timeline[min(le, len(timeline)-1)]['end_s']
            duration = end_s - start_s
            if duration > 60:
                print(f'  ⚠ {slug}: {duration:.1f}s > 60s — ajuste line_end')
            out_path = os.path.join(SHORTS_DIR, f'short_{slug}.mp4')
            print(f'\n[{slug}] linhas {ls}-{le} | {fmt(start_s)}-{fmt(end_s)} | {duration:.1f}s')
            cut_short(VIDEO_FILE, start_s, end_s, out_path)

    if args.upload or args.all:
        print('\n── FAZENDO UPLOAD DOS SHORTS ────────────────────────')
        creds = get_credentials()
        yt = build('youtube', 'v3', credentials=creds)

        for ls, le, slug, title in SHORTS_SEGMENTS:
            out_path = os.path.join(SHORTS_DIR, f'short_{slug}.mp4')
            if not os.path.exists(out_path):
                print(f'  ⚠ Arquivo não encontrado: {out_path} — rode --cut primeiro')
                continue

            # Preview = primeiras linhas do segmento
            preview_lines = [timeline[i]['text_pt'] for i in range(ls, min(ls+3, len(timeline)))]
            preview = ' '.join(preview_lines)[:200]
            description = SHORT_DESCRIPTION_TEMPLATE.format(preview=preview)

            print(f'\n[{slug}] {title}')
            upload_short(yt, out_path, title, description)

    print('\nConcluído!')


if __name__ == '__main__':
    main()
