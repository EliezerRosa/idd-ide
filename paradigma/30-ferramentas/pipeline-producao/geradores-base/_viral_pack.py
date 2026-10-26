"""
_viral_pack.py
Pacote de viralização do canal IDD:
  --chapters   : calcula timestamps e atualiza descrição com chapters (Ep1 + Ep2)
  --srt        : gera SRT PT+EN do Ep2 e faz upload para YouTube
  --all        : chapters + srt

Uso:
    python _viral_pack.py --all
    python _viral_pack.py --chapters
    python _viral_pack.py --srt
"""
import argparse
import json
import os
import struct
import wave
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ── Config ─────────────────────────────────────────────────────────────────────
BASE = Path(r'C:\Antigravity - RVM Designações')
TOKEN_FILE     = BASE / 'token_youtube.json'
TOKEN_CAPTIONS = BASE / 'token_youtube_captions.json'
CLIENT_SECRETS = BASE / 'client_secrets.json'

EP1_VIDEO_ID   = 'lNEr7vb0Gyo'
EP2_VIDEO_ID   = 'a3tIPjowBMk'
PLAYLIST_IDD   = 'PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7'

EP1_SCRIPT  = BASE / 'idd_p1_output' / 'script.json'
EP1_AUDIO   = BASE / 'idd_p1_output' / 'audio'
EP2_SCRIPT  = BASE / 'idd_p2_output' / 'script.json'
EP2_AUDIO   = BASE / 'idd_p2_output' / 'audio'
EP2_SRT_PT  = BASE / 'idd_p2_output' / 'captions_pt.srt'
EP2_SRT_EN  = BASE / 'idd_p2_output' / 'captions_en.srt'

GAP_MS = 300  # mesmo gap usado na montagem

# ── Chapters predefinidos (keywords para detectar o momento no script) ─────────
EP1_CHAPTER_KEYWORDS = [
    ('00:00', 'Introducao'),
    ('Base de Conhecimento IDD|Bem-vindos',         'Apresentacao: Base de Conhecimento IDD'),
    ('intencao humana|intencao|intenção humana',    'O que e IDD? Intencao como Artefato'),
    ('Invariantes|NUNCA podem',                    'Invariantes: regras nao-negociaveis'),
    ('IDD nao e|Vibe Cod|Intent-Driven.*pensa',    'O que IDD nao e: Vibe Coding'),
    ('GPS que recalcula|GPS|analogia',             'IDD como GPS: recalculo em tempo real'),
    ('Confirm-Once Pattern|Confirm.Once.*Pattern', 'Confirm-Once: autonomia com controle'),
    ('logica de negocio|logica.*negocio|voluntario nao pode|RVM', 'Exemplo Real: RVM Designacoes'),
    ('passivo.*documento|requisito.*passivo|Um requisito e passivo', 'Requisito Passivo vs Intencao Ativa'),
    ('Comece pequeno|proximo recurso|proximo.*recurso', 'Como comecar agora'),
]

EP2_CHAPTER_KEYWORDS = [
    ('00:00', 'Hook: Air France 447 e o Comando Epistemico'),
    ('epistemico|epistêmico|Epistemico|Epistêmico', 'Comando Epistemico: o QUE e o PORQUE'),
    ('operacional.*COMO|COMO.*operacional|delegado', 'Comando Operacional: o COMO'),
    ('Engelbart|Sutherland|Kay|Brooks',             'Linhagem: Engelbart ao IDD'),
    ('fundamentalmente opostos|Augmenting.*aumentar', 'Augmenting nao e Automating'),
    ('bayesian|bayesiana|Bayesian|credulidade',     'Fe Bayesiana vs Credulidade'),
    ('confirm.once.*fé|fé.*bayesiana.*aç|Confirm-Once.*runbook|runbook|intent.md', 'Confirm-Once e Runbooks intent.md'),
    ('Paes Mendon|2PC|DASL|DCAlgol',               'Marco Historico: 2PC nos anos 90'),
    ('conclus|encerr|resume|resumindo',             'Conclusao'),
]


# ── Utils ──────────────────────────────────────────────────────────────────────
def wav_duration_ms(path: Path) -> int:
    try:
        with wave.open(str(path), 'rb') as w:
            return int(w.getnframes() / w.getframerate() * 1000)
    except Exception:
        return 0


def build_timeline(script_path: Path, audio_dir: Path) -> list[dict]:
    with open(script_path, encoding='utf-8') as f:
        script = json.load(f)
    cursor_ms = 0
    timeline = []
    for item in script:
        idx = item.get('id', item.get('line', len(timeline) + 1))
        wav = audio_dir / f'line_{idx:04d}.wav'
        dur = wav_duration_ms(wav) if wav.exists() else 5000
        timeline.append({
            'idx': idx,
            'start_ms': cursor_ms,
            'end_ms': cursor_ms + dur,
            'dur_ms': dur,
            'speaker': item.get('speaker', ''),
            'pt': item.get('pt', item.get('text', '')),
            'en': item.get('en', ''),
        })
        cursor_ms += dur + GAP_MS
    return timeline


