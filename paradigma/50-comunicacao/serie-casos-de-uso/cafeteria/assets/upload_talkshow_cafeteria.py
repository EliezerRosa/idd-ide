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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_TalkShow_MER_UML.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa_cafeteria.png"
PLAYLIST_ID = "PLLfynRT3_DJs"  # Playlist IDD na Prática - Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Talk Show de Homologação: MER Canônico & UML | IDD Cafeteria & Padaria Especial"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: CAFETERIA & PADARIA DE ALTO GIRO
Edição Especial Talk Show: Homologação Completa do Domínio (MER Canônico, Ficha Técnica, KDS e NFC-e)

Como integrar atendimento no balcão, comandas nas mesas, produção na cozinha e quitação fiscal sem papel molhado, sem atrasos e com controle milimétrico de estoque?

Neste episódio especial no formato Talk Show do canal "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador se reúnem para dissecar toda a arquitetura do aplicativo para Cafeteria e Padaria no Paradigma IDD:
• Palco Central com o Modelo Entidade-Relacionamento (MER) canônico e o Modelo UML navegados na íntegra;
• Ficha Técnica Atômica: baixa exata de insumos (grãos de café, leite, farinha) no exato instante do envio para a cozinha;
• Eliminação do estoque fantasma e controle rigoroso de perdas operacionais auditadas;
• Casos de uso sob as perspectivas do Cliente (Mesa QR Code), Barista/Padeiro (KDS), Atendente e Caixa;
• Ciclo de vida dos pedidos no KDS: Recebido, Em Preparo, Pronto e Entregue com cronômetro em tempo real;
• Quitação financeira estrita e emissão de cupom fiscal NFC-e em menos de dois segundos;
• Homologação e aprovação unânime da bancada antes do fechamento do projeto!

⏱️ Capítulos do Talk Show:
00:00 - Abertura do Talk Show: A Bancada do IDD na Prática
00:23 - O Caos do Horário de Pico: Comandas de papel, erros de pedido e filas no caixa
00:43 - O Paradigma IDD: Unindo comanda, produção e estoque numa arquitetura atômica
01:07 - MER Canônico ao Vivo: Mesa, Balcão e Autoatendimento via QR Code
01:29 - O Pedido Customizado: Como o sistema garante a receita sem erros
01:46 - A Ficha Técnica: Composição quantitativa de insumos por item
02:08 - Invariante de Baixa Atômica: Adeus ao estoque fantasma de café e laticínios
02:29 - Gestão de Perdas e Quebras: Rastreabilidade no forno e na chapa
02:51 - Quitação Fiscal & NFC-e: Emissão em dois segundos no balcão ou celular
03:14 - Transição para o Modelo UML Dinâmico
03:36 - Perspectiva do Cliente: Leitura de QR Code, fotos em alta resolução e autonomia
03:59 - Visão do Barista & KDS da Cozinha: Cronômetro de preparo em tempo real
04:22 - Baixa de Insumos Automática: O software cuida dos números enquanto o barista extrai o café
04:44 - Módulo Salão & Balcão: Agilidade em três toques para pedidos rápidos
05:07 - Diagrama de Classes OMG: Comanda, ItemComanda, FichaTecnica e InsumoEstoque
05:30 - Métodos Defensivos de Estoque: Prevenindo rupturas no meio do expediente
05:52 - O Statechart da Comanda e do KDS: Regras de transição invioláveis
06:14 - Conformidade Tributária: Chave NFC-e obrigatória para encerramento
06:36 - Avaliação e Selo de Aprovação da Usuária Leiga
06:58 - Certificação Formal da IA Compilador
07:18 - Conclusão do Orquestrador Eliézer Rosa & Próxima Série: Barbearia VIP

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

❄️ Assista Também à Playlist "IDD na Prática — Refrigeração (HVAC-R)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentDrivenDevelopment #Cafeteria #Padaria #KDS #FichaTecnica #MER #UML #CasosDeUso #Statechart #EngenhariaDeSoftware #TalkShow #EliezerRosa
"""

TAGS = [
    "IDD",
    "Intent-Driven Development",
    "Cafeteria",
    "Padaria",
    "KDS",
    "Ficha Tecnica",
    "Comanda Digital",
    "MER",
    "UML",
    "Casos de Uso",
    "Diagrama de Classes",
    "Statechart",
    "NFC-e",
    "Talk Show",
    "Engenharia de Software",
    "IA Autonoma",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 75)
    print("🚀 UPLOAD TALK SHOW HOMOLOGAÇÃO IDD CAFETERIA & PADARIA NO YOUTUBE")
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

    # Inserção na Playlist da Cafeteria & Padaria
    print(f"\nAdicionando à Playlist da Cafeteria ({PLAYLIST_ID})...")
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
