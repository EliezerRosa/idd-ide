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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_TalkShow_MER_UML.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa_racha.png"
PLAYLIST_ID = "PLdaNms3TnbXA"  # Playlist IDD na Prática - Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Talk Show de Homologação: MER Canônico & UML | IDD Racha de Conta & Pix Especial"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: RACHA DE CONTA & PIX EM TEMPO REAL
Edição Especial Talk Show: Homologação Completa do Domínio (MER Canônico, Casos de Uso e Statechart)

Como dividir contas de bar e restaurante sem atrito social, sem planilhas confusas e com garantia matemática de que ninguém pague a conta dos outros?

Neste episódio especial no formato Talk Show do canal "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador dissecam a arquitetura completa do aplicativo de Racha de Conta e Pix no Paradigma IDD:
• Palco Central com o Modelo Entidade-Relacionamento (MER) canônico e o Modelo UML navegados na íntegra;
• A Invariante Fundamental da Soma Zero: soma das frações de consumo exatamente igual a um;
• Gestão de itens compartilhados, chope avulso, taxa de serviço de dez por cento e saideira antecipada;
• Casos de uso interativos sob as perspectivas do Amigo, Organizador da Mesa e Garçom/Caixa;
• O Ciclo de Vida da Mesa no Statechart: Aberta, Fechada, Liquidando e Quitada com conciliação via Webhook BACEN;
• Aprovação e homologação unânime da bancada antes do fechamento do projeto!

⏱️ Capítulos do Talk Show:
00:00 - Abertura do Talk Show: A Bancada do IDD na Prática
00:24 - O Problema Social da Conta do Bar: Por que calculadoras comuns falham?
00:44 - O Paradigma IDD: Tratando o racha como sistema financeiro transacional
01:08 - MER Canônico ao Vivo: Mesa e Participantes em Tempo Real
01:31 - Consumo Fracionado: Quem bebeu chope artesanal paga o chope
01:48 - Invariante da Soma Zero: A matemática que impede prejuízos
02:10 - O Organizador e o Amigo que Sai Cedo: Fechamento antecipado de cota
02:30 - Chaves Pix, Cota de Rateio e Snapshot Imutável com Hash SHA-256
02:54 - Transição para o Modelo UML de Casos de Uso
03:17 - Perspectiva do Amigo: Entrada instantânea por QR Code e Notificação WhatsApp
03:41 - A Visão do Garçom e do Caixa: Painel unificado e redução de filas
04:02 - O Amigo que Pede a Saideira: Extensão de caso de uso sem quebrar a conta
04:26 - Diagrama de Classes OMG: Transação Pix, Comanda e Notificador
04:51 - Idempotência Bancária: Tolerando quedas de rede sem duplicar Pix
05:15 - A Máquina de Estados da Mesa: Do primeiro brinde à quitação total
05:39 - Validação Final da Usuária Leiga e Selo de Aprovação da Bancada
06:05 - Fechamento do Orquestrador Eliézer Rosa & Convite para as próximas séries

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

❄️ Assista Também à Playlist "IDD na Prática — Refrigeração (HVAC-R)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentDrivenDevelopment #RachaDeConta #Pix #Fintech #MER #UML #CasosDeUso #Statechart #EngenhariaDeSoftware #TalkShow #EliezerRosa
"""

TAGS = [
    "IDD",
    "Intent-Driven Development",
    "Racha de Conta",
    "Pix",
    "Fintech",
    "MER",
    "UML",
    "Casos de Uso",
    "Diagrama de Classes",
    "Statechart",
    "Talk Show",
    "Engenharia de Software",
    "IA Autonoma",
    "Invariante",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 75)
    print("🚀 UPLOAD TALK SHOW HOMOLOGAÇÃO IDD RACHA DE CONTA & PIX NO YOUTUBE")
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
            print(f"   Progresso do Upload: {int(status.progress() * 100)}%")

    video_id = response.get("id")
    print(f"\n✅ Upload concluído com sucesso!")
    print(f"   Vídeo ID: {video_id}")
    print(f"   URL: https://www.youtube.com/watch?v={video_id}")

    # Upload da Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\nEnviando miniatura oficial: {THUMBNAIL_FILE.name}...")
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE), mimetype="image/png")
            ).execute()
            print("✅ Miniatura configurada com sucesso!")
        except Exception as e:
            print(f"⚠️ Erro ao enviar miniatura: {e}")

    # Inserção na Playlist do Racha de Pix
    print(f"\nAdicionando à Playlist do Racha de Pix ({PLAYLIST_ID})...")
    try:
        playlist_item_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id
                }
            }
        }
        playlist_response = youtube.playlistItems().insert(
            part="snippet",
            body=playlist_item_body
        ).execute()
        item_id = playlist_response.get("id")
        print(f"✅ Vídeo adicionado com sucesso ao final da Playlist!")
        print(f"   PlaylistItem ID: {item_id}")
    except Exception as e:
        print(f"⚠️ Erro ao adicionar à playlist: {e}")

    print("\n" + "=" * 75)
    print("🎉 OPERAÇÃO CONCLUÍDA COM TOTAL SUCESSO!")
    print(f"   Link Direto: https://www.youtube.com/watch?v={video_id}")
    print("=" * 75)

if __name__ == "__main__":
    main()
