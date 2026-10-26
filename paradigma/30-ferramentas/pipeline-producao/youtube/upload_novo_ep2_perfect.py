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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_2.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_2.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa
OLD_VIDEO_IDS = ["7SUj0N_hNqI"] # Vídeo antigo do Episódio 2 a ser substituído

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Construindo App de Refrigeração com IA - Ep. 2: Arquitetura, Regras & MER | IDD na Prática"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: LEIGOS & ENGENHEIROS
Episódio 2: Arquitetura, Bounded Contexts & MER (Modelo Entidade-Relacionamento)

Como organizar a arquitetura de dados e as regras de negócio de um software complexo de HVAC-R para que centenas de clientes e equipamentos jamais misturem seus dados, e para que mecânicos em campo não consigam burlar medições críticas?

Neste episódio, o Orquestrador Eliézer Rosa, a Usuária Leiga e o Agente IA Compilador demonstram como o Paradigma IDD traduz a intenção humana diretamente em um esquema relacional inviolável com PostgreSQL, multitenancy nativo e o padrão Confirm-Once.

Destaques deste Episódio:
• Delimitação de Bounded Contexts e Isolamento por Tenant com RLS
• Prontuário Digital do Equipamento indexado por QR Code unívoco
• A física dos fluidos: Curvas de pressão R-410A (~120 PSI) vs R-22 (~65 PSI)
• Invariante de Arquitetura Inviolável: Travas CHECK (descarga maior que succao)
• Terminal da IA em Ação: O Confirm-Once Pattern questionando ambiguidades
• Operação de Campo Conectada: Offline-first, laudo PMOC (Lei 13.589/18) e comprovante via WhatsApp em menos de 90s

⏱️ Capítulos:
00:00 - Bounded Contexts: Como isolar dados de múltiplos clientes?
00:20 - Multitenancy Nativo e a Delimitação de Fronteiras no IDD
00:54 - Apresentação Técnica do MER: Os 3 Pilares de Refrigeração
01:15 - Prontuário do Equipamento: Por que o fluido define a física?
01:27 - R-410A vs R-22: As curvas de pressão e a segurança em campo
01:52 - Invariante Inviolável: A medição com foto criptografada do manifold
02:29 - Terminal IA Compilador: O padrão Confirm-Once em tempo real
02:47 - Resposta da Orquestração: Leitura termodinâmica estritamente obrigatória
03:02 - Compilação com Sucesso: Esquema PostgreSQL com constraints CHECK
03:17 - Validação da Usuária Leiga: Segurança jurídica e conformidade total
03:30 - Operação em Campo: QR Code, Offline-First e laudo PMOC ágil
03:59 - Conclusão do Episódio 2 & Próximo Episódio: Implementação dos Componentes!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #MER #BancoDeDados #PostgreSQL #Refrigeracao #PMOC #EngenhariaDeSoftware #NoCode #IAAutonoma #TechParaLeigos #HVAC
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "MER",
    "Modelo Entidade Relacionamento",
    "PostgreSQL",
    "Multitenancy",
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
    print("🚀 UPLOAD DO NOVO VÍDEO 2 (ARQUITETURA & MER) — CANAL @EliézerJPRosa")
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
    print(f"\n[1/4] Fazendo Upload do Novo Vídeo 2 (Sincronizado)...")
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

    # 3. Inserir na Playlist na posição 3 (logo após o Novo Vídeo 1)
    print(f"\n[3/4] Inserindo na Playlist {PLAYLIST_ID} na posição 3...")
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
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 4. Remover versões anteriores da Playlist
    print(f"\n[4/4] Removendo versão antiga ({OLD_VIDEO_IDS}) da playlist...")
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
                manifest["channels"]["eliezer_rosa"]["videos"]["refrigeracao_ep2_remasterizado"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o novo vídeo 2.")
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
