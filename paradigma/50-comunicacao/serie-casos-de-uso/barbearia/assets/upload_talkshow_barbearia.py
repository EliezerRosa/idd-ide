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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_TalkShow_MER_UML.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa_barbearia.png"
PLAYLIST_ID = "PLHCqwtNiGbt8"  # Playlist IDD na Prática - Barbearia & Salão

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Talk Show de Homologação: MER Canônico & UML | IDD Barbearia & Salão VIP"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: BARBEARIA & SALÃO VIP
Edição Especial Talk Show: Homologação Completa do Domínio (MER Canônico, Zero Overbooking e Lei Salão-Parceiro)

Como eliminar o conflito de agendamento duplo, calcular o comissionamento exato de profissionais parceiros pela Lei 13.352 e gerenciar a jornada completa do cliente na cadeira sem atritos nem planilhas manuais?

Neste episódio especial no formato Talk Show do canal "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador se reúnem para dissecar e homologar toda a arquitetura do aplicativo para Barbearia e Salão VIP no Paradigma IDD:
• Palco Central com o Modelo Entidade-Relacionamento (MER) canônico e o Modelo UML navegados na íntegra;
• Algoritmo de Grade Contínua e Lock Otimista: prevenção matemática absoluta de overbooking (duplo agendamento);
• Divisão Financeira Automatizada pela Lei do Salão-Parceiro (Lei Federal 13.352/2016): split transparente entre salão e barbeiro/cabeleireiro no momento da quitação;
• Gestão de Comandas com consumo de bar, produtos da recepção e serviços combinados (Corte, Barba, Tratamentos);
• Máquina de Estados Finita (FSM) do Atendimento: Agendado → Confirmado → Em Cadeira → Concluído → Pago;
• Homologação e aprovação unânime da bancada antes do fechamento do projeto!

⏱️ Capítulos do Talk Show:
00:00 - Abertura do Talk Show: A Bancada do IDD na Prática
00:23 - O Pesadelo da Cadeira Vazia e Conflito de Horários: Agendas de papel e mensagens perdidas
00:43 - O Paradigma IDD: Arquitetura atômica com grade contínua e split de pagamento
01:06 - MER Canônico ao Vivo: Profissionais, Especialidades, Cadeiras e Horários de Atendimento
01:27 - Grade Dinâmica e Duração Variável: Bloqueio atômico de intervalos
01:45 - A Lei do Salão-Parceiro (13.352): Repasse de comissão sem bitributação
02:07 - Comanda Integrada de Serviços e Produtos: Do café/cerveja à pomada modeladora
02:29 - Split de Pagamento na Quitação: Cartão, Pix e dinheiro divididos na fonte
02:50 - Transição para o Modelo UML Dinâmico
03:12 - Perspectiva do Cliente: Autoagendamento em poucos toques, escolha do profissional e lembretes automáticos
03:34 - Visão do Barbeiro & Profissional Parceiro: Painel mobile com fila de atendimento e extrato diário
03:57 - Painel do Gerente/Recepção: Visão aérea de todas as cadeiras do salão em tempo real
04:19 - Diagrama de Classes OMG: Agendamento, Profissional, ComandaItem e ComissaoSplit
04:41 - Mecanismo Anti-Conflito Concorrente: Lock atômico no banco de dados
05:03 - Statechart da Cadeira: FSM com transições de estado estritas
05:25 - Relatórios Fiscais e Compliance Jurídico do Salão-Parceiro
05:47 - Avaliação e Selo de Aprovação da Usuária Leiga
06:09 - Certificação Formal da IA Compilador
06:30 - Conclusão do Orquestrador Eliézer Rosa & Fechamento das Séries IDD na Prática!

📺 Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

❄️ Assista Também à Playlist "IDD na Prática — Refrigeração (HVAC-R)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentDrivenDevelopment #Barbearia #SalaoDeBeleza #SalaoParceiro #ZeroOverbooking #MER #UML #CasosDeUso #EngenhariaDeSoftware #TalkShow #EliezerRosa
"""

TAGS = [
    "IDD",
    "Intent-Driven Development",
    "Barbearia",
    "Salao de Beleza",
    "Salao Parceiro",
    "Zero Overbooking",
    "Agendamento Online",
    "MER",
    "UML",
    "Casos de Uso",
    "Diagrama de Classes",
    "Statechart",
    "Talk Show",
    "Engenharia de Software",
    "IA Autonoma",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 75)
    print("🚀 UPLOAD TALK SHOW HOMOLOGAÇÃO IDD BARBEARIA & SALÃO VIP NO YOUTUBE")
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

    print(f"\nAdicionando à Playlist da Barbearia ({PLAYLIST_ID})...")
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