def ms_to_yt(ms: int) -> str:
    """MM:SS ou HH:MM:SS para YouTube chapters."""
    s = ms // 1000
    h = s // 3600; s -= h * 3600
    m = s // 60;   s -= m * 60
    if h:
        return f'{h}:{m:02d}:{s:02d}'
    return f'{m:02d}:{s:02d}'


def ms_to_srt(ms: int) -> str:
    h  = ms // 3_600_000; ms -= h * 3_600_000
    m  = ms //    60_000; ms -= m *    60_000
    s  = ms //     1_000; ms -= s *     1_000
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


import re

def find_chapter_line(timeline: list[dict], keyword_pattern: str, after_ms: int = 0) -> dict | None:
    """Busca a primeira linha APÓS after_ms onde o texto PT bate com o pattern regex."""
    pattern = re.compile(keyword_pattern, re.IGNORECASE)
    for entry in timeline:
        if entry['start_ms'] >= after_ms and pattern.search(entry['pt']):
            return entry
    return None


def compute_chapters(timeline: list[dict], keyword_specs: list[tuple]) -> list[tuple]:
    """Retorna lista de (timestamp_str, label) para YouTube chapters."""
    chapters = [('00:00', keyword_specs[0][1])]  # primeiro sempre 00:00
    last_ms = 0
    for pattern, label in keyword_specs[1:]:
        entry = find_chapter_line(timeline, pattern, after_ms=last_ms)
        if entry and entry['start_ms'] - last_ms >= 10_000:  # min 10s entre chapters
            ts = ms_to_yt(entry['start_ms'])
            chapters.append((ts, label))
            last_ms = entry['start_ms']
    return chapters


# ── YouTube auth ───────────────────────────────────────────────────────────────
def get_yt(token_file: Path, scopes: list[str] = None):
    if scopes is None:
        scopes = ['https://www.googleapis.com/auth/youtube']
    creds = Credentials.from_authorized_user_file(str(token_file), scopes)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build('youtube', 'v3', credentials=creds)


def get_yt_captions():
    """Credenciais com youtube.force-ssl para legendas."""
    scopes = ['https://www.googleapis.com/auth/youtube',
              'https://www.googleapis.com/auth/youtube.force-ssl']
    # Tenta primeiro o token de captions, senão usa o token principal
    for tf in [TOKEN_CAPTIONS, TOKEN_FILE]:
        if tf.exists():
            try:
                creds = Credentials.from_authorized_user_file(str(tf), scopes)
                if creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                return build('youtube', 'v3', credentials=creds)
            except Exception:
                continue
    raise RuntimeError('Nenhum token válido encontrado para captions.')


# ── TASK 1: Chapters ──────────────────────────────────────────────────────────
EP1_DESCRIPTION_BASE = (
    "Episodio 1 da serie Base de Conhecimento IDD - Intent-Driven Development.\n\n"
    "O que e IDD? Como intenção estruturada em linguagem natural vira especificação "
    "viva que um agente de IA executa autonomamente?\n\n"
    "Topicos: Definição de IDD, Vibe Coding vs IDD, Confirm-Once, "
    "Requisito Passivo vs Intencao Ativa, Runbooks de Intencao, Roadmap.\n\n"
    "Playlist: https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7\n"
    "Ep2: https://www.youtube.com/watch?v=a3tIPjowBMk\n\n"
    "#IDD #IntentDrivenDevelopment #GitHubCopilot #IA #EngenhariadeSoftware "
    "#AgenticAI #EliezerRosa #VibeCoding #ProgramacaoComIA #TechBR"
)

EP2_DESCRIPTION_BASE = (
    "Episodio 2 da serie Base de Conhecimento IDD - Intent-Driven Development.\n\n"
    "Distincao fundamental entre Comando Epistemico (o QUE e o PORQUE) "
    "e Comando Operacional (o COMO).\n\n"
    "Topicos: Air France 447, linhagem Engelbart ao IDD, Augmenting vs Automating, "
    "Fe Bayesiana vs Credulidade, Confirm-Once, runbooks intent.md, "
    "2PC customizado no Paes Mendonca nos anos 90.\n\n"
    "Playlist: https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7\n"
    "Ep1: https://www.youtube.com/watch?v=lNEr7vb0Gyo\n\n"
    "#IDD #IntentDrivenDevelopment #GitHubCopilot #IA #EngenhariadeSoftware "
    "#AgenticAI #EliezerRosa #ComandoEpistemico #VibeCoding #ProgramacaoComIA #TechBR"
)


