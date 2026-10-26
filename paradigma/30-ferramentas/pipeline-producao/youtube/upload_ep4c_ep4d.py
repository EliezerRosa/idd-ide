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
        "key": "metodologia_ep4c_diff_intencoes",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4C.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_4c.png",
        "pos": 12,
        "title": "Metodologia IDD na Prática - Ep. 4C: Máquina de Diff de Intenções & Evolução de Esquema",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 4C: A Máquina de Diff de Intenções & Evolução de Esquema (Por que o Git Não Basta)

Quando o sistema já está rodando em produção com milhares de dados reais e o negócio muda, como evoluir a aplicação sem quebrar o banco de dados?

Neste episódio metodológico sobre o Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga apresentam a Máquina de Diff de Intenções: uma esteira de análise semântica que compara grafos de intenção e modelos de domínio em vez de apenas linhas de código no Git.

Destaques deste Episódio:
• Por que o Git Não Basta: Diferenças sintáticas de texto não compreendem semântica relacional de negócio
• Classificação Tripartida de Mutações:
  - Classe A (Aditiva Segura): Novos campos opcionais ou entidades paralelas (IA compila diretamente)
  - Classe B (Endurecimento de Regra): Restrições novas em dados existentes (exige raio de alcance)
  - Classe C (Estrutural Crítica): Alterações de cardinalidade e chaves (exige plano formal de migração)
• O Ciclo Operacional em 5 Etapas: AST Parsing → Mapeamento de Grafo → Classificação de Risco → Plano Declarativo → Suíte de Não-Regressão
• Human-in-the-Loop Obrigatório: Mudanças de Classe B e C exigem aprovação explícita antes de qualquer mutação em banco
• Preparação para o Ep. 4D: Como lidar com novas leis sem invalidar dados antigos!

⏱️ Capítulos:
00:00 - O Dilema da Evolução Contínua em Produção
00:17 - Por que o Git Não Basta: Grafos Semânticos de Domínio
00:38 - Classificação Tripartida: Mutações de Classe A, B e C
00:53 - Raio de Alcance & Plano de Migração de Intenção
01:11 - O Ciclo Operacional em 5 Etapas do IDD
01:22 - Simulação de Impacto & Proteção dos Dados em Produção
01:37 - Chamada para o Ep. 4D: Invariantes Temporizadas!
01:51 - Encerramento & Inscrição na Playlist Oficial

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #DiffDeIntencoes #EvolucaoDeEsquema #AST #EngenhariaDeSoftware #DevOps #IAAutonoma #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Diff de Intencoes", "Evolucao de Esquema",
            "AST", "Migracao de Dados", "Engenharia de Software", "Arquitetura de Software",
            "IA", "Inteligencia Artificial", "Eliezer Rosa", "EliezerJPRosa", "PMOC", "Refrigeracao"
        ]
    },
    {
        "key": "metodologia_ep4d_invariantes_temporizadas",
        "file": PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4D.mp4",
        "thumb": PROD_DIR / "capas" / "capa_novo_episodio_4d.png",
        "pos": 13,
        "title": "Metodologia IDD na Prática - Ep. 4D: Invariantes Temporizadas & Padrão Expand-Contract",
        "description": """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 4D: Invariantes Temporizadas & Padrão Expand-Contract (Blindagem Histórica em Produção)

A fiscalização ambiental passou a exigir o número da balança calibrada na recarga de gás refrigerante. Como aplicar essa regra estrita sem invalidar as milhares de manutenções realizadas no passado?

Neste episódio de fechamento arquitetural do Paradigma Intent-Driven Development (IDD), o Orquestrador Eliézer Rosa e a Usuária Leiga mostram como o compilador IDD gera Invariantes Temporizadas (guardas temporais) e opera o padrão Expand and Contract para blindar o patrimônio de dados de qualquer empresa.

Destaques deste Episódio:
• O Risco da Trava Retroativa Clássica: Por que comandos destrutivos diretos corrompem dados históricos
• O Conceito de Invariantes Temporizadas: O passado permanece juridicamente perfeito sob suas regras originais
• Fórmula Condicional de Guarda Temporal: Validação matemática baseada na data de vigência normativa
• Padrão Expand and Contract em 3 Fases:
  1. Expandir: Novos campos opcionais sem interrupção de serviço
  2. Sincronizar: Backfill seguro e idempotente com IA
  3. Contrair: Descomissionamento seguro somente após transição validada
• Suíte de Não-Regressão de Invariantes: Shadow Replay em milhares de registros legados antes do deploy
• A Jornada Completa do IDD: Da especificação sem código à evolução contínua blindada por IA

⏱️ Capítulos:
00:00 - O Dilema da Nova Regra Ambiental vs Dados Históricos
00:19 - A Solução IDD: Invariantes Temporizadas & Guardas Temporais
00:41 - A Fórmula Condicional da Validação Temporal
00:57 - O Padrão Expand and Contract: Zero Comandos Destrutivos
01:18 - Suíte de Testes de Não-Regressão de Invariantes
01:32 - Blindagem Total do Patrimônio de Dados com Matemática Formal
01:49 - O Ciclo Completo de Vida do Software no Paradigma IDD
02:03 - Encerramento & Vitória da Engenharia Orientada à Intenção

📺 Assista a Playlist Oficial Completa "IDD na Prática — Refrigeração (Gerência de Manutenção)":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #InvariantesTemporizadas #ExpandAndContract #BancoDeDados #EngenhariaDeSoftware #DevOps #EliezerRosa #EliezerJPRosa #Refrigeracao #PMOC
""",
        "tags": [
            "IDD", "Intention-Driven Development", "Invariantes Temporizadas", "Expand and Contract",
            "Guardas Temporais", "Nao-Regressao", "Engenharia de Software", "Banco de Dados",
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
