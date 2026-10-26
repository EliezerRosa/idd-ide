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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_2B.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_2b.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD na Prática - Ep. 2B: MER com IA — Modelo de Dados do Negócio sem Código"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 2B: Modelagem Entidade-Relacionamento (MER) com IA & Mapa Semântico de Negócio

Como passar das intenções humanas e invariantes sagradas para a estrutura de dados de um sistema corporativo real sem precisar digitar nenhuma linha de comando SQL?

Neste segundo episódio metodológico, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram como o Paradigma Intent-Driven Development (IDD) transforma requisitos em um Modelo Entidade-Relacionamento (MER) completo com 8 tabelas interligadas, isolamento multitenant nativo e chaves de auditoria.

Destaques deste Episódio Metodológico:
• O MER como Mapa Semântico: O banco de dados como reflexo do mundo real e não de jargões técnicos
• Hierarquia Territorial Completa: Tenant → Cliente → Local de Instalação → Equipamento
• Por Que Separar Local de Equipamento? Preservação do prontuário vitalício de quebras e fluido
• O Equipamento com QR Code como Centro de Gravidade com leitura em menos de 50 milissegundos
• Terminal da IA em Ação: A IA questionando a cardinalidade entre Ordem de Serviço e Medição Técnica
• Decisão de Governança 1 para N: Múltiplas aferições de pressão antes e depois da estabilização térmica
• Síntese dos 4 Pilares do MER no IDD: Da integridade referencial à ponte para modelagem UML

⏱️ Capítulos:
00:00 - Introdução Metodológica: Como criar o modelo de dados com IA sem código?
00:20 - O Segundo Passo do IDD: O MER como Mapa Semântico do Domínio
00:41 - A Realidade Física no Banco: Técnicos, QR Code e a eliminação do papel
00:54 - A Hierarquia Territorial: Tenant, Cliente e Locais de Instalação
01:10 - Por Que Separar o Equipamento do Local? A vida própria da máquina
01:25 - Prontuário Vitalício: Histórico de compressores e fluido de fábrica preservado
01:38 - Ciclo Frigorífico no Banco: Como pressões e temperaturas viram entidades
01:52 - Terminal da IA em Ação: A IA submetendo a decisão de cardinalidade ao mentor
02:14 - Resposta da Orquestração: Cardinalidade 1 para N validada com visão de campo
02:30 - Diagrama MER Consolidado: 8 tabelas conectadas com integridade absoluta
02:46 - A Visão da Usuária Leiga: Compreendendo o banco de dados sem comandos SQL
03:00 - Síntese dos 4 Pilares da Modelagem de Dados no Paradigma IDD
03:20 - Encerramento do Ep. 2B & Chamada para o Ep. 3B: Modelagem UML com IA!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #MER #ModeloDeDados #BancoDeDados #PostgreSQL #Supabase #EngenhariaDeSoftware #NoCode #IAAutonoma #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "MER",
    "Modelo Entidade Relacionamento",
    "Banco de Dados",
    "PostgreSQL",
    "Supabase",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Metodologia",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "PMOC",
    "Refrigeracao"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 2B (METODOLOGIA: MER COM IA SEM CÓDIGO)")
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
    print(f"\n[1/3] Fazendo Upload do Novo Vídeo 2B...")
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
        print(f"\n[2/3] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")

    # 3. Inserir na Playlist na posição 5 (logo após o Ep. 2)
    print(f"\n[3/3] Inserindo na Playlist {PLAYLIST_ID} na posição 5...")
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
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")

        # 4. Localiza e remove o vídeo antigo com defeito (KO98-36Ylxg) da playlist
        OLD_DEFEITUOSO_ID = "KO98-36Ylxg"
        items_resp = yt.playlistItems().list(
            part="snippet",
            playlistId=PLAYLIST_ID,
            maxResults=50
        ).execute()
        for it in items_resp.get("items", []):
            if it["snippet"]["resourceId"]["videoId"] == OLD_DEFEITUOSO_ID:
                try:
                    yt.playlistItems().delete(id=it["id"]).execute()
                    print(f"[OK] Removido item antigo com defeito da playlist (item {it['id']}, video {OLD_DEFEITUOSO_ID})")
                except Exception as del_err:
                    print(f"[!] Não foi possível remover item antigo: {del_err}")
                try:
                    yt.videos().update(
                        part="status",
                        body={
                            "id": OLD_DEFEITUOSO_ID,
                            "status": {"privacyStatus": "unlisted"}
                        }
                    ).execute()
                    print(f"[OK] Vídeo antigo {OLD_DEFEITUOSO_ID} marcado como não-listado (unlisted).")
                except Exception as unl_err:
                    print(f"[!] Não foi possível alterar privacidade do vídeo antigo: {unl_err}")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["metodologia_ep2b_mer"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo 2B.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # Listar a playlist atualizada
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
