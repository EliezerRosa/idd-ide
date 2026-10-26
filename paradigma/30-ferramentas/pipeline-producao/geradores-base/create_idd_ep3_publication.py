"""
create_idd_ep3_publication.py
Publicação completa do IDD Ep.3 — A Genealogia do IDD.

USO:
    python create_idd_ep3_publication.py --cut          # corta 8 Shorts (ffmpeg)
    python create_idd_ep3_publication.py --upload-main  # sobe vídeo principal + playlist
    python create_idd_ep3_publication.py --upload-shorts # sobe 8 Shorts
    python create_idd_ep3_publication.py --all          # cut + upload-main + upload-shorts
    python create_idd_ep3_publication.py --list         # mostra capítulos e shorts planejados
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

# ──────────────────────────────────────────────────────────────
#  CAMINHOS
# ──────────────────────────────────────────────────────────────
_BASE   = r'C:\Antigravity - RVM Designações\IDD Paradigma'
EP03    = os.path.join(_BASE, '04 - Acervo de Episódios', 'Ep03 - A Genealogia')
OUTPUT  = os.path.join(EP03, 'idd_p3_output')
AUDIO_DIR     = os.path.join(OUTPUT, 'audio')
SCRIPT_JSON   = os.path.join(OUTPUT, 'script.json')
VIDEO_FILE    = os.path.join(OUTPUT, 'idd_ponto3_a_genealogia_do_idd.mp4')
SHORTS_DIR    = os.path.join(OUTPUT, 'shorts')
SEGREDOS_DIR  = os.path.join(_BASE, '05 - Operação do Canal', 'segredos')
TOKEN_FILE    = os.path.join(SEGREDOS_DIR, 'token_youtube.json')
CLIENT_SECRETS= os.path.join(SEGREDOS_DIR, 'client_secrets.json')

PLAYLIST_ID   = 'PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7'   # IDD Base de Conhecimento
EP01_ID       = 'lNEr7vb0Gyo'
EP02_ID       = 'a3tIPjowBMk'

SCOPES = ['https://www.googleapis.com/auth/youtube']

os.makedirs(SHORTS_DIR, exist_ok=True)

# ──────────────────────────────────────────────────────────────
#  METADATA DO VÍDEO PRINCIPAL
# ──────────────────────────────────────────────────────────────
TITLE = 'IDD Ep.03 — A Genealogia do IDD | De Vannevar Bush a LLMs: 79 Anos de Linhagem'

DESCRIPTION = """\
A Genealogia do IDD — De Vannevar Bush (1945) a LLMs (2024): 79 anos de linhagem intelectual.

Eliezer Rosa e GitHub Copilot exploram como 13 visionarios construiram, peca por peca, o alicerce conceitual do Intent-Driven Development:

- Vannevar Bush (1945) — O principio da associacao (Memex)
- J.C.R. Licklider (1960) — Simbiose homem-computador
- Norbert Wiener (1948) — Cibernetica e feedback
- Douglas Engelbart (1962/1968) — Augmenting Human Intellect + Mother of All Demos
- Ivan Sutherland (1963) — Constraints declarativos (Sketchpad)
- Alan Kay (1968-72) — Dynabook, Smalltalk, objetos e mensagens
- Fred Brooks (1975/1986) — Integridade conceitual + No Silver Bullet
- Jakob Nielsen (1994) — Heuristicas de usabilidade
- Jef Raskin (2000) — Interface humana
- Tim Berners-Lee (1989/2001) — Web + Web Semantica
- Tom Gruber (1992+) — Ontologias
- Christopher Alexander (1977) — Pattern Language

Todos apontavam para o mesmo ponto: a intencao como artefato de primeira classe.
IDD e o no onde essas linhas convergem.

Capitulos:
00:00 Abertura: A Genealogia do IDD
00:31 Era das Origens: Bush, Licklider, Wiener e Engelbart (1945-1968)
02:07 Interface e Objetos: Sutherland e Alan Kay (1963-1972)
03:26 Engenharia Conceitual: Fred Brooks (1975-1986)
04:14 Usabilidade e Web Semantica: Nielsen, Raskin e Berners-Lee
05:18 Ontologias e Padroes: Gruber e Alexander
05:49 O Elo Perdido: A Grande Convergencia
06:53 A Virada Semantica: LLMs (2020-2025)
07:09 IDD como Destino: No de Convergencia, AEON e A Missao

Episodio 01 — O que e IDD: https://www.youtube.com/watch?v={ep1}
Episodio 02 — Comando Epistemico vs. Operacional: https://www.youtube.com/watch?v={ep2}
Playlist IDD — Base de Conhecimento: https://www.youtube.com/playlist?list={playlist}

