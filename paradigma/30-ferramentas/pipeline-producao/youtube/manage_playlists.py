import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

MELISSA_VIDEO_ID = "oPcNC5FXnHY"
OLD_PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos
NEW_PLAYLIST_TITLE = "IDD na Prática - Casos de Uso"
NEW_PLAYLIST_DESC = """\
Playlist oficial do canal Eliézer J P Rosa: IDD na Prática — Casos de Uso.
Casos reais e aplicações práticas de pessoas e empresas utilizando o Paradigma IDD (Desenvolvimento Dirigido por Intenção) para conceber, direcionar e colocar em produção sistemas corporativos completos com inteligência artificial autônoma.

Nesta playlist você acompanha demonstrações reais de softwares corporativos de ponta a ponta sem programação manual de código.

👤 Eliézer J P Rosa | Paradigma IDD
#IDD #CasosDeUso #IA #NoCode #EngenhariaDeSoftware #IntentionDrivenDevelopment #NexusLog #CRM
"""

SCOPES = [
    "https://www.googleapis.com/auth/youtube"
]

def main():
    print("=" * 70)
    print("🚀 GESTÃO DE PLAYLISTS — CANAL @EliézerJPRosa")
    print("=" * 70)

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_title = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_title} (ID: {ch['items'][0]['id']})")

    # 1. Verificar se a nova playlist já existe ou precisa ser criada
    print(f"\n[1/4] Verificando se a playlist '{NEW_PLAYLIST_TITLE}' já existe...")
    playlists = yt.playlists().list(part="snippet,status", mine=True, maxResults=50).execute().get("items", [])
    new_pl_id = None
    for pl in playlists:
        if pl["snippet"]["title"].strip().lower() == NEW_PLAYLIST_TITLE.strip().lower():
            new_pl_id = pl["id"]
            print(f"  Playlist já existente encontrada: {new_pl_id}")
            break

    if not new_pl_id:
        print(f"  Criando nova playlist pública: '{NEW_PLAYLIST_TITLE}'...")
        pl_body = {
            "snippet": {
                "title": NEW_PLAYLIST_TITLE,
                "description": NEW_PLAYLIST_DESC,
                "defaultLanguage": "pt"
            },
            "status": {
                "privacyStatus": "public"
            }
        }
        res = yt.playlists().insert(part="snippet,status", body=pl_body).execute()
        new_pl_id = res["id"]
        print(f"  [OK] Playlist criada com sucesso! ID: {new_pl_id}")
        import time
        time.sleep(4)

    # 2. Inserir vídeo da Melissa na nova playlist
    print(f"\n[2/4] Inserindo vídeo da Melissa ({MELISSA_VIDEO_ID}) na nova playlist ({new_pl_id})...")
    import time
    for attempt in range(5):
        try:
            body = {
                "snippet": {
                    "playlistId": new_pl_id,
                    "position": 0,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": MELISSA_VIDEO_ID
                    }
                }
            }
            item_res = yt.playlistItems().insert(part="snippet", body=body).execute()
            print(f"  [OK] Vídeo da Melissa inserido na nova playlist! Item ID: {item_res['id']}")
            break
        except Exception as e:
            print(f"  Tentativa {attempt+1}/5 aguardando propagação ({e})...")
            time.sleep(3)

    # 3. Remover vídeo da Melissa da playlist antiga (PLNkRuKhFHiBs)
    print(f"\n[3/4] Removendo vídeo da Melissa da playlist antiga '{OLD_PLAYLIST_ID}'...")
    old_items = yt.playlistItems().list(part="snippet", playlistId=OLD_PLAYLIST_ID, maxResults=50).execute().get("items", [])
    melissa_item_id = None
    for it in old_items:
        if it["snippet"]["resourceId"]["videoId"] == MELISSA_VIDEO_ID:
            melissa_item_id = it["id"]
            break

    if melissa_item_id:
        yt.playlistItems().delete(id=melissa_item_id).execute()
        print(f"  [OK] Item removido da playlist antiga! (Item ID: {melissa_item_id})")
    else:
        print("  Vídeo da Melissa não encontrado na playlist antiga (já havia sido removido).")

    # 4. Atualizar upload_manifest.json
    print(f"\n[4/4] Atualizando upload_manifest.json...")
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["playlist_casos_de_uso"] = {
                    "id": new_pl_id,
                    "url": f"https://www.youtube.com/playlist?list={new_pl_id}",
                    "title": NEW_PLAYLIST_TITLE
                }
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("  [OK] upload_manifest.json atualizado com a nova playlist.")
        except Exception as e:
            print(f"  [!] Aviso ao atualizar manifest: {e}")

    # 5. Exibir o estado final de ambas as playlists
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST 1: IDD na Prática - Leigos ({OLD_PLAYLIST_ID}) ★")
    print("=" * 70)
    p1_items = yt.playlistItems().list(part="snippet", playlistId=OLD_PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p1_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

    print("\n" + "=" * 70)
    print(f"★ PLAYLIST 2: {NEW_PLAYLIST_TITLE} ({new_pl_id}) ★")
    print("=" * 70)
    p2_items = yt.playlistItems().list(part="snippet", playlistId=new_pl_id, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p2_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
