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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep2"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_2.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Criando App de Barbearia com IA - Ep. 2: Telas & Estrutura de Dados | IDD na Prática"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 2: Telas Intuitivas, Comandas Inteligentes & Arquitetura de Dados Sem Código

Como um aplicativo de salão de beleza e barbearia organiza as telas de agendamento e o banco de dados sem que o proprietário precise programar nada?

Neste segundo episódio, Eliézer Rosa, a Usuária Leiga e o Compilador IA mostram como a modelagem visual do IDD conecta clientes, profissionais, catálogo de serviços e o cálculo automático de comissões com integridade histórica total.

Destaques deste Episódio:
• A Conexão Visual de Telas: Em vez de tabelas frias de SQL, desenhamos a vivência real do salão
• Catálogo e Intervalos: Corte Tradicional (R$ 35, 30 min) e Barba Terapia (R$ 30, 20 min)
• Comanda Multi-Serviços: Agrupando procedimentos em sequência contínua
• Dúvida de Governança da IA: A comissão deve incidir sobre o item individual ou no total?
• Decisão de Negócio de Eliézer: Comissão item a item para flexibilidade em serviços especiais
• Congelamento de Preço Histórico: Relatórios financeiros antigos nunca sofrem distorção quando a tabela de preços do salão é reajustada

⏱️ Capítulos:
00:00 - Como Organizar Telas e Dados Sem Digitar Código?
00:15 - A Arquitetura Visual de Dados e Telas do IDD
00:34 - Catálogo de Serviços com Duração e Preço Definidos
00:45 - Agendamento Inteligente com Tempo Cumulativo de Cadeira
00:59 - Múltiplos Serviços no Mesmo Atendimento
01:05 - Consulta da IA: Como calcular a comissão dos profissionais?
01:28 - Governança Humana: Comissão calculada item a item
01:45 - Integridade Histórica e Congelamento de Valores na Comanda
01:59 - A Segurança Financeira para o Empreendedor
02:08 - Encerramento & Próximos Passos (Ep. 2B MER & Ep. 3 Código)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Barbearia #SalaoDeBeleza #BancoDeDados #NoCode #IA #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Barbearia",
    "Salao de Beleza",
    "Banco de Dados",
    "Telas",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "Comanda Digital"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 2 DA BARBEARIA NO YOUTUBE")
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

    # Atualizar upload_manifest.json
    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "barbearia_videos" not in manifest:
                manifest["barbearia_videos"] = {}
            manifest["barbearia_videos"]["ep2"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
