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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep3c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_3C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "UML Completo: Atores, Classes, Casos de Uso, Estados & Métodos | Ep. 3C Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 3C: Exibição COMPLETA do UML — Padrão Gráfico OMG Standard, Atores a Métodos

Como modelar o comportamento dinâmico e estático completo de uma aplicação de fintech no padrão gráfico oficial da OMG (Object Management Group), garantindo que cada transição de estado e assinatura de método esteja blindada por invariantes?

Neste episódio de aprofundamento metodológico do Paradigma IDD, Eliézer Rosa e a equipe apresentam o Diagrama UML Canônico Completo do aplicativo Racha de Conta & Pix:

Destaques da Modelagem UML Canônica IDD:
• Diagrama de Casos de Uso (Use Case Diagram):
  - Atores Formais: Participante (Ator Humano), Anfitrião (Gerente da Mesa) e Gateway Bacen (Ator Externo Pix).
  - Limite do Sistema (System Boundary) com elipses de Casos de Uso: Ingressar na Mesa, Consumir Item Fracionado, Solicitar Fechamento e Liquidar Cota.
  - Relações de Inclusão estritas: Pagar Cota obrigatoriamente inclui Validar Invariante da Soma Zero.
• Diagrama de Classes nos Três Compartimentos Oficiais:
  - Compartimento 1: Nome da Classe e Estereótipo (ex: Aggregate Root Mesa, Domain Entity ConsumoItem, Value Object CotaRateio).
  - Compartimento 2: Atributos privados tipados (- id: UUID, - status: StatusMesa, - totalLiquido: Centavos).
  - Compartimento 3: Métodos puros com parâmetros e retornos tipados (+ calcularRateioProporcional, + liquidarPix).
• Máquina de Estados (Statechart) & Terminal da IA:
  - Ciclo de vida estrito da Mesa: MesaAberta ➔ EmRateio ➔ PixPendente ➔ MesaLiquidada.
  - Guardas matemáticas entre colchetes [participantes maior que 0] e [soma(pix) == total].
  - Submissão da Matriz de Invariantes Comportamentais pela IA Compilador e Homologação Oficial por Eliézer Rosa.

⏱️ Capítulos do Episódio:
00:00 - Abertura & A Importância do Padrão Gráfico Canônico OMG UML
00:15 - Diagrama de Casos de Uso, Atores e System Boundary
00:36 - Diagrama de Classes nos Três Compartimentos Oficiais (+ e -)
00:54 - Máquina de Estados (Statechart) com Guardas Matemáticas
01:12 - Terminal da IA: Submissão da Matriz Comportamental
01:28 - Homologação do Modelo pelo Orquestrador Eliézer Rosa
01:45 - Síntese Arquitetural: Do UML Blindado ao Código Vivo
02:00 - Convite para o Episódio 4C: Implementação Completa em Tempo de Execução!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #UML #OMGStandard #EngenhariaDeSoftware #CasosDeUso #DiagramaDeClasses #Statechart #Fintech #Pix #SoftwareArchitecture #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "UML",
    "OMG UML",
    "Diagrama de Classes",
    "Casos de Uso",
    "Statechart",
    "Maquina de Estados",
    "Engenharia de Software",
    "Arquitetura de Software",
    "Racha de Conta",
    "Pix",
    "Fintech",
    "Software Engineering",
    "NoCode",
    "IA",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 3C DO RACHA DE PIX NO YOUTUBE (UML COMPLETO)")
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
                    "position": 7, # Posição 7 na playlist (logo após Ep 3B)
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 7!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Racha_Episodio_3C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 7,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 3C do Racha!\n")

if __name__ == "__main__":
    main()
