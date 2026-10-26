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
ASSETS_DIR = BASE_DIR / "producao_yt" / "refrigeracao_talkshow"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Refrigeracao_TalkShow_Completo.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLNkRuKhFHiBs"  # Playlist IDD na Prática - Leigos / Refrigeração

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Talk Show de Homologação: MER Canônico & UML de Casos de Uso | IDD Refrigeração Especial"

DESCRIPTION = """\
❄️ SÉRIE OFICIAL IDD NA PRÁTICA: REFRIGERAÇÃO COMERCIAL & INDUSTRIAL (HVAC-R)
Edição Especial Talk Show: Homologação Completa do MER e do Modelo UML com Navegação Viva

Como fechar a arquitetura de um software de missão crítica antes de compilar código?

Neste episódio especial em formato Talk Show, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador se reúnem na bancada do "IDD na Prática" para conduzir a plateia em um tour completo e sem cortes:
• Palco Central com a visualização oficial e interativa do MER e do UML;
• Cursor humanizado demonstrando seleção de foco dinâmico, zoom nos 3 compartimentos e pan suave;
• Invariantes universais explicadas na ponta da língua pela IA Compilador;
• A aprovação e homologação final da Usuária Leiga antes de partirmos para a esteira de código!

⏱️ Capítulos do Talk Show:
00:00 - Abertura do Talk Show: A Bancada do IDD na Prática
00:22 - A Realidade de Campo: Manutenção Amadora vs Confiabilidade Sanitária
00:43 - O Paradigma IDD: Invariantes Físicas e Regulatórias no Banco de Dados
01:02 - MER Slide 2: Multitenancy e Hierarquia Territorial (Cliente, Filial e Sala Técnica)
01:47 - MER Slide 3: Equipamento com QR Code Imutável e Compatibilidade Química de Gases
02:39 - MER Slide 4: Ordem de Serviço de Campo, Registro Fotográfico e Assinatura Digital
03:11 - MER Slide 5: Medição Técnica Especializada, Delta T Térmico e Invariante Termodinâmica
04:26 - MER Slide 6: Laudo PMOC Sanitário, Lei Federal 13.589/2018 e Portaria 3.523 Anvisa
05:14 - MER Slide 7: Gestão Contratual, Cron Jobs de Preventiva e Roteirização de Técnicos
05:59 - MER Slide 8: Síntese Relacional e Transição para a Modelagem Dinâmica UML
06:23 - UML Perspectiva Mecânico: Interface de Campo Offline-First e Diagnóstico Rápido
06:58 - UML Perspectiva Gestor: Despacho Inteligente e Monitoramento de Laudos
07:33 - UML Diagrama de Classes OMG: Compartimentos de Atributos, Métodos e Invariantes
08:08 - UML Statechart da Ordem de Serviço: Transições de Estado Blindadas com SHA-256
08:35 - Conclusão Unânime da Bancada e Homologação Final do Domínio

📺 Playlist Oficial Completa "IDD na Prática — Refrigeração (HVAC-R)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentDrivenDevelopment #Refrigeracao #HVACR #PMOC #MER #UML #Statechart #EngenhariaDeSoftware #TalkShow #EliezerRosa #SoftwareEngineering
"""

TAGS = [
    "IDD",
    "Intent-Driven Development",
    "Refrigeração",
    "HVAC-R",
    "PMOC",
    "Lei 13589",
    "MER",
    "UML",
    "Casos de Uso",
    "Diagrama de Classes",
    "Statechart",
    "Talk Show",
    "Engenharia de Software",
    "IA Autonoma",
    "NoCode",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 75)
    print("🚀 UPLOAD TALK SHOW HOMOLOGAÇÃO IDD REFRIGERAÇÃO NO YOUTUBE")
    print("=" * 75)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Título: {TITLE}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        token_info = json.load(f)

    credentials = Credentials.from_authorized_user_info(token_info, SCOPES)
    youtube = build("youtube", "v3", credentials=credentials)

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28"  # Ciência e Tecnologia
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    print("\nIniciando upload com chunked media...")
    media = MediaFileUpload(
        str(VIDEO_FILE),
        mimetype="video/mp4",
        chunksize=1024 * 1024 * 5,  # 5 MB por chunk
        resumable=True
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f"  Progresso Upload: {pct}%", end="\r")

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
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Erro ao enviar capa: {e}")

    try:
        # 1. Adiciona o novo vídeo completo ao final da playlist
        inserted_item = youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": PLAYLIST_ID,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido com sucesso na Playlist {PLAYLIST_ID}: {inserted_item['id']}")

        # 2. Localiza e remove qualquer talk show antigo com defeito (ex: ZULb1K7HhD4)
        OLD_DEFEITUOSO_ID = "ZULb1K7HhD4"
        items_resp = youtube.playlistItems().list(
            part="snippet",
            playlistId=PLAYLIST_ID,
            maxResults=50
        ).execute()
        for it in items_resp.get("items", []):
            if it["snippet"]["resourceId"]["videoId"] == OLD_DEFEITUOSO_ID:
                try:
                    youtube.playlistItems().delete(id=it["id"]).execute()
                    print(f"[OK] Removido item antigo com defeito da playlist (item {it['id']}, video {OLD_DEFEITUOSO_ID})")
                except Exception as del_err:
                    print(f"[!] Não foi possível remover item antigo: {del_err}")
                try:
                    # Torna o vídeo antigo não-listado para evitar visualizações no canal
                    youtube.videos().update(
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
        print(f"[!] Erro ao gerenciar playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Refrigeracao_TalkShow_MER_UML"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Talk Show da Refrigeração!\n")

if __name__ == "__main__":
    main()