def task_chapters():
    print('\n══ CHAPTERS ══════════════════════════════════════════')
    yt = get_yt(TOKEN_FILE)

    for label, video_id, script_path, audio_dir, keywords, desc_base in [
        ('Ep1', EP1_VIDEO_ID, EP1_SCRIPT, EP1_AUDIO, EP1_CHAPTER_KEYWORDS, EP1_DESCRIPTION_BASE),
        ('Ep2', EP2_VIDEO_ID, EP2_SCRIPT, EP2_AUDIO, EP2_CHAPTER_KEYWORDS, EP2_DESCRIPTION_BASE),
    ]:
        print(f'\n── {label}: {video_id} ──────────────────────')
        timeline = build_timeline(script_path, audio_dir)
        print(f'  Timeline: {len(timeline)} linhas, '
              f'duração total: {ms_to_yt(timeline[-1]["end_ms"])}')

        chapters = compute_chapters(timeline, keywords)
        print(f'  Chapters encontrados ({len(chapters)}):')
        chapters_text = ''
        for ts, ch_label in chapters:
            print(f'    {ts}  {ch_label}')
            chapters_text += f'{ts} {ch_label}\n'

        description = chapters_text.rstrip() + '\n\n' + desc_base

        yt.videos().update(
            part='snippet',
            body={
                'id': video_id,
                'snippet': {
                    'title': (
                        'IDD Ponto 1: O que e IDD?' if label == 'Ep1'
                        else 'IDD Ponto 2: Comando Epistemico vs. Operacional'
                    ),
                    'categoryId': '28',
                    'defaultLanguage': 'pt',
                    'description': description,
                }
            }
        ).execute()
        print(f'  ✅ Descrição com chapters atualizada: https://www.youtube.com/watch?v={video_id}')


# ── TASK 2: SRT Ep2 ───────────────────────────────────────────────────────────
def build_srt(entries: list[dict], lang: str) -> str:
    lines = []
    for i, e in enumerate(entries, start=1):
        start = ms_to_srt(e['start_ms'])
        end   = ms_to_srt(e['end_ms'])
        text  = e[lang].strip()
        if text:
            lines.append(f'{i}\n{start} --> {end}\n{text}\n')
    return '\n'.join(lines)


def task_srt():
    print('\n══ SRT EP2 ═══════════════════════════════════════════')
    timeline = build_timeline(EP2_SCRIPT, EP2_AUDIO)
    print(f'  Timeline: {len(timeline)} linhas')

    srt_pt = build_srt(timeline, 'pt')
    EP2_SRT_PT.write_text(srt_pt, encoding='utf-8')
    print(f'  ✅ SRT PT gerado: {EP2_SRT_PT}')

    srt_en = build_srt(timeline, 'en')
    EP2_SRT_EN.write_text(srt_en, encoding='utf-8')
    print(f'  ✅ SRT EN gerado: {EP2_SRT_EN}')

    print('\n  Fazendo upload das legendas...')
    try:
        yt = get_yt_captions()
    except Exception as e:
        print(f'  ⚠ Erro de auth para captions: {e}')
        print('  Usando token principal (pode falhar se não tiver force-ssl).')
        yt = get_yt(TOKEN_FILE)

    # Remover legendas existentes no Ep2
    existing = yt.captions().list(part='snippet', videoId=EP2_VIDEO_ID).execute()
    for cap in existing.get('items', []):
        yt.captions().delete(id=cap['id']).execute()
        print(f"  🗑 Legenda existente removida: {cap['snippet']['language']}")

    def upload_caption(srt_path: Path, lang: str, name: str):
        body = {
            'snippet': {
                'videoId': EP2_VIDEO_ID,
                'language': lang,
                'name': name,
                'isDraft': False,
            }
        }
        media = MediaFileUpload(str(srt_path), mimetype='application/octet-stream', resumable=False)
        resp = yt.captions().insert(part='snippet', body=body, media_body=media).execute()
        print(f'  ✅ Legenda {lang} ({name}) — ID: {resp["id"]}')

    upload_caption(EP2_SRT_PT, 'pt-BR', 'Portugues (Brasil)')
    upload_caption(EP2_SRT_EN, 'en', 'English')
    print('  Legendas Ep2 concluídas.')


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--chapters', action='store_true')
    parser.add_argument('--srt',      action='store_true')
    parser.add_argument('--all',      action='store_true')
    args = parser.parse_args()

    if not any([args.chapters, args.srt, args.all]):
        parser.print_help()
        return

    if args.chapters or args.all:
        task_chapters()
    if args.srt or args.all:
        task_srt()

    print('\n✅ Concluído!')


if __name__ == '__main__':
    main()
