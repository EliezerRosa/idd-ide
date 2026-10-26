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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep1"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_1.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Criando App de Barbearia com IA - Ep. 1: O Fim do Caderno & A Cadeira Única | IDD na Prática"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 1: A Dor do Agendamento Manual, Intenções Puras & A Invariante da Cadeira Única

Você já foi a uma barbearia ou salão de beleza no sábado e encontrou o caos? Dois clientes marcados para o mesmo barbeiro no mesmo horário, caderno de papel rasurado, pessoas esperando 40 minutos e discussão na recepção sobre a comissão dos profissionais?

Neste primeiro episódio prático da nova série "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram como o Paradigma Intent-Driven Development (IDD) constrói um aplicativo corporativo completo para barbearias e salões sem precisar digitar uma única linha de código manual.

Destaques deste Episódio:
• A Dor Real do Negócio: O caderno rasurado, encaixes forçados e atrito no fim do expediente
• O Primeiro Passo do IDD: A clareza da intenção humana antes de qualquer linha de programação
• As 3 Intenções Centrais do Salão:
  1. Autonomia Total: Cliente agenda pelo celular em menos de 1 minuto
  2. Agenda Sincronizada: Notificação e lembrete instantâneo via WhatsApp
  3. Comissão no Centavo: Divisão 60%/40% calculada automaticamente sem discussão
• A Invariante Sagrada da Cadeira Única: Por que um profissional nunca pode ter 2 clientes no mesmo horário
• Terminal da IA em Ação: A IA detectando o combo de serviços (Corte + Barba) e solicitando alocação contínua de 50 minutos
• Governança Ativa: Eliézer orientando o bloqueio temporal e garantindo que o próximo cliente só reserve após as 10:50

⏱️ Capítulos:
00:00 - O Caos do Agendamento Manual no Sábado da Barbearia
00:25 - O Paradigma IDD: Construindo a solução sem programadores caros
00:45 - As 3 Intenções Sagradas da Barbearia Imperial
01:10 - O Que Impede Reservas Duplas? A Invariante da Cadeira Única
01:30 - Terminal da IA em Ação: Combo de Corte e Barba detectado
01:50 - Decisão de Governança: Bloqueio cumulativo contínuo de 50 minutos
02:15 - A Visão da Usuária Leiga: Clareza de negócio sem código
02:35 - Encerramento do Ep. 1 & Chamada para o Ep. 1B Metodológico!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Barbearia #SalaoDeBeleza #Agendamento #IA #NoCode #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Barbearia",
    "Salao de Beleza",
    "Agendamento",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "Aplicativo",
    "Gestao de Salao"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 1 DA BARBEARIA NO YOUTUBE")
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
                "position": 0,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 0!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

if __name__ == "__main__":
    main()
