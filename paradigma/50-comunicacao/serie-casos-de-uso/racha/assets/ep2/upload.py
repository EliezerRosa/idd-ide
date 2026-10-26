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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep2"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_2.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Racha de Conta: Design de Telas, Comanda Digital & QR Code Pix | Ep. 2 Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 2: Design de Telas, Comanda Digital & QR Code Pix

Na mesa de bar ou restaurante, a última coisa que as pessoas querem é um aplicativo confuso ou preencher formulários burocráticos. A experiência precisa ser rápida, intuitiva e funcionar em três toques com um único dedo!

Neste segundo episódio, Eliézer Rosa e a equipe apresentam a arquitetura de interface humana do App de Racha de Conta, com a matriz visual "Quem Comeu o Quê" e a liquidação instantânea via Pix.

Destaques do Episódio:
• As 3 Zonas da Interface:
  1. Comanda da Mesa: itens pedidos pelo grupo com preços unitários e taxa de serviço.
  2. Matriz de Atribuição: clique no amigo e marque os itens consumidos (individuais ou compartilhados).
  3. Card Pix Instantâneo: cota pessoal recalculada em tempo real com QR Code dinâmico.
• Isolamento de Itens: se alguém bebeu chope artesanal sozinho, esse valor não contamina a conta de quem tomou apenas água.
• Terminal do Simulador IDD: IA processa o rateio da Mesa 4, distribui a taxa de serviço de 10% individualmente e comprova a Invariante da Soma Zero com erro de arredondamento igual a zero centavos.
• Liquidação em Menos de 10 Segundos: geração imediata do código Pix Copia e Cola para a conta do pagador da comanda.

⏱️ Capítulos do Episódio:
00:00 - O Dilema da Usabilidade na Mesa com Amigos
00:15 - As 3 Zonas Essenciais da Interface Mobile
00:34 - Matriz Visual de Atribuição: "Quem Comeu o Quê"
00:49 - Isolamento Rigoroso de Consumo por Participante
01:09 - Terminal da IA: Rateio em Tempo Real e Centavos Atômicos
01:26 - A Matemática Governando a Interface
01:43 - Card de Liquidação e Transferência Pix Imediata
01:57 - Convite para o Episódio 2B: O MER Preliminar com IA!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #RachaDeConta #Pix #Fintech #UIUX #MobileDesign #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Racha de Conta",
    "Divisao de Conta",
    "Pix",
    "Fintech",
    "UI UX Design",
    "Mobile Design",
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
    print("🚀 UPLOAD DO EPISÓDIO 2 DO RACHA DE PIX NO YOUTUBE")
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
                "position": 2,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 2!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "racha_videos" not in manifest:
                manifest["racha_videos"] = {}
            manifest["racha_videos"]["ep2"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2 do Racha!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