Projeto RVM Designacoes: https://rvm-designacoes-antigravity.vercel.app
GitHub: https://github.com/EliezerRosa

#IDD #IntentDrivenDevelopment #HistoriaDoSoftware #VannevarBush #Engelbart #AlanKay
#FredBrooks #GenealogiaDoIDD #IAParaProgramadores #EngenhariadeSoftware
#DesenvolvimentoDeSoftware #AEON #EliezerRosa #TechBR #AgenticAI #ProgramacaoComIA
""".format(ep1=EP01_ID, ep2=EP02_ID, playlist=PLAYLIST_ID)

TAGS = [
    'IDD', 'IntentDrivenDevelopment', 'GitHubCopilot', 'IA',
    'GenealogiaDoIDD', 'VannevarBush', 'Engelbart', 'AlanKay', 'FredBrooks',
    'HistoriaDoSoftware', 'EngenhariadeSoftware', 'AgenticAI',
    'IAParaProgramadores', 'ProgramacaoComIA', 'EliezerRosa', 'TechBR',
    'AEON', 'WebSemantica', 'Ontologias', 'NilsemanticAI'
]

CHAPTERS_TEXT = """\
00:00 Abertura: A Genealogia do IDD
00:31 Era das Origens: Bush, Licklider, Wiener e Engelbart (1945-1968)
02:07 Interface e Objetos: Sutherland e Alan Kay (1963-1972)
03:26 Engenharia Conceitual: Fred Brooks (1975-1986)
04:14 Usabilidade e Web Semantica: Nielsen, Raskin e Berners-Lee
05:18 Ontologias e Padroes: Gruber e Alexander
05:49 O Elo Perdido: A Grande Convergencia
06:53 A Virada Semantica: LLMs (2020-2025)
07:09 IDD como Destino: No de Convergencia, AEON e A Missao"""

# ──────────────────────────────────────────────────────────────
#  SEGMENTOS DOS SHORTS (start_s, end_s, slug, titulo)
#  Timestamps derivados dos durações reais dos WAVs.
#  Todos dentro de 30–60s (ideal para YouTube Shorts).
# ──────────────────────────────────────────────────────────────
SHORTS_SEGMENTS = [
    (31,  63,  'vannevar_bush',
     'Vannevar Bush 1945: A Semente do Hipertexto que gerou o IDD #Shorts #IDD #VannevarBush'),
    (63,  95,  'licklider_wiener',
     'Simbiose Humano-Maquina: Licklider e Wiener — antes da IA existir #Shorts #IDD #HistoriaDoSoftware'),
    (95,  127, 'engelbart',
     'Mother of All Demos: Douglas Engelbart em 1968 ja mostrou o futuro #Shorts #IDD #Engelbart'),
    (127, 159, 'sutherland',
     'Ivan Sutherland 1963: Constraints Declarativos no Sketchpad #Shorts #IDD #Sutherland'),
    (159, 206, 'alan_kay',
     'Alan Kay: Dynabook, Smalltalk e a visao que moldou a computacao moderna #Shorts #IDD #AlanKay'),
    (206, 254, 'fred_brooks',
     'Fred Brooks: Integridade Conceitual e No Silver Bullet #Shorts #IDD #FredBrooks'),
    (254, 286, 'nielsen_raskin',
     'Nielsen e Raskin: Os profetas da interface humana #Shorts #IDD #Usabilidade'),
    (286, 318, 'berners_lee',
     'Tim Berners-Lee: Da Web a Web Semantica #Shorts #IDD #WebSemantica'),
]

SHORT_DESCRIPTION_TEMPLATE = """\
{first_line}

Episodio completo: https://www.youtube.com/watch?v={ep3_id}
Playlist IDD — Base de Conhecimento: https://www.youtube.com/playlist?list={playlist}

Ep.01: https://www.youtube.com/watch?v={ep1}
Ep.02: https://www.youtube.com/watch?v={ep2}

#IDD #IntentDrivenDevelopment #HistoriaDoSoftware #GenealogiaDoIDD #EliezerRosa
#IAParaProgramadores #EngenhariadeSoftware #TechBR #Shorts
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
            byte_rate = 0
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


def fmt_ts(seconds: float) -> str:
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f'{m:02d}:{s:02d}'


