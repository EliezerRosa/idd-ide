import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep1b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_1B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD na Prática - Ep. 1B: Requisitos & Invariantes Sagradas na Barbearia"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 1B: Especificação Preliminar de Requisitos com IA & Governança de Exceções

Como um engenheiro de software ou um leigo orquestra a Inteligência Artificial para especificar requisitos industriais sem se perder em termos técnicos difíceis e sem permitir que a IA invente regras erradas?

Neste episódio metodológico da nova playlist "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram o Primeiro Passo do Paradigma IDD: a Análise Preliminar de Intenções e Invariantes Sagradas, com proibição estrita de geração de código.

Destaques deste Episódio Metodológico:
• O Primeiro Passo do IDD: Intenção Humana e Invariantes de Negócio antes de qualquer linha de programação
• Intenção vs. Invariante: O objetivo de negócio versus a muralha matemática de proteção
• A Regra da Cadeira Única: Por que um profissional não pode ter dois agendamentos simultâneos
• Terminal da IA em Ação: A IA detectando casos de exceção na barbearia
• A Dúvida de Governança: Como lidar com atrasos de clientes sem prejudicar a fila do sábado
• Decisão do Mentor: Tolerância máxima de 10 minutos e transição automática para Cancelado por No-Show
• A Preparação para o MER: Como essas invariantes se transformarão em tabelas sem SQL no próximo episódio

⏱️ Capítulos:
00:00 - Introdução Metodológica: Como especificar requisitos com a IA sem código?
00:20 - O Primeiro Passo do IDD: Intenções e Invariantes Sagradas
00:45 - Diferenciando Intenção de Negócio e Invariante de Proteção
01:05 - A Invariante da Cadeira Única e a Divisão de Comissões
01:25 - Terminal da IA em Ação: A dúvida sobre tolerância de atrasos
01:45 - Decisão de Governança: Tolerância máxima de 10 minutos e No-Show
02:10 - Refinamento do Contrato Semântico sem Ambiguidade
02:25 - Encerramento do Ep. 1B & Chamada para o Ep. 2 (MER com IA)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Requisitos #Invariantes #Barbearia #SalaoDeBeleza #IA #NoCode #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Requisitos",
    "Invariantes",
    "Barbearia",
    "Salao de Beleza",
    "Metodologia",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 1B DA BARBEARIA NO YOUTUBE")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28",
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    media = MediaFileUpload(str(VIDEO_FILE), chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    new_video_id = resp["id"]
    print(f"\n[OK] Upload Concluído! Vídeo ID: {new_video_id}")
    print(f"     URL: https://www.youtube.com/watch?v={new_video_id}")

    if THUMBNAIL_FILE.exists():
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada!")
        except Exception as e:
            print(f"[!] Erro ao aplicar capa: {e}")

    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 1,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 1!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

if __name__ == "__main__":
    main()
