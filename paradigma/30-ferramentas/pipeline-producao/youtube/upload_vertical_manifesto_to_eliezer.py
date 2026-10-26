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
PROD_DIR = BASE_DIR / "producao_yt"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

VERTICAL_VIDEO_FILE = PROD_DIR / "IDD_Novo_Video_Manifesto_Vertical_9x16.mp4"
PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Manifesto IDD: O Futuro do Software Sem Escrever Código #Shorts #IDD"

DESCRIPTION = """\
★ MANIFESTO OFICIAL IDD — VERSÃO VERTICAL (9:16) ★
Como construir sistemas reais a partir de intenção pura em linguagem natural, sem escrever uma única linha de código manual.

O Paradigma IDD (Intention-Driven Development) transforma a intenção humana no artefato de mais alta ordem, utilizando a inteligência artificial autônoma como compilador de execução técnica.

Destaques:
• Termodinâmica Real: Superaquecimento, Sub-resfriamento e Lei 13.589 do PMOC
• Escudo de Invariantes invioláveis
• Do chiller ao banco de dados com QR Code no smartphone
• 85% de redução no tempo de entrega

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

🎙️ Vozes Neurais de Estúdio: Antonio & Francisca
👤 Canal Oficial: @EliézerJPRosa
#Shorts #IDD #IntentionDrivenDevelopment #IA #InteligenciaArtificial #Refrigeracao #PMOC #EngenhariaDeSoftware #NoCode #Tech
"""

TAGS = [
    "Shorts",
    "IDD",
    "Intention-Driven Development",
    "Desenvolvimento Dirigido por Intencao",
    "IA",
    "Inteligencia Artificial",
    "PMOC",
    "Refrigeracao",
    "Engenharia de Software",
    "NoCode",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD VERTICAL SHORTS — CANAL @EliézerJPRosa")
    print("=" * 70)

    if not VERTICAL_VIDEO_FILE.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {VERTICAL_VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VERTICAL_VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo Vertical: {VERTICAL_VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist Alvo: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_name = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_name} (ID: {ch['items'][0]['id']})")

    # 1. Upload do Vídeo Vertical
    print(f"\n[1/2] Fazendo Upload do Manifesto Vertical (9:16)...")
    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28", # Science & Technology
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    media = MediaFileUpload(str(VERTICAL_VIDEO_FILE), chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = resp["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    shorts_url = f"https://www.youtube.com/shorts/{video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")
    print(f"     Shorts URL: {shorts_url}")

    # 2. Inserir na Playlist na posição 1 (logo após o Manifesto Horizontal)
    print(f"\n[2/2] Inserindo na Playlist {PLAYLIST_ID} na posição 1...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 1,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 3. Atualizar Manifesto Local
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                if "shorts" not in manifest["channels"]["eliezer_rosa"]:
                    manifest["channels"]["eliezer_rosa"]["shorts"] = {}
                manifest["channels"]["eliezer_rosa"]["shorts"]["manifesto_vertical"] = video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo vertical.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # 4. Listar a nova playlist
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST OFICIAL ATUALIZADA: IDD na Prática - Leigos ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
