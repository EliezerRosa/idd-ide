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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep5"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_5.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "A Grande Síntese do Paradigma IDD: Da Ideia Leiga ao Software Blindado com IA | Ep. 5 Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 5: A Grande Síntese Final do Paradigma IDD — Da Ideia Leiga à Produção com IA

Chegamos ao grande episódio final da nossa trilha do Racha de Conta e da série IDD na Prática! Mostramos como qualquer pessoa leiga consegue arquitetar e liderar a criação de sistemas complexos de ponta a ponta sem digitar uma única linha confusa de código.

Neste episódio especial de encerramento, Eliézer Rosa e a equipe apresentam a Consolidação Global do Paradigma IDD (Intent-Driven Development):
O segredo que muda tudo é inverter a ordem da criação de software. O desenvolvimento tradicional começava pelo código e sofria meses caçando bugs. No IDD, nós começamos pelo Modelo Mental: intenções claras, invariantes sagradas inquebráveis e governança ativa da inteligência artificial.

Destaques da Grande Síntese:
• A Trilha Sagrada dos 4 Passos Consolidados:
  - 1B: Intenções e Invariante da Soma Zero (Fundação de Negócio).
  - 2B: Modelo de Dados MER Puro sem SQL Prematuro (Entidades e Relações N:N).
  - 3B: Diagrama UML de Estados & Fluxos de Vida (Transições e Bloqueios).
  - 4B: Amarração do Código & Bateria de 200 Testes de Estresse (Zero Defeito).
• Homologação Global no Terminal da IA:
  A IA Compilador apresenta o relatório final dos 3 grandes ecossistemas da trilha:
  - Barbearia & Salão (8 episódios homologados).
  - Cafeteria & Padaria (8 episódios homologados).
  - Racha de Conta & Pix (9 episódios homologados).
  Conformidade de invariantes: 100%. Dívida técnica: 0%. Regressões em produção: 0.
• A Nova Era do Software: A simbiose perfeita onde a criatividade humana direciona, a metodologia governa e a IA compila com perfeição matemática!

⏱️ Capítulos do Episódio:
00:00 - A Revolução do Paradigma IDD: Invertendo a Criação
00:15 - O Fim do Código às Cegas: Governança Ativa com IA
00:36 - A Trilha Completa dos 4 Passos Sagrados
00:54 - Como a Metodologia Impede o Sofrimento e os Bugs
01:12 - Terminal da IA: Auditoria Global dos 3 Ecossistemas
01:28 - Homologação Concedida com Excelência Máxima
01:45 - A Simbiose Humano + IA na Prática Comercial
02:00 - Agradecimentos Finais e o Futuro da Engenharia de Software!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #EngenhariaDeSoftware #MetodologiaIDD #CleanCode #Fintech #Pix #NoCode #IA #InteligenciaArtificial #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Metodologia IDD",
    "Grande Sintese",
    "Engenharia de Software",
    "Clean Code",
    "Racha de Conta",
    "Pix",
    "Fintech",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 5 DO RACHA DE PIX NO YOUTUBE (GRANDE SÍNTESE FINAL)")
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

    creds = Credentials(
        token=creds_data["token"],
        refresh_token=creds_data["refresh_token"],
        token_uri=creds_data["token_uri"],
        client_id=creds_data["client_id"],
        client_secret=creds_data["client_secret"],
        scopes=SCOPES
    )

    youtube = build("youtube", "v3", credentials=creds)

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28", # Science & Technology
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(
        str(VIDEO_FILE),
        chunksize=1024*1024*5,
        resumable=True,
        mimetype="video/mp4"
    )

    print("\nIniciando upload para os servidores do YouTube...")
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = response["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")

    if THUMBNAIL_FILE.exists():
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE), mimetype="image/png")
            ).execute()
            print("[OK] Capa personalizada aplicada!")
        except Exception as e:
            print(f"[!] Erro ao enviar capa: {e}")

    try:
        youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": PLAYLIST_ID,
                    "position": 8, # Posição 8 na playlist (encerramento)
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 8!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Racha_Episodio_5"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 8,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 5 do Racha!\n")

if __name__ == "__main__":
    main()
