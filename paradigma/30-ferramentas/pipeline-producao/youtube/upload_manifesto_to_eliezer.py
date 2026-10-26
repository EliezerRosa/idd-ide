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

VIDEO_FILE = PROD_DIR / "IDD_Novo_Video_Manifesto_Oficial.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_manifesto_oficial.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Manifesto IDD: O Paradigma Definitivo do Desenvolvimento com IA | IDD na Prática"

DESCRIPTION = """\
★ MANIFESTO OFICIAL IDD (Intention-Driven Development) ★
Como construir software corporativo complexo e resiliente a partir de intenção pura em linguagem natural — sem escrever uma única linha de código manual.

Neste manifesto de abertura da série "IDD na Prática: Leigos & Engenheiros", apresentamos como a intenção humana é o artefato de mais alta ordem da engenharia de software e como a IA atua como compilador operacional determinístico.

Demonstramos a aplicação prática na Engenharia Térmica & Refrigeração:
• Cálculos dinâmicos de Superaquecimento e Sub-resfriamento
• Conformidade legal irrestrita com a Lei Federal 13.589/2018 do PMOC
• Escudo de Invariantes invioláveis que impede código defeituoso antes do deploy
• Integração direta do mecânico de campo (QR Code e smartphone) ao banco de dados com isolamento multitenant

⏱️ Capítulos do Manifesto:
00:00 - Ato 1: O Núcleo IDD & O Artefato de Mais Alta Ordem
00:16 - Ato 2: A Física Térmica Real & Lei 13.589 do PMOC
00:33 - Ato 3: Escudo de Invariantes & Governança Persistente
00:49 - Ato 4: Conexão com o Campo: O Mecânico e o Smartphone
01:05 - Ato 5: O Clímax & O Futuro da Engenharia de Software

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

🎙️ Vozes de Estúdio:
• Humano / Desenvolvedor IDD: pt-BR-AntonioNeural
• IA / Governança Técnica: pt-BR-FranciscaNeural
🎬 Produzido com o motor procedural IDD Video Studio.

👤 Canal Oficial: @EliézerJPRosa
#IDD #IntentionDrivenDevelopment #InteligenciaArtificial #EngenhariaDeSoftware #PMOC #Refrigeracao #NoCode #IAAutonoma #Tech
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Desenvolvimento Dirigido por Intencao",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "PMOC",
    "Lei 13589",
    "Refrigeracao Industrial",
    "NoCode",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "IA Autonoma",
    "Claude",
    "ChatGPT"
]

def main():
    print("=" * 70)
    print("🚀 YOUTUBE UPLOAD & PLAYLIST INTEGRATION — CANAL @EliézerJPRosa")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    print(f"Vídeo: {VIDEO_FILE.name} ({VIDEO_FILE.stat().st_size / (1024*1024):.1f} MB)")
    print(f"Playlist Alvo: {PLAYLIST_ID}")
    
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_name = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_name} (ID: {ch['items'][0]['id']})")

    # 1. Upload do Vídeo
    print(f"\n[1/3] Fazendo Upload do Manifesto Oficial...")
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
    media = MediaFileUpload(str(VIDEO_FILE), chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = resp["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")

    # 2. Upload da Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\n[2/3] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")
    else:
        print("[!] Thumbnail não encontrada, pulando...")

    # 3. Inserir na Playlist na Posição 0 (Abertura)
    print(f"\n[3/3] Inserindo como Abertura da Playlist {PLAYLIST_ID} na posição 0...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 0,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido com sucesso na abertura da Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 4. Atualizar Manifesto Local
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["manifesto_oficial"] = video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o novo vídeo.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # 5. Listar a nova playlist
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