def build_timeline(script: list) -> list:
    timeline = []
    cursor = 0.0
    GAP = 0.30
    for i, entry in enumerate(script):
        idx = entry.get('id', i + 1)
        # Ep3 audio files: line_001_Eliezer.wav or line_001_IA.wav
        speaker = entry.get('speaker', 'Eliezer')
        wav_path_named = os.path.join(AUDIO_DIR, f'line_{idx:03d}_{speaker}.wav')
        wav_path_plain = os.path.join(AUDIO_DIR, f'line_{idx:03d}.wav')
        if os.path.exists(wav_path_named):
            wav_path = wav_path_named
        else:
            wav_path = wav_path_plain
        dur = wav_duration_seconds(wav_path) if os.path.exists(wav_path) else 6.0
        timeline.append({
            'line': i,
            'id': idx,
            'start_s': cursor,
            'end_s': cursor + dur,
            'duration_s': dur,
            'slide': entry.get('slide_number', 0),
            'slide_title': entry.get('slide_title', ''),
            'speaker': entry.get('speaker', ''),
            'text_pt': entry.get('pt', ''),
        })
        cursor += dur + GAP
    return timeline


def cut_short(video: str, start_s: float, end_s: float, out_path: str) -> bool:
    duration = end_s - start_s
    # Scale to 1080 wide (landscape), pad to 1080x1920 (vertical) for Shorts
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
    print(f'  Cortando: {fmt_ts(start_s)} -> {fmt_ts(end_s)} ({duration:.0f}s)')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'  ERRO ffmpeg:\n{result.stderr[-800:]}')
        return False
    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f'  OK: {os.path.basename(out_path)} ({size_mb:.1f} MB)')
    return True


def get_credentials():
    from google.auth.exceptions import RefreshError
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        refresh_ok = False
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                refresh_ok = True
            except RefreshError:
                print('Token expirado/revogado — iniciando nova autorizacao OAuth...')
        if not refresh_ok:
            from google_auth_oauthlib.flow import InstalledAppFlow
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
    return creds


def add_to_playlist(yt, video_id: str, playlist_id: str):
    body = {
        'snippet': {
            'playlistId': playlist_id,
            'resourceId': {'kind': 'youtube#video', 'videoId': video_id}
        }
    }
    yt.playlistItems().insert(part='snippet', body=body).execute()
    print(f'  Adicionado a playlist {playlist_id}')


def upload_video_api(yt, video_path: str, title: str, description: str,
                     tags: list, privacy: str = 'public') -> str:
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags,
            'categoryId': '28',   # Science & Technology
            'defaultLanguage': 'pt',
            'defaultAudioLanguage': 'pt',
        },
        'status': {
            'privacyStatus': privacy,
            'selfDeclaredMadeForKids': False
        }
    }
    media = MediaFileUpload(video_path, chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part='snippet,status', body=body, media_body=media)
    response = None
    while response is None:
        status_obj, response = req.next_chunk()
        if status_obj:
            pct = int(status_obj.progress() * 100)
            print(f'  Enviando... {pct}%', end='\r')
    video_id = response['id']
    print(f'\n  OK: https://www.youtube.com/watch?v={video_id}')
    return video_id


# ──────────────────────────────────────────────────────────────
#  COMANDOS
# ──────────────────────────────────────────────────────────────
def cmd_list():
    print('=== CAPITULOS ===')
    print(CHAPTERS_TEXT)
    print()
    print('=== SHORTS PLANEJADOS (8) ===')
    for start_s, end_s, slug, title in SHORTS_SEGMENTS:
        print(f'  {slug}: {fmt_ts(start_s)} -> {fmt_ts(end_s)} ({end_s - start_s}s)')
        print(f'    Titulo: {title[:80]}')
    print()
    print(f'Video principal: {VIDEO_FILE}')
    print(f'Playlist: https://www.youtube.com/playlist?list={PLAYLIST_ID}')


def cmd_cut():
    if not os.path.exists(VIDEO_FILE):
        print(f'ERRO: video nao encontrado: {VIDEO_FILE}')
        sys.exit(1)
    print(f'Cortando {len(SHORTS_SEGMENTS)} Shorts...')
    ok = 0
    for start_s, end_s, slug, title in SHORTS_SEGMENTS:
        out_path = os.path.join(SHORTS_DIR, f'short_{slug}.mp4')
        print(f'\n[{slug}]')
        if cut_short(VIDEO_FILE, float(start_s), float(end_s), out_path):
            ok += 1
    print(f'\n{ok}/{len(SHORTS_SEGMENTS)} Shorts cortados em: {SHORTS_DIR}')


def cmd_upload_main():
    print('=== UPLOAD PRINCIPAL ===')
    print(f'Titulo: {TITLE}')
    print(f'Video : {VIDEO_FILE}')
    if not os.path.exists(VIDEO_FILE):
        print(f'ERRO: video nao encontrado')
        sys.exit(1)
    creds = get_credentials()
    yt = build('youtube', 'v3', credentials=creds)
    vid_id = upload_video_api(yt, VIDEO_FILE, TITLE, DESCRIPTION, TAGS, privacy='public')
    print(f'\nAdicionando a playlist IDD...')
    add_to_playlist(yt, vid_id, PLAYLIST_ID)
    print(f'\n=== EP3 PUBLICADO ===')
    print(f'URL: https://www.youtube.com/watch?v={vid_id}')
    # Salva o ID para uso no upload dos Shorts
    id_file = os.path.join(OUTPUT, 'ep3_video_id.txt')
    with open(id_file, 'w') as f:
        f.write(vid_id)
    print(f'ID salvo em: {id_file}')
    return vid_id


