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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep3c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_3C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "UML Completo: Atores, Classes, Casos de Uso, Estados & Métodos | Ep. 3C Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O SISTEMA DE OPERAÇÃO PARA CAFETERIA & PADARIA
Episódio 3C: Exibição COMPLETA do UML — Padrão OMG Standard, Atores, Classes e Statecharts

Como modelar o comportamento canônico de uma Cafeteria & Padaria com o padrão oficial OMG UML, garantindo integração perfeita entre Balcão, Cozinha e Emissão Fiscal?

Neste episódio de aprofundamento do Paradigma IDD, Eliézer Rosa e a equipe apresentam o modelo UML Completo do sistema Cafeteria:

Destaques da Modelagem Comportamental IDD:
• Diagrama de Casos de Uso Canônico (OMG Standard):
  - Limites do Sistema (System Boundary) e Atores Formais: Cliente, Barista/Cozinha e Emissor Fiscal SEFAZ.
  - Elipses Canônicas: Realizar Pedido no Balcão, Liquidar Pagamento e Baixar Insumos da Ficha Técnica via relacionamento de inclusão estrito (include).
• Diagrama de Classes nos Três Compartimentos Oficiais:
  - Compartimento Superior: Estereótipos de agregado (PedidoCafeteria), entidade de domínio (FichaTecnicaInsumo) e evento imutável (MovimentacaoEstoque).
  - Compartimento Central: Atributos privados tipados com visibilidade menos (-id, -status, -totalCentavos).
  - Compartimento Inferior: Métodos de negócio com visibilidade mais (+adicionarItem, +calcularConsumoTotal, +debitarLoteFIFO).
• Máquina de Estados do Pedido (Statechart):
  - Ciclo de vida com transições formais: Registrado ➔ EmPreparo ➔ ProntoRetirada ➔ Entregue.
  - Guardas matemáticas de validação de saldo por lote FIFO e trava estrita de cancelamento pós-moagem dos grãos.
• Homologação Oficial de Invariantes:
  - Submissão da Matriz de Invariantes Comportamentais e aprovação formal pelo orquestrador Eliézer Rosa.

⏱️ Capítulos do Episódio:
00:00 - Introdução: O Padrão Canônico OMG UML na Cafeteria
00:14 - Casos de Uso: Fronteiras, Atores e Dedução por Include
00:35 - Classes nos Três Compartimentos: Atributos Privados e Métodos
00:43 - Ficha Técnica e Agregado de Pedido com Tipagem Estrita
01:08 - Statechart do Pedido: Transições e Guardas de Lote
01:19 - Matriz de Invariantes Comportamentais no Terminal da IA
01:42 - Homologação das Invariantes por Eliézer Rosa
01:53 - Do UML Canônico ao Código Vivo Compilado
02:00 - Próximo Episódio: Funções Puras e Testes de Estresse no 4C!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #UML #OMGStandard #CasosDeUso #DiagramaDeClasses #Statechart #Cafeteria #Padaria #EngenhariaDeSoftware #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "UML",
    "OMG Standard",
    "Casos de Uso",
    "Diagrama de Classes",
    "Statechart",
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
    print("🚀 UPLOAD DO EPISÓDIO 3C DA CAFETERIA NO YOUTUBE (UML COMPLETO)")
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

    manifest["Cafeteria_Episodio_3C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 7,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 3C da Cafeteria!\n")

if __name__ == "__main__":
    main()
