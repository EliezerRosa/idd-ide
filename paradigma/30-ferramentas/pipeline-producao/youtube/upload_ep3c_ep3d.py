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
        "key": "metodologia_ep3c_bounded_contexts",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_3C.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_3c.png",
        "pos": 8,
        "title": "Metodologia IDD na Prática - Ep. 3C: Bounded Contexts & Modularidade (UCs de 1º e 2º Nível)",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 3C: Bounded Contexts Rígidos & Modularidade Estrita (Da Decomposição UML às Fronteiras Semânticas)

Como evitar que uma inteligência artificial gere "código espaguete monolítico" ao implementar um sistema complexo?

Neste episódio metodológico da nossa série sobre o Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga mostram como utilizar os Casos de Uso de 1º Nível do UML para estabelecer Bounded Contexts rígidos e delimitar sub-módulos completamente desacoplados.

Destaques deste Episódio:
• O Risco do Desenvolvimento com IA sem Fronteiras: Por que prompts soltos geram código tóxico e acoplado
• Os 4 Bounded Contexts do Domínio HVAC-R: Ativos & Prontuário, PMOC Normativo, Física Térmica e Field Service
• Decomposição Hierárquica: Como UCs de 1º Nível (Intenções Macro) originam UCs de 2º Nível
• Soberania Semântica: Zero dependências circulares e comunicação limpa via eventos de domínio
• A Conexão com o MER: Como as chaves e regras relacionais sustentam as fronteiras modulares

⏱️ Capítulos:
00:00 - O Desafio da Modularidade: Por que a IA precisa de fronteiras estritas?
00:16 - A Resposta do IDD: Casos de Uso de 1º Nível delimitando Bounded Contexts
00:39 - Os 4 Bounded Contexts em HVAC-R: Ativos, PMOC, Física e Campo
00:52 - Soberania de Regras: Cada sub-módulo com autoridade exclusiva
01:10 - Decomposição Prática: Como UCs de 1º Nível desdobram em 2º Nível
01:19 - Casos de Uso de 2º Nível: Tag QR, Retrofit e Baixa Histórica
01:40 - Chamada para o Ep. 3D: Transações Atômicas de Negócio & Métodos UML!
01:54 - Encerramento & Inscrição na Playlist Oficial

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #BoundedContexts #Modularidade #UML #EngenhariaDeSoftware #DevOps #IAAutonoma #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Bounded Contexts", "Modularidade",
            "UML", "Casos de Uso", "Engenharia de Software", "Arquitetura de Software",
            "IA", "Inteligencia Artificial", "Eliezer Rosa", "EliezerJPRosa", "PMOC", "Refrigeracao"
        ]
    },
    {
        "key": "metodologia_ep3d_transacoes_atomicas",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_3D.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_3d.png",
        "pos": 9,
        "title": "Metodologia IDD na Prática - Ep. 3D: Transações Atômicas, Invariantes do MER & Métodos UML",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 3D: Transações Atômicas de Negócio & Métodos de Classes UML (Unit of Work, Sagas & Invariantes)

O que acontece quando o aplicativo precisa gravar dados reais e a internet cai no meio da operação? Como garantir que uma operação complexa não deixe o banco de dados corrompido pela metade?

Neste episódio metodológico avançado do Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga demonstram como os Casos de Uso de 2º Nível operam como Transações Atômicas (Unit of Work / Sagas de Agregado) e como as Classes UML implementam métodos comportamentais em 4 fases invioláveis.

Destaques deste Episódio:
• Transações Atômicas no Negócio: Tudo ou nada! Zero tolerância a estados corrompidos
• Estudo de Caso Real: Fechamento bi-partite de OS, baixa de peças no veículo e laudo PMOC
• Ação Imediata da Compensação: Rollback automático com estorno de estoque em caso de falha
• O Protocolo Canônico das 4 Fases nas Classes UML:
  1. Guarda (validarPreCondicoes)
  2. Mutação (executarMutacao)
  3. Pós-Condição & Selagem (assegurarInvariantes)
  4. Compensação & Rollback (compensarRollback)
• A Vitória da Engenharia IDD: Velocidade de IA aliada ao rigor inegociável da engenharia de software

⏱️ Capítulos:
00:00 - Introdução: Como garantir integridade de dados sem corrupção parcial?
00:17 - O Conceito Moderno: Casos de Uso de 2º Nível como Transações Atômicas
00:37 - Estudo de Caso em Campo: Fechamento de OS com laudo e baixa de peças
00:54 - Compensação Automática: Estorno de estoque móvel e proteção do cliente
01:15 - Classes UML: Métodos como sub-componentes comportamentais em 4 fases
01:28 - Guarda, Mutação, Pós-Condição e Compensação explicados
01:44 - A Vitória da Maturidade IDD: Rigor inegociável da engenharia de software
02:00 - Encerramento & Próximos Passos: Ep. 4 (Validação em Produção)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #TransacoesAtomicas #UnitOfWork #UML #ClassesUML #Invariantes #MER #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Transacoes Atomicas", "Unit of Work",
            "Sagas", "UML", "Classes UML", "Invariantes", "MER", "Engenharia de Software",
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
