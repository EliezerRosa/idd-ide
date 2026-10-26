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
PROD_DIR = BASE_DIR / "producao_yt"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Refrigeração (Gerência de Manutenção)

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

VIDEOS = [
    {
        "key": "metodologia_ep4e_ergonomia_industrial",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4E.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_4e.png",
        "pos": 14,
        "title": "Metodologia IDD na Prática - Ep. 4E: Ergonomia Industrial & Multimodalidade em Campo",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 4E: Ergonomia Industrial & Multimodalidade em Campo (O Teste da Luva e da Graxa)

O que acontece quando uma arquitetura perfeita desenvolvida no ar-condicionado de um escritório chega ao telhado a 38°C nas mãos de um mecânico com luvas de proteção sujas de óleo?

Neste episódio metodológico do Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga mostram como a ergonomia deixa de ser mero design cosmético e passa a ser tratada como Intenção Operacional Humana e Invariantes de Atrito.

Destaques deste Episódio:
• O Choque de Realidade do Campo: Por que formulários web de 30 campos e menus minúsculos falham no telhado
• Invariantes Ergonômicas de Interface:
  - Alvos de toque industriais sobredimensionados (Touch Targets de 64px a 80px para uso com luvas)
  - Modo High-Vis Outdoor: Contraste óptico extremo para sol direto e penumbra de casas de máquinas
  - Eliminação da Digitação Manual: Identificação do ativo em 1 segundo via QR Code
• Multimodalidade com IA em Campo:
  - Laudo Técnico Ditado por Voz (Push-to-Talk de 10 segundos)
  - A IA extrai peças, quantidades de fluido e causas, mapeando diretamente para o modelo MER
  - Confirmação em 1 toque (Confirm-Once)
• OCR de Instrumentos: Captura direta de pressões de manifold e dados de plaqueta sem digitar números
• Redução do Tempo de Fechamento de OS: De 15 minutos para menos de 45 segundos!

⏱️ Capítulos:
00:00 - O Choque de Realidade: A Vida Real no Campo Industrial
00:16 - Por que o Software Convencional Falha no Telhado
00:36 - Alvos de Toque de 80px e Contraste Outdoor para Sol Direto
00:51 - Identificação Instantânea por QR Code sem Digitação
01:07 - IA Multimodal: Laudo Técnico Ditado por Voz (Push-to-Talk)
01:21 - OCR de Instrumentos: Manifold e Plaqueta Lidos Automaticamente
01:41 - Redução Brutal do Tempo de Fechamento de OS (45 segundos)
01:55 - Chamada para o Ep. 4F: Arquitetura Offline-First!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #ErgonomiaIndustrial #UXIndustrial #Multimodalidade #IA #EngenhariaDeSoftware #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Ergonomia Industrial", "UX de Campo",
            "Multimodalidade", "Laudo por Voz", "OCR", "Engenharia de Software",
            "IA", "Inteligencia Artificial", "Eliezer Rosa", "EliezerJPRosa", "PMOC", "Refrigeracao"
        ]
    },
    {
        "key": "metodologia_ep4f_offline_first_validacao",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4F.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_4f.png",
        "pos": 15,
        "title": "Metodologia IDD na Prática - Ep. 4F: Offline-First & Validação com Operadores Reais",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 4F: Arquitetura Offline-First & Validação com Operadores Reais (Gaiolas de Faraday)

Como o aplicativo de manutenção opera dentro de uma câmara frigorífica de aço e concreto ou no subsolo de um shopping onde não existe sinal 4G ou Wi-Fi?

Neste episódio que consagra a maturidade do Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga detalham a arquitetura Offline-First mandatória, banco embarcado relacional, sincronização por CRDTs e a validação assistida com mecânicos veteranos.

Destaques deste Episódio:
• O Efeito Gaiola de Faraday: A falha mortal dos sistemas dependentes de nuvem no ambiente industrial
• Doutrina IDD: O aplicativo é 100% autônomo e relacional dentro do próprio dispositivo
• Banco de Dados Embarcado (SQLite / WatermelonDB):
  - Invariantes de negócio ativas offline
  - Transações atômicas locais (Unit of Work) seladas com hash criptográfico
  - Zero perda de dados mesmo em caso de bateria descarregada
• Sincronização Resiliente ao Reconectar:
  - Despacho idempotente de eventos de domínio
  - Resolução de concorrência com CRDTs e ordenação temporal determinística
  - Zero sobreposição de dados entre turnos diferentes de técnicos
• Validação Assistida com Operadores Reais: O teste da luva e aprovação de campo
• O Ciclo Completo do IDD: Da intenção sem código ao triunfo em produção real!

⏱️ Capítulos:
00:00 - O Efeito Gaiola de Faraday em Câmaras Frigoríficas e Subsolos
00:16 - Por que Sistemas Dependentes de Nuvem Perdem Dados
00:36 - Banco SQLite Local e Transações Atômicas Embarcadas
00:51 - Fila Criptografada e Proteção Contra Queda de Bateria
01:09 - Sincronização Resiliente ao Recuperar Sinal de Rede
01:23 - Resolução de Concorrência com CRDTs sem Conflitos
01:43 - Validação Assistida com Mecânicos Veteranos em Campo
01:57 - Encerramento Triunfal: O Ciclo de Vida Completo do Paradigma IDD

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #OfflineFirst #GaiolaDeFaraday #CRDT #SQLite #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Offline First", "Gaiola de Faraday",
            "CRDT", "SQLite", "Sincronizacao Resiliente", "Engenharia de Software",
            "IA", "Inteligencia Artificial", "Eliezer Rosa", "EliezerJPRosa", "PMOC", "Refrigeracao"
        ]
    }
]

def upload_single_video(yt, v_info):
    v_file = v_info["file"]
    t_file = v_info["thumb"]
    print("\n" + "=" * 70)
    print(f"🚀 INICIANDO UPLOAD: {v_info['title']}")
    print("=" * 70)

    if not v_file.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {v_file}")
    
    size_mb = v_file.stat().st_size / (1024 * 1024)
    print(f"Arquivo: {v_file.name} ({size_mb:.1f} MB)")
    print(f"Posição na Playlist: {v_info['pos']}")

    body = {
        "snippet": {
            "title": v_info["title"],
            "description": v_info["description"],
            "tags": v_info["tags"],
            "categoryId": "28",
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    media = MediaFileUpload(str(v_file), chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = resp["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")

    if t_file.exists():
        print(f"Definindo Capa: {t_file.name}...")
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(t_file))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Erro ao aplicar capa: {e}")

    print(f"Inserindo na Playlist {PLAYLIST_ID} na posição {v_info['pos']}...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": v_info["pos"],
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist com sucesso! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao inserir na playlist: {e}")

    return video_id

def main():
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    uploaded_ids = {}
    for v_info in VIDEOS:
        vid = upload_single_video(yt, v_info)
        uploaded_ids[v_info["key"]] = vid

    # Atualizar manifest
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                for k, v in uploaded_ids.items():
                    manifest["channels"]["eliezer_rosa"]["videos"][k] = v
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("\n[OK] upload_manifest.json atualizado com os novos vídeos.")
        except Exception as e:
            print(f"[!] Aviso manifest: {e}")

    # Listar playlist completa
    print("\n" + "=" * 70)
    print("★ PLAYLIST OFICIAL ATUALIZADA: IDD na Prática - Refrigeração ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  [{idx}] pos={sn.get('position', idx)}: {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
