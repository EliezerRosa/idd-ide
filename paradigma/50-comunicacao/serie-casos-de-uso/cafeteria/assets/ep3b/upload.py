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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep3b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_3B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Modelagem UML & FSM com IA sem Código: O Comportamento da Cafeteria | Ep. 3B IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 3B Metodológico: Como o Desenvolvedor e o Leigo Constróem Diagramas UML e a Máquina de Estados com IA

No episódio três vimos o código vivo amarrado ao banco. Agora, neste episódio metodológico, mergulhamos no Passo 3 do Paradigma IDD (Intent-Driven Development): a Modelagem Comportamental UML com a IA!

Por que a UML é indispensável antes de rodar o código?
Porque as telas e o banco guardam a estrutura, mas é a Máquina de Estados Finitos (FSM) que governa a esteira física da cozinha! Um restaurante sem estados bem definidos sofre com pedidos pulando etapas, atrasos na chapa e fraudes de cancelamento.

Destaques deste Episódio Metodológico:
• Os 3 Pilares UML: Casos de Uso dos Atores, Diagrama de Classes e Máquina de Estados
• A FSM da Cozinha: Ciclo de vida estrito (RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE)
• Dilema no Terminal da IA: Um operador pode cancelar uma comanda após o status ENTREGUE?
• Governança Humana no Loop: Eliézer Rosa define ENTREGUE como Estado Terminal e Imutável. Devoluções exigem login supervisor e estorno fiscal.
• O que vem a seguir: A base consolidada para o Episódio 4 com 240 testes automatizados e deploy na nuvem!

⏱️ Capítulos do Episódio:
00:00 - O Terceiro Passo Metodológico: Modelagem Comportamental com IA
00:15 - Atores e Casos de Uso: Cliente, Barista, Cozinha e Caixa
00:36 - Diagrama de Estados da Cozinha: A Esteira da Comanda sem Atalhos
00:48 - Eventos Formais: Do Disparo na Mesa ao Bip de Retirada
01:05 - Interação no Terminal: Risco de Fraude em Cancelamento Pós-Entrega
01:17 - Consulta da IA: Reverter para CANCELADO ou Travar como Terminal?
01:38 - Decisão de Governança de Eliézer Rosa: Sorvedouro Terminal Irreversível
01:58 - Modelo UML Concluído com Rigor e Zero Código Manual
02:16 - Convite para o Episódio 4 & 4B: Validação, 240 Testes e Deploy em 4 Segundos!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MetodologiaIDD #UML #FSM #MaquinaDeEstados #Cafeteria #Padaria #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Metodologia IDD",
    "Intention-Driven Development",
    "UML",
    "FSM",
    "Maquina de Estados",
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
    print("🚀 UPLOAD DO EPISÓDIO 3B DA CAFETERIA NO YOUTUBE")
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
                "position": 5,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 5!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep3b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 3B da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
