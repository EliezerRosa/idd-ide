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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep1b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_1B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Requisitos com IA sem Código: Intenções & Invariantes na Cafeteria | Ep. 1B IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 1B Metodológico: Como o Desenvolvedor e o Leigo Especificam Requisitos e Invariantes com IA sem Gerar Código Prematuro

No primeiro episódio, conhecemos os desafios práticos de uma cafeteria no horário de pico. Agora, neste episódio metodológico, revelamos o Passo 1 do Paradigma IDD (Intent-Driven Development): a Análise Preliminar de Intenções e Invariantes Sagradas.

Por que é proibido gerar código nesta fase?
Se o desenvolvedor ou o leigo pedir para a inteligência artificial gerar código imediatamente, a IA criará suposições arbitrárias, gerando retrabalho e bugs caros. No IDD, a IA atua como compiladora conceitual, expondo dilemas e submetendo incertezas à governança humana!

Destaques deste Episódio Metodológico:
• Passo 1 do IDD: Especificação sem termos técnicos e sem código prematuro
• Intenções vs Invariantes: a diferença vital entre a experiência do usuário e as leis invioláveis da física da cafeteria
• Terminal da IA em Ação: O compilador detecta uma solicitação de cancelamento de item com status "EM PREPARO" na cozinha
• Governança Humana no Loop: Eliézer Rosa define a regra anti-desperdício com bloqueio atômico e autorização gerencial auditada
• O que vem a seguir: A base sólida para os próximos episódios com Telas, MER e o Código Vivo do App!

⏱️ Capítulos do Episódio:
00:00 - O Primeiro Passo Metodológico: Por que Proibir Código Agora?
00:14 - Análise Preliminar de Intenções e Invariantes Sagradas
00:36 - Distinção Conceitual: O Desejo Humano vs A Blindagem da Cafeteria
00:48 - A Física do Negócio: Estoque Atômico e Imutabilidade da Comanda
01:03 - Interação Metodológica: O Compilador IA no Terminal
01:13 - Dilema da Cozinha: Cancelamento de Item em Preparo na Bancada
01:36 - Governança de Eliézer Rosa: Invariante Anti-Desperdício e Auditoria
01:54 - Contrato Semântico Consolidado com Precisão Cirúrgica
02:07 - Próximos Passos: Telas do App e MER do Negócio com IA no Ep. 2 e 2B!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MetodologiaIDD #Cafeteria #Padaria #NoCode #SoftwareEngineering #IA #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Metodologia IDD",
    "Intention-Driven Development",
    "Requisitos",
    "Invariantes",
    "Cafeteria",
    "Padaria",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 1B DA CAFETERIA NO YOUTUBE")
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
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep1b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 1B da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
