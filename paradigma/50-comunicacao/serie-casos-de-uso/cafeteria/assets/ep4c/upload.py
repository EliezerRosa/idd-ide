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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep4c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_4C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Implementação Completa: Funções Puras & Métodos Amarrados às Invariantes | Ep. 4C Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O SISTEMA DE OPERAÇÃO PARA CAFETERIA & PADARIA
Episódio 4C: Implementação Completa — Funções Puras, Decorador @invariant e 200 Testes de Estresse

Como construir o código vivo de uma Cafeteria & Padaria com funções puras determinísticas e sentinelas em tempo de execução, eliminando de vez qualquer risco de estoque negativo ou desperdício?

Neste episódio de coroamento do Paradigma IDD, Eliézer Rosa e a equipe abrem o código-fonte em TypeScript e demonstram a arquitetura viva em execução:

Destaques da Implementação Canônica IDD:
• Paradigma Imperativo vs Paradigma IDD:
  - O perigo dos comandos UPDATE cegos que causam saldo negativo quando múltiplos caixas vendem ao mesmo tempo.
  - A solução matemática IDD: Funções Puras que calculam a dedução por lote FIFO e retornam novas estruturas imutáveis de estoque.
• Sentinela em Tempo de Execução com @invariant:
  - Pré-condição estrita: validação de saldo por insumo da Ficha Técnica antes de autorizar o preparo do café ou o corte de pães.
  - Pós-condição de auditoria: verificação de que o custo baixado bate exatamente com os ingredientes consumidos.
  - Exceção InsufficientStockException determinística caso falte um único grama de ingrediente.
• Bateria de 200 Testes de Estresse em Concorrência:
  - Simulação de horário de pico com 50 pedidos por minuto no balcão e lotes compartilhados.
  - 200 de 200 testes aprovados com 100% de sucesso, zero vazamento de memória e zero saldo negativo.
• Fechamento das 3 Trilhas Oficiais do Canal:
  - Racha de Conta & Pix, Barbearia & Salão e Cafeteria & Padaria: Modelos Canônicos e Código Vivo 100% Homologados!

⏱️ Capítulos do Episódio:
00:00 - Introdução: Código Vivo sem Estoque Negativo
00:13 - Paradigma Imperativo vs Funções Puras IDD
00:31 - Ficha Técnica e Dedução Atômica por Lote FIFO
00:41 - O Decorador @invariant em Ação no VSCode
01:05 - Cenário de Pico: 50 Pedidos por Minuto no Balcão
01:11 - Execução ao Vivo de 200 Testes de Estresse no Terminal
01:32 - Homologação dos Resultados por Eliézer Rosa
01:45 - A Consagração do Paradigma IDD nas Três Trilhas
02:00 - Agradecimento e Futuro da Engenharia de Software

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #CodigoVivo #TypeScript #FuncoesPuras #Decorators #Invariant #TestesDeEstresse #Cafeteria #Padaria #EngenhariaDeSoftware #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Codigo Vivo",
    "TypeScript",
    "Funcoes Puras",
    "Decorators",
    "Invariant",
    "Testes de Estresse",
    "Cafeteria",
    "Padaria",
    "Ficha Tecnica",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4C DA CAFETERIA NO YOUTUBE (CÓDIGO VIVO & TESTES)")
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
                    "position": 10, # Posição 10 na playlist (logo após Ep 4B)
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 10!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Cafeteria_Episodio_4C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 10,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 4C da Cafeteria!\n")

if __name__ == "__main__":
    main()
