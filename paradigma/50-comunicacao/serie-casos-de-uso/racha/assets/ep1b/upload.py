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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep1b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_1B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD: Intenções & Invariantes de Rateio com IA | Ep. 1B Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 1B: Metodologia IDD — O 1º Passo Sagrado: Intenções & Invariantes com IA

No episódio anterior, conhecemos o domínio do problema: a dor social de fechar a conta na mesa com amigos. Mas como uma pessoa leiga, sem conhecimento técnico, consegue sentar com a inteligência artificial e definir as regras de negócio de forma matematicamente infalível?

Neste episódio metodológico, Eliézer Rosa e a equipe apresentam o Primeiro Passo Sagrado da Metodologia IDD: a Extração de Intenções e a Blindagem das Invariantes Sagradas antes de qualquer linha de código!

Destaques da Metodologia de Intenções:
• A Linguagem Humana como Guia: o usuário expressa seus desejos em português claro ("quem comeu pizza paga pizza, quem bebeu chope paga chope").
• As Três Invariantes Sagradas do Racha:
  1. Invariante da Soma Zero: o total das cotas é igual ao valor da nota.
  2. Não-Cobrança Indevida: participante só participa do rateio dos itens que consumiu.
  3. Distribuição Atômica de Centavos: tratamento sistemático de divisões fracionárias periódicas.
• O Terminal da IA: a inteligência artificial processa o diálogo leigo, estrutura o Contrato de Intenções e solicita autorização de governança para gerar a especificação formal.
• Decisão de Eliézer Rosa: adição da obrigatoriedade de vinculação de chave Pix antes do fechamento da mesa para garantir liquidação imediata.

⏱️ Capítulos do Episódio:
00:00 - Como uma Pessoa Leiga Define Regras Complexas com a IA?
00:15 - O 1º Passo Sagrado: Extração de Intenções e Invariantes
00:36 - As 3 Invariantes Fundamentais: Soma Zero e Centavos Atômicos
00:54 - Matemática como Lei: A IA Impedida de Errar por Arredondamento
01:10 - Terminal da IA: Processando o Contrato de Intenções
01:25 - Governança no Loop: Obrigatoriedade da Chave Pix na Mesa
01:45 - Contrato de Intenções Formal Aprovado com Rigor 100%
02:00 - Convite para o Episódio 2: Design de Telas e Seleção de Itens!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Metodologia #EngenhariaDeSoftware #NoCode #IA #RachaDeConta #Pix #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Metodologia",
    "Engenharia de Software",
    "Racha de Conta",
    "Pix",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Invariantes",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 1B DO RACHA DE PIX NO YOUTUBE")
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

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "racha_videos" not in manifest:
                manifest["racha_videos"] = {}
            manifest["racha_videos"]["ep1b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 1B do Racha!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
