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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep2b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_2B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Passo 2 da Metodologia IDD: O MER do Negócio com IA Sem Digitar SQL | Ep. 2B Barbearia"

DESCRIPTION = """\
💈 SÉRIE METODOLÓGICA IDD NA PRÁTICA: O APP DA BARBEARIA
Episódio 2B: Passo 2 da Metodologia — Modelo Entidade-Relacionamento (MER) Conceitual do Salão com IA

Como uma pessoa leiga ou um desenvolvedor orquestra a inteligência artificial para estruturar os dados do negócio antes de criar qualquer tabela ou digitar uma única linha de SQL?

Neste episódio metodológico da série "IDD na Prática", Eliézer Rosa, a Usuária Leiga e o Compilador IA demonstram o Passo 2 do Paradigma IDD: a criação do Modelo Entidade-Relacionamento (MER) conceitual do salão de beleza e barbearia.

Destaques deste Episódio:
• Conceito Antes de SQL: Mapeando o mundo real da barbearia (Clientes, Barbeiros, Serviços e Comandas) sem sintaxe de banco
• Cardinalidade Exata: 1 Cliente para N Agendamentos; 1 Agendamento para exatamente 1 Cadeira e 1 Profissional
• Terminal da IA em Ação: O compilador detectando o dilema contábil de reajuste de preços de serviços futuros
• Governança de Eliézer: Snapshot congelado de preço no Item do Agendamento — o passado financeiro é sagrado e imutável
• Proteção de Negócio: Prevenção de relatórios corrompidos ou fraudes em comissões
• Ponte para o Ep. 3: A amarração rastreável entre as entidades do MER, os diagramas UML e o código vivo da aplicação!

⏱️ Capítulos:
00:00 - Como Modelar Dados com IA Sem Entender Comandos de SQL?
00:17 - Passo 2 da Metodologia IDD: O Modelo Conceitual do Negócio
00:37 - Diagrama MER Proposto pela IA: Entidades e Cardinalidade
00:48 - A Amarração da Cadeira Única no Modelo de Dados
01:05 - Consulta da IA: O Que Ocorre se o Preço do Serviço Mudar?
01:17 - Decisão de Governança: Snapshot Congelado e Imutabilidade Financeira
01:32 - Confirmação do Compilador: MER Blindado Contra Distorções Retroativas
01:40 - A Visão da Usuária Leiga: Segurança Total Antes do Código
01:56 - Encerramento & Chamada para o Ep. 3 (Código Vivo & Amarração Direta)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MER #ModelagemDeDados #Barbearia #EngenhariaDeSoftware #NoCode #IA #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "MER",
    "Modelagem de Dados",
    "Banco de Dados",
    "Barbearia",
    "Salao de Beleza",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 2B DA BARBEARIA NO YOUTUBE")
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
                "position": 3,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 3!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # Atualizar upload_manifest.json
    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "barbearia_videos" not in manifest:
                manifest["barbearia_videos"] = {}
            manifest["barbearia_videos"]["ep2b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2B!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
