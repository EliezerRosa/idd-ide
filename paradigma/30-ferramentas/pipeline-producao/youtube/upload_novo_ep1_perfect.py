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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_1.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_1.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa
OLD_VIDEO_IDS = ["LSeoDp7cOno", "fC1soefwCLE"]

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Construindo App de Refrigeração do Zero com IA - Ep. 1: Domínio e Intenção | IDD na Prática"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: LEIGOS & ENGENHEIROS
Episódio 1: Domínio, Intenção & Escopo Operacional (HVAC-R & PMOC)

Como uma pessoa leiga em programação consegue conceber e direcionar a construção de um software corporativo robusto para refrigeração industrial e cumprimento da Lei Federal 13.589/2018 (PMOC) sem escrever uma única linha de código?

Neste episódio totalmente reformulado e renderizado via IDD Video Studio, você acompanha um bate-papo dinâmico entre três atores fundamentais:
👤 Eliézer Rosa (Orquestrador IDD / Mentor)
🗣️ Usuária Leiga (Visão de Negócio & Perguntas Práticas)
🤖 IA Compilador (Agente Autônomo com Confirm-Once Pattern)

Destaques deste Episódio:
• Exibição da 1ª Apresentação Estratégica HTML do projeto de Refrigeração
• Por que softwares genéricos falham em câmaras frigoríficas e chillers
• A física real: Pressão de sucção, descarga e cálculo de superaquecimento
• A Lei do PMOC e a responsabilidade técnica (CREA/CFT)
• Interação ao vivo no chat: A IA questionando regras de domínio antes de compilar
• Conexão de campo: Prontuário por QR Code e ordens de serviço no smartphone

⏱️ Capítulos:
00:00 - O Dilema da Usuária Leiga: Como criar software sem programar?
00:14 - A Resposta do IDD: A Intenção Humana como artefato de mais alta ordem
00:56 - Primeira Apresentação HVAC-R: O Ciclo Termodinâmico & PMOC
01:21 - Por que softwares genéricos falham: A física do superaquecimento
01:52 - A IA entra no Chat: Confirm-Once Pattern e perguntas de saturação
02:22 - Guard Rails e Invariantes: Bloqueio automático de código defeituoso
02:47 - Conexão de Campo: Do smartphone do mecânico à conformidade legal
03:06 - Conclusão do Episódio 1 & Próximos Passos na Playlist

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #IA #Refrigeracao #PMOC #EngenhariaDeSoftware #NoCode #IAAutonoma #TechParaLeigos
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Desenvolvimento Dirigido por Intencao",
    "IA",
    "Inteligencia Artificial",
    "PMOC",
    "Lei 13589",
    "Refrigeracao Industrial",
    "Engenharia de Software",
    "NoCode",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "HVAC-R"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 1 (SINCRONIA PERFEITA) — CANAL @EliézerJPRosa")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist Alvo: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_name = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_name} (ID: {ch['items'][0]['id']})")

    # 1. Upload do Vídeo
    print(f"\n[1/4] Fazendo Upload do Novo Vídeo 1 (Sincronizado)...")
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

    new_video_id = resp["id"]
    video_url = f"https://www.youtube.com/watch?v={new_video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {new_video_id}")
    print(f"     URL: {video_url}")

    # 2. Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\n[2/4] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")

    # 3. Inserir na Playlist na posição 2 (logo após o Manifesto Horizontal e Vertical)
    print(f"\n[3/4] Inserindo na Playlist {PLAYLIST_ID} na posição 2...")
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
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 4. Remover versões anteriores da Playlist
    print(f"\n[4/4] Removendo versões anteriores ({OLD_VIDEO_IDS}) da playlist...")
    try:
        cur_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
        for it in cur_items:
            v_id = it["snippet"]["resourceId"]["videoId"]
            if v_id in OLD_VIDEO_IDS:
                try:
                    yt.playlistItems().delete(id=it["id"]).execute()
                    print(f"[OK] Vídeo anterior {v_id} removido da playlist! (Item ID: {it['id']})")
                except Exception as ex:
                    print(f"[!] Aviso ao remover {v_id}: {ex}")
    except Exception as e:
        print(f"[!] Aviso ao auditar playlist: {e}")

    # 5. Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["refrigeracao_ep1_remasterizado"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o novo vídeo 1.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # 6. Listar a nova playlist
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