def cmd_upload_shorts(from_index: int = 0):
    print('=== UPLOAD SHORTS ===')
    # Tenta ler o video_id do Ep3 já publicado
    id_file = os.path.join(OUTPUT, 'ep3_video_id.txt')
    ep3_id = ''
    if os.path.exists(id_file):
        ep3_id = open(id_file).read().strip()
        print(f'Ep3 video ID: {ep3_id}')
    else:
        print('AVISO: ep3_video_id.txt nao encontrado. '
              'Execute --upload-main primeiro para gerar o link do episodio completo.')

    # Carrega script para pegar first_line de cada segmento
    with open(SCRIPT_JSON, encoding='utf-8') as f:
        script = json.load(f)

    creds = get_credentials()
    yt = build('youtube', 'v3', credentials=creds)

    # Rastreia IDs publicados (evita duplicatas em re-runs)
    done_file = os.path.join(OUTPUT, 'shorts_published.json')
    done_ids: dict = {}
    if os.path.exists(done_file):
        done_ids = json.loads(open(done_file, encoding='utf-8').read())

    ok = 0
    for idx, (start_s, end_s, slug, title) in enumerate(SHORTS_SEGMENTS):
        if idx < from_index:
            print(f'  [SKIP idx {idx}] {slug}')
            continue
        if slug in done_ids:
            print(f'  [JA PUBLICADO] {slug} -> https://www.youtube.com/watch?v={done_ids[slug]}')
            ok += 1
            continue
        out_path = os.path.join(SHORTS_DIR, f'short_{slug}.mp4')
        if not os.path.exists(out_path):
            print(f'  PULO {slug}: arquivo nao existe ({out_path})')
            print(f'  Execute --cut primeiro.')
            continue

        # Pega a primeira fala do segmento
        first_line = ''
        for entry in script:
            ts = next((t for t in build_timeline(script) if t['id'] == entry['id']), None)
            if ts and ts['start_s'] >= start_s - 0.5:
                first_line = entry.get('pt', '')[:120]
                break

        desc = SHORT_DESCRIPTION_TEMPLATE.format(
            first_line=first_line,
            ep3_id=ep3_id,
            playlist=PLAYLIST_ID,
            ep1=EP01_ID,
            ep2=EP02_ID,
        )

        short_tags = [
            'IDD', 'IntentDrivenDevelopment', 'HistoriaDoSoftware',
            'GenealogiaDoIDD', 'EliezerRosa', 'TechBR', 'AgenticAI',
            'IAParaProgramadores', 'EngenhariadeSoftware', 'Shorts',
            slug.replace('_', '')
        ]

        print(f'\n[{slug}] Enviando...')
        try:
            vid_id = upload_video_api(yt, out_path, title, desc, short_tags, privacy='public')
        except Exception as e:
            print(f'  ERRO no upload de {slug}: {e}')
            print('  Salvo progresso. Retome com --upload-shorts')
            break
        print(f'  Adicionando a playlist...')
        add_to_playlist(yt, vid_id, PLAYLIST_ID)
        done_ids[slug] = vid_id
        with open(done_file, 'w', encoding='utf-8') as f:
            json.dump(done_ids, f, indent=2, ensure_ascii=False)
        ok += 1

    print(f'\n{ok}/{len(SHORTS_SEGMENTS)} Shorts publicados.')


# ──────────────────────────────────────────────────────────────
#  ENTRYPOINT
# ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='IDD Ep.3 — Publicação YouTube')
    parser.add_argument('--list',          action='store_true', help='Lista capitulos e shorts')
    parser.add_argument('--cut',           action='store_true', help='Corta Shorts com ffmpeg')
    parser.add_argument('--upload-main',   action='store_true', help='Sobe video principal')
    parser.add_argument('--upload-shorts', action='store_true', help='Sobe 8 Shorts')
    parser.add_argument('--from-index', type=int, default=0, help='Começa do Short N (0-based)')
    parser.add_argument('--all',           action='store_true', help='cut + upload-main + upload-shorts')
    args = parser.parse_args()

    if args.list:
        cmd_list()
    elif args.cut:
        cmd_cut()
    elif args.upload_main:
        cmd_upload_main()
    elif args.upload_shorts:
        cmd_upload_shorts(from_index=args.from_index)
    elif args.all:
        cmd_cut()
        cmd_upload_main()
        cmd_upload_shorts(from_index=0)
    else:
        parser.print_help()
