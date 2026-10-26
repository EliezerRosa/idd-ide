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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep2b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_2B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD: O 2º Passo Sagrado - MER Preliminar com IA | Ep. 2B Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 2B: Metodologia IDD — O 2º Passo Sagrado: Modelo de Dados (MER) Preliminar com IA

Como o desenvolvedor e a IA modelam o banco de dados e as entidades de negócio sem escrever nenhuma linha precipitada de código SQL?

Neste episódio metodológico, Eliézer Rosa e a equipe apresentam o Segundo Passo Sagrado do Paradigma IDD: a Construção do Modelo Entidade-Relacionamento (MER) Preliminar em parceria com a inteligência artificial.

Destaques da Modelagem de Dados IDD:
• O Modelo Mental Puro: entidades que refletem estritamente a realidade física (Mesa, Participante, ItemComanda, ConsumoItem, CotaRateio e PayloadPix).
• A Matriz Associativa N:N (ConsumoItem): o segredo para registrar matematicamente divisões fracionárias de produtos compartilhados (ex: pizzas ou porções) sem duplicação de dados.
• Governança e Decisão Crítica no Terminal:
  A IA submete um dilema contábil ao orquestrador: "Se um item for cancelado ou o preço mudar após o fechamento, as cotas calculadas sofrerão mutação indevida?"
  Decisão de Eliézer Rosa: modelagem da entidade CotaRateio como snapshot imutável auditado com versionamento de fechamento.
• Imutabilidade Relacional: o esquema de dados impede, por design, furos de auditoria ou corrupção de valores pagos via Pix.

⏱️ Capítulos do Episódio:
00:00 - Como Modelar o Banco de Dados com a IA sem Código Prematuro?
00:15 - O 2º Passo Sagrado: MER Preliminar de Negócio
00:36 - Entidades-Núcleo: Mesa, Participantes e Pedidos
00:52 - A Matriz N:N (ConsumoItem): O Coração do Rateio Fracionário
01:10 - Terminal da IA: Submetendo o Dilema da Mutabilidade de Cotas
01:25 - Decisão do Orquestrador: Snapshot Imutável e Auditoria de Pix
01:45 - Blindagem do Modelo Relacional Aprovada com Rigor 100%
02:00 - Convite para o Episódio 3: Regras Avançadas e Casos de Borda!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MER #ModelagemDeDados #BancoDeDados #Fintech #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "MER",
    "Modelagem de Dados",
    "Banco de Dados",
    "Racha de Conta",
    "Divisao de Conta",
    "Pix",
    "Fintech",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 2B DO RACHA DE PIX NO YOUTUBE")
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
                "position": 3,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 3!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "racha_videos" not in manifest:
                manifest["racha_videos"] = {}
            manifest["racha_videos"]["ep2b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2B do Racha!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
