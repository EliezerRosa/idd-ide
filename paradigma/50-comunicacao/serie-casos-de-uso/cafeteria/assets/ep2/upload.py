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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep2"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_2.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Telas & Comanda Digital na Padaria: Do Cardápio ao KDS com IA | Ep. 2 Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 2: Telas Intuitivas, Comanda Digital & KDS da Cozinha em Tempo Real

No segundo episódio da série prática da Cafeteria e Padaria, saímos do mundo abstrato e mergulhamos nas interfaces de usuário reais do aplicativo!

Como um restaurante, cafeteria ou padaria atende dezenas de clientes simultaneamente sem papel e sem pedidos extraviados?
Com o Paradigma IDD, construímos uma arquitetura de telas dividida em 3 visões cirúrgicas:
1. O Cardápio Digital da Mesa: o cliente visualiza fotos apetitosas, escolhe acompanhamentos e envia o pedido pelo smartphone.
2. O KDS do Barista e da Cozinha: tela operacional que organiza a fila por ordem cronológica (RECEBIDO → EM_PREPARO → PRONTO) com baixa automática de ingredientes.
3. O Terminal do Caixa: fechamento de comanda instantâneo sem perda de tempo.

Destaque Especial de Governança com IA:
O Compilador IA detectou uma perigosa condição de corrida (Race Condition): o que acontece se o cliente na mesa tentar pedir um doce no celular enquanto o caixa já está processando o pagamento da conta?
A decisão de governança de Eliézer Rosa implementa o Lock Atômico Imediato na Comanda, garantindo zero divergência fiscal!

⏱️ Capítulos:
00:00 - As Telas do App: Eliminando o Papel e Gritos no Balcão
00:14 - Os 3 Papéis: Cardápio do Cliente, KDS da Cozinha e Caixa
00:30 - Estrutura de Dados: Vínculo de Mesas, Itens e Baixa de Insumos
00:42 - A Física da Comanda: Cálculo Matemático em Centavos
01:02 - Interação no Terminal: Dilema de Concorrência entre Mesa e Caixa
01:15 - A IA Detecta Race Condition no Pagamento via Pix
01:38 - Decisão de Eliézer Rosa: Lock Atômico Imediato no Fechamento
01:58 - Operação Ágil, Auditada e sem Papel
02:18 - Convite para o Episódio 2B: O MER da Cafeteria Modelado pela IA!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Cafeteria #Padaria #TelasDoApp #NoCode #SoftwareEngineering #IA #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Cafeteria",
    "Padaria",
    "KDS",
    "Comanda Digital",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 2 DA CAFETERIA NO YOUTUBE")
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
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep2"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2 da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
