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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep4b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_4B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD: O 4º Passo Sagrado - Amarração do Código às Invariantes com IA | Ep. 4B Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 4B: Metodologia IDD — O 4º Passo Sagrado: Amarração do Código às Invariantes com IA

Muitas equipes criam documentos bonitos e diagramas impecáveis, mas na hora de codificar tudo se perde em códigos confusos, repletos de bugs e gambiarras. Como a Metodologia IDD impede essa desconexão no Quarto Passo Sagrado?

Neste episódio metodológico, Eliézer Rosa e a equipe apresentam a Amarração Formal do Código às Invariantes:
No Paradigma IDD, a inteligência artificial não escreve código solto nem inventa funções aleatórias. Cada método gerado é um contrato executável que conecta diretamente as intenções do usuário (1B), as entidades do MER (2B) e as transições de estado da UML (3B).

Destaques da Metodologia IDD no 4º Passo:
• A Tríade da Amarração: Intenção — Invariante Matemática — Código Executável.
• Invariantes Ativas em Runtime: a função de cálculo de cotas possui anotações formais com asserts inegociáveis. Se a soma das cotas divergir em 1 único centavo do total da mesa, o sistema rejeita a transação antes de persistir no banco de dados.
• Governança e Decisão Crítica no Terminal:
  A IA Compilador submete o dilema de integração bancária: QR Code estático genérico vs. QR Code dinâmico com payload EMV e webhook idempotente.
  Decisão de Eliézer Rosa: compilar estritamente o QR Code dinâmico com expiração de 15 minutos para eliminar qualquer risco de pagamento parcial ou divergente.
• Os 4 Passos Sagrados Concluídos: Intenções (1B), MER Preliminar (2B), UML Preliminar (3B) e Amarração do Código (4B) formando o ciclo perfeito de software blindado.

⏱️ Capítulos do Episódio:
00:00 - Como Superar o Abismo entre Diagrama e Código?
00:15 - O 4º Passo Sagrado: Amarração Formal às Invariantes
00:36 - A Tríade da Amarração: Intenção, Invariante e Execução
00:54 - Contratos em Runtime e Proteção contra Furos Contábeis
01:12 - Terminal da IA: Submetendo o Dilema do QR Code Pix
01:28 - Decisão do Orquestrador: QR Code Dinâmico com Webhook
01:45 - Os 4 Passos Sagrados Consolidados com Sucesso
02:00 - Convite para o Episódio 5: A Grande Síntese Final IDD!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MetodologiaIDD #SoftwareEngineering #CleanArchitecture #Fintech #Pix #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Metodologia IDD",
    "Engenharia de Software",
    "Clean Architecture",
    "Racha de Conta",
    "Divisao de Conta",
    "Pix",
    "Fintech",
    "Contratos de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4B DO RACHA DE PIX NO YOUTUBE")
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
                    "position": 7, # Posição 7 na playlist
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 7!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Racha_Episodio_4B"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 7,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 4B do Racha!\n")

if __name__ == "__main__":
    main()
