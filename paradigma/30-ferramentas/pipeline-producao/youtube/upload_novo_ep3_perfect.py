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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_3.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_3.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa
OLD_VIDEO_IDS = ["9lF2_6dl1Vg", "rUaJn-r-p8I"] # Vídeo antigo do Episódio 3 a ser substituído
POSITION_IN_PLAYLIST = 6 # Logo após o Ep. 2B (posição 5)

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Construindo App de Refrigeração com IA - Ep. 3: Implementação & Banco de Dados | IDD na Prática"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: LEIGOS & ENGENHEIROS
Episódio 3: Implementação Física, Supabase & PostgreSQL (Multitenancy RLS & Offline-First)

Como passar da modelagem conceitual para um banco de dados real na nuvem sem precisar escrever centenas de linhas de comandos SQL e garantindo isolamento absoluto de segurança?

Neste terceiro episódio, o Orquestrador Eliézer Rosa, a Usuária Leiga e o Agente IA Compilador demonstram como o compilador autônomo traduz a intenção humana diretamente em tabelas relacionais no PostgreSQL (via Supabase), políticas de Row Level Security (RLS) e componentes de interface com persistência local IndexedDB.

Destaques deste Episódio:
• Compilação de Migrações SQL e chaves primárias UUID geradas por intenção
• Isolamento Multitenant Inviolável: Políticas RLS aplicadas no nível de banco de dados
• Telas de Campo Reativas: Máscaras de pressão em PSI e cálculo de Delta T em tempo real
• Arquitetura Offline-First Resiliente para subsolos, câmaras frias e casas de máquinas
• Terminal da IA em Ação: O Confirm-Once Pattern definindo tolerância estendida de 48h
• Conexão com Ativos Físicos: QR Code B-Tree unívoco com carregamento em menos de 50ms

⏱️ Capítulos:
00:00 - Do Modelo ao Banco Real: Como criar tabelas sem programar SQL?
00:14 - PostgreSQL & Supabase: Chaves UUID e RLS Nativo
00:39 - Segurança por Linha: A muralha que impede vazamento entre tenants
01:03 - Componentes Reativos de Campo: Telas inteligentes no smartphone
01:15 - Cálculo em Tempo Real de Delta T e Rendimento Térmico
01:33 - Desafio de Conexão: Operação em subsolos blindados sem internet
01:41 - Arquitetura Offline-First: IndexedDB e sincronização idempotente
01:57 - Terminal da IA: O Confirm-Once Pattern questionando expiração de tokens
02:19 - Resposta da Orquestração: Tolerância de 48h com criptografia e biometria
02:33 - Compilação Concluída: Migrações aplicadas com zero atrito
02:47 - Validação da Usuária Leiga: A IA antecipando a realidade de campo
02:57 - Ativos Conectados: O QR Code abrindo o prontuário em menos de 50ms
03:17 - Conclusão do Episódio 3 & Rumo ao Grande Final: Validação e Entrega!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #PostgreSQL #Supabase #BancoDeDados #RLS #Refrigeracao #PMOC #EngenhariaDeSoftware #NoCode #IAAutonoma #TechParaLeigos #OfflineFirst
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Supabase",
    "PostgreSQL",
    "Banco de Dados",
    "Row Level Security",
    "RLS",
    "Offline-First",
    "IA",
    "Inteligencia Artificial",
    "PMOC",
    "Refrigeracao Industrial",
    "Engenharia de Software",
    "NoCode",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "HVAC-R"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 3 (IMPLEMENTAÇÃO & DADOS) — CANAL @EliézerJPRosa")
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
    print(f"\n[1/4] Fazendo Upload do Novo Vídeo 3 (Sincronizado)...")
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

    # 3. Inserir na Playlist na posição 6 (logo após o Ep. 2B)
    print(f"\n[3/4] Inserindo na Playlist {PLAYLIST_ID} na posição {POSITION_IN_PLAYLIST}...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": POSITION_IN_PLAYLIST,
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

    # 4. Remover versão antiga da Playlist e marcar como unlisted
    print(f"\n[4/4] Removendo versão antiga ({OLD_VIDEO_IDS}) da playlist e marcando como unlisted...")
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
                try:
                    yt.videos().update(
                        part="status",
                        body={
                            "id": v_id,
                            "status": {"privacyStatus": "unlisted"}
                        }
                    ).execute()
                    print(f"[OK] Vídeo antigo {v_id} marcado como unlisted.")
                except Exception as unl_err:
                    print(f"[!] Aviso ao mudar privacidade de {v_id}: {unl_err}")
    except Exception as e:
        print(f"[!] Aviso ao auditar playlist: {e}")

    # 5. Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["refrigeracao_ep3_remasterizado"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o novo vídeo 3.")
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
