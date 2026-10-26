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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep2c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_2C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "MER Canônico: Crow's Foot, Ficha Técnica & Invariantes de Dados | Ep. 2C Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O SISTEMA DE OPERAÇÃO PARA CAFETERIA & PADARIA
Episódio 2C: Exibição COMPLETA do MER — Notação Crow's Foot, Normalização e Ficha Técnica

Como projetar um banco de dados relacional canônico para uma cafeteria e padaria, garantindo controle atômico de receitas por dose e bloqueio matemático de estoque negativo?

Neste episódio de aprofundamento do Paradigma IDD, Eliézer Rosa e a equipe apresentam o Modelo Entidade-Relacionamento Canônico Completo do sistema Cafeteria & Padaria:

Destaques da Modelagem Canônica IDD:
• Diagrama Gráfico Crow's Foot (Pé de Galinha):
  - Entidades Mestres: Cliente, ItemCardapio e Insumo.
  - Matriz Associativa N para N da Ficha Técnica: cálculo rigoroso de doses (gramas de café moído, mililitros de leite e insumos de confeitaria).
  - Relações estritas de Lotes de Estoque FIFO.
• Normalização e Invariantes de Projeto:
  - 1FN (Primeira Forma Normal): Atomicidade rigorosa de insumos em cada receita.
  - 2FN (Segunda Forma Normal): Dependência funcional plena na Ficha Técnica.
  - 3FN (Terceira Forma Normal): Snapshot congelado de custo na comanda, preservando a margem histórica de cada venda.
• Invariante de Não-Negatividade de Estoque:
  - Bloqueio determinístico de pedidos se a receita exigir insumos com saldo insuficiente.
  - Submissão da Matriz de Invariantes e homologação oficial por Eliézer Rosa.

⏱️ Capítulos do Episódio:
00:00 - Notação Canônica Crow's Foot na Operação de Cafeteria
00:15 - Entidades Mestres e Cardinalidades Rigorosas
00:36 - Ficha Técnica N para N, Insumos e Lotes FIFO
00:54 - Invariantes Universais: 1FN, 2FN e 3FN na Padaria
01:12 - Terminal da IA: Restrição de Estoque Positivo
01:28 - Homologação do Modelo pelo Orquestrador Eliézer Rosa
01:45 - Do Banco de Dados Blindado ao Fluxo de Caixa
02:00 - Convite para o Episódio 3C: Diagrama UML Completo da Cafeteria!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MER #CrowsFoot #FichaTecnica #Cafeteria #Padaria #Estoque #BancoDeDados #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "MER",
    "Modelagem de Dados",
    "Crows Foot",
    "Ficha Tecnica",
    "Cafeteria",
    "Padaria",
    "Estoque",
    "Normalizacao",
    "1FN 2FN 3FN",
    "Software Engineering",
    "NoCode",
    "IA",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 2C DA CAFETERIA NO YOUTUBE (MER CANÔNICO)")
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

    creds = Credentials(
        token=creds_data["token"],
        refresh_token=creds_data["refresh_token"],
        token_uri=creds_data["token_uri"],
        client_id=creds_data["client_id"],
        client_secret=creds_data["client_secret"],
        scopes=SCOPES
    )

    youtube = build("youtube", "v3", credentials=creds)

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28", # Science & Technology
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(
        str(VIDEO_FILE),
        chunksize=1024*1024*5,
        resumable=True,
        mimetype="video/mp4"
    )

    print("\nIniciando upload para os servidores do YouTube...")
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = response["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")

    if THUMBNAIL_FILE.exists():
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE), mimetype="image/png")
            ).execute()
            print("[OK] Capa personalizada aplicada!")
        except Exception as e:
            print(f"[!] Erro ao enviar capa: {e}")

    try:
        youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": PLAYLIST_ID,
                    "position": 4, # Posição 4 na playlist (logo após Ep 2B)
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 4!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Cafeteria_Episodio_2C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 4,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 2C da Cafeteria!\n")

if __name__ == "__main__":
    main()
