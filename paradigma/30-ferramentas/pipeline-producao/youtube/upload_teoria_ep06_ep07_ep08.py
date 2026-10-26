"""Script de upload e inserção sequencial dos Episódios 06, 07 e 08
na Playlist oficial "IDD — Base de Conhecimento (Série Completa)"
com thumbnails personalizadas 16:9 e metadados com SEO acadêmico e hashtags de ponta.
"""

import json
import sys
import time
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

PLAYLIST_ID = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"  # IDD — Base de Conhecimento (Série Completa)

VIDEOS = [
    {
        "key": "teoria_ep06_invariantes_smt",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep06.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep06.png",
        "title": "IDD Base de Conhecimento — Ep. 06: Invariantes Formais & SMT Solvers (Z3 & Dafny)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 06: A Teoria das Invariantes Formais & Raciocínio Automatizado (Z3, Dafny e AWS)

Por que a cultura tradicional de testes unitários baseados em "assert_equal" é perigosamente insuficiente na era da inteligência artificial generativa?

Neste episódio da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga mostram como o IDD incorpora o Raciocínio Automatizado (Automated Reasoning) e provadores formais como o Microsoft Z3 e Dafny — os mesmos padrões matemáticos utilizados pelo AWS Automated Reasoning Group — para garantir alucinação de domínio absolutamente zero.

Destaques deste Episódio:
• A Insuficiência dos Testes Unitários: Testes baseados em exemplos cobrem pontos finitos; sistemas reais com IA exigem provas universais
• Raciocínio Automatizado & SMT Solvers: Como provadores matemáticos garantem que nenhuma regra seja violada
• A Tríade de Invariantes do IDD: Invariantes Estruturais (MER), Comportamentais (UML) e Temporizadas (blindagem histórica)
• Alucinação Zero: Se a proposta do agente de IA violar uma invariante, o compilador IDD rejeita a compilação no ato
• A Prova Formal antes do Deploy: Engenharia de software matematicamente inabalável

⏱️ Capítulos:
00:00 - Introdução: O Limite dos Testes Unitários com IA
00:19 - Raciocínio Automatizado: A Lição de AWS e Microsoft Z3 / Dafny
00:46 - A Tríade das Invariantes do IDD: Estruturais, Comportamentais e Temporizadas
01:09 - A Blindagem de Dados Históricos contra Mutação Indevida
01:31 - A Prova Formal do SMT Solver antes de Qualquer Deploy
01:54 - Conclusão e Chamada para o Episódio 07: Engenharia Constitucional e Diff Semântico!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #FormalMethods #SMTSolvers #Z3Solver #Dafny #AutomatedReasoning #AWSAutomatedReasoning #NeuroSymbolicAI #EngenhariaDeSoftware #SoftwareEngineering #VibeCoding #ComputerScience #EliezerRosa #EliezerJPRosa #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Formal Methods", "SMT Solvers",
            "Z3 Solver", "Microsoft Z3", "Dafny", "Automated Reasoning",
            "AWS Automated Reasoning", "Neuro-Symbolic AI", "Engenharia de Software",
            "Software Engineering", "Vibe Coding", "Computer Science",
            "Eliezer Rosa", "EliezerJPRosa", "Domain Invariants", "Software 3.0"
        ]
    },
    {
        "key": "teoria_ep07_engenharia_constitucional_diff",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep07.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep07.png",
        "title": "IDD Base de Conhecimento — Ep. 07: Engenharia Constitucional & Diff Semântico de Esquema",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 07: A Engenharia de Software Constitucional & A Máquina de Diff de Intenções

Por que o Git é cego para a inteligência artificial, e como as regras de negócio atuam como a Constituição Inegociável de uma empresa?

Neste episódio da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga expandem o conceito de Constitutional AI — consagrado por laboratórios de pesquisa como a Anthropic — para a integridade de arquiteturas de software, revelando a Máquina de Diff de Intenções e a Classificação Tripartida de Mutações de Domínio.

Destaques deste Episódio:
• Engenharia de Software Constitucional: As invariantes de domínio atuam como a Constituição pétrea e inviolável do sistema
• Por que o Git é Cego: O Git compara caracteres e hashes ASCII de linhas; ele não compreende cardinalidades ou integridade relacional
• A Máquina de Diff de Intenções: Comparação semântica sobre o grafo ontológico de intenção (AST/IR)
• Classificação Tripartida de Mutações: Classe A (Adições puras), Classe B (Endurecimento com cálculo de raio) e Classe C (Ruptura Expand & Contract)
• Soberania Epistêmica: O tribunal Human-in-the-Loop retém a autoridade suprema sobre evoluções de esquema

⏱️ Capítulos:
00:00 - Introdução: Da Anthropic Constitutional AI à Engenharia de Software
00:21 - A Constituição Inegociável de Domínio no Paradigma IDD
00:46 - Por que o Git é Cego para Mutações de Banco e Arquitetura
01:07 - A Máquina de Diff de Intenções: Grafo Semântico vs Texto Cego
01:29 - A Classificação Tripartida de Mutações (Classes A, B e C)
01:47 - O Padrão Expand and Contract e a Soberania Epistêmica Humana
02:06 - Conclusão e Chamada para o Episódio 08: A Teoria da Ação Atômica e Sagas!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #ConstitutionalAI #Anthropic #SchemaEvolution #DiffSemantico #IntentIR #ExpandAndContract #DatabaseEvolution #EngenhariaDeSoftware #SoftwareEngineering #FormalMethods #NeuroSymbolicAI #EliezerRosa #EliezerJPRosa #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Constitutional AI", "Anthropic",
            "Schema Evolution", "Diff Semântico", "Intent IR", "Expand and Contract",
            "Database Evolution", "Engenharia de Software", "Software Engineering",
            "Formal Methods", "Neuro-Symbolic AI", "Eliezer Rosa", "EliezerJPRosa",
            "Computer Science", "Software 3.0", "Domain Invariants"
        ]
    },
    {
        "key": "teoria_ep08_acao_atomica_sagas",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep08.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep08.png",
        "title": "IDD Base de Conhecimento — Ep. 08: A Teoria da Ação Atômica (Sagas de Domínio em 4 Fases)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 08: A Teoria da Ação Atômica & Sagas de Domínio (Fechamento da Série Fundamental)

Qual é o calcanhar de Aquiles dos agentes de IA ao executarem operações complexas, e como o Protocolo Canônico em 4 Fases assegura consistência absoluta?

Neste episódio magistral que encerra a Série Fundamental da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga mostram como unir a teoria clássica de sistemas distribuídos (Sagas de Hector Garcia-Molina e a filosofia de Pat Helland sobre dados através do tempo) ao Protocolo de Ação Atômica do IDD.

Destaques deste Episódio:
• O Perigo do Código Livre: Meia-transação, estados órfãos e corrupção de banco gerados por agentes autônomos ad-hoc
• O Protocolo Canônico da Ação Atômica: As 4 fases fundamentais (Guarda, Mutação, Selagem e Compensação)
• Fase 1 - Guarda: Validação de precondições com falha rápida (fail-fast) via SMT Solver
• Fase 2 - Mutação: Execução idempotente no escopo estritamente isolado da intenção
• Fase 3 - Selagem: Verificação de pós-condições e emissão do Domain Event imutável
• Fase 4 - Compensação: Reversão simétrica pré-declarada para consistência eventual sem deadlocks
• O Triunfo do IDD: O fechamento da série teórica e a fundação da Engenharia de Software 3.0

⏱️ Capítulos:
00:00 - Introdução: O Desafio Comportamental da IA no Mundo Real
00:26 - Por que Agentes Autônomos Ad-Hoc Corrompem Estados de Banco
00:51 - O Protocolo Canônico em 4 Fases: Guarda, Mutação, Selagem e Compensação
01:14 - A Matemática das Fases: Precondições, Idempotência e Domain Events
01:37 - Sagas de Domínio: A Sabedoria de Pat Helland e Garcia-Molina
02:00 - Compensação Declarativa: Consistência Total sem Bloqueios Distribuídos
02:22 - Fechamento da Série Fundamental: A Nova Engenharia de Software 3.0!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #AtomicActions #DistributedSagas #PatHelland #GarciaMolina #EventSourcing #Idempotence #DomainDrivenDesign #DDD #FormalMethods #EngenhariaDeSoftware #SoftwareEngineering #VibeCoding #ComputerScience #EliezerRosa #EliezerJPRosa #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Atomic Actions", "Distributed Sagas",
            "Pat Helland", "Hector Garcia-Molina", "Event Sourcing", "Idempotence",
            "Domain-Driven Design", "DDD", "Formal Methods", "Engenharia de Software",
            "Software Engineering", "Vibe Coding", "Computer Science",
            "Eliezer Rosa", "EliezerJPRosa", "Software 3.0"
        ]
    }
]

def get_yt_service():
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    creds = Credentials.from_authorized_user_info(data)
    return build('youtube', 'v3', credentials=creds)

def main():
    print("=" * 80)
    print("🚀 INICIANDO UPLOAD BROADCAST DOS EPISÓDIOS 06, 07 E 08 PARA O YOUTUBE")
    print(f"Playlist Alvo: {PLAYLIST_ID}")
    print("=" * 80)

    yt = get_yt_service()

    for item in VIDEOS:
        print(f"\n--- Processando: {item['title']} ---")
        vid_file = item["file"]
        thumb_file = item["thumb"]

        if not vid_file.exists():
            print(f"❌ Arquivo de vídeo não encontrado: {vid_file}")
            continue

        print(f"📦 Tamanho do arquivo: {vid_file.stat().st_size / (1024*1024):.2f} MB")
        print(f"📝 Comprimento do título: {len(item['title'])} caracteres (Limite: 100)")

        body = {
            "snippet": {
                "title": item["title"],
                "description": item["description"],
                "tags": item["tags"],
                "categoryId": "28"  # Science & Technology
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False
            }
        }

        media = MediaFileUpload(
            str(vid_file),
            chunksize=5 * 1024 * 1024,
            resumable=True,
            mimetype="video/mp4"
        )

        print("📤 Fazendo upload do vídeo...")
        insert_req = yt.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = None
        while response is None:
            status, response = insert_req.next_chunk()
            if status:
                print(f"   Progresso de upload: {int(status.progress() * 100)}%")

        video_id = response.get("id")
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        print(f"🎉 VÍDEO PUBLICADO COM SUCESSO! ID: {video_id}")
        print(f"🔗 URL: {video_url}")

        # Definir Thumbnail
        if thumb_file.exists():
            print(f"🖼️ Enviando Capa personalizada 16:9: {thumb_file.name}...")
            try:
                yt.thumbnails().set(
                    videoId=video_id,
                    media_body=MediaFileUpload(str(thumb_file), mimetype="image/png")
                ).execute()
                print("   [OK] Thumbnail personalizada aplicada com sucesso!")
            except Exception as e:
                print(f"   ⚠️ Aviso ao aplicar thumbnail: {e}")
        else:
            print(f"   ⚠️ Capa não encontrada em: {thumb_file}")

        # Adicionar à Playlist
        print(f"📋 Adicionando à Playlist {PLAYLIST_ID}...")
        try:
            pl_item_body = {
                "snippet": {
                    "playlistId": PLAYLIST_ID,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
            yt.playlistItems().insert(
                part="snippet",
                body=pl_item_body
            ).execute()
            print("   [OK] Vídeo adicionado à Playlist com sucesso!")
        except Exception as e:
            print(f"   ⚠️ Erro ao adicionar à playlist: {e}")

        time.sleep(3)

    print("\n" + "=" * 80)
    print("🏆 TODOS OS EPISÓDIOS (06, 07 E 08) FORAM PUBLICADOS E INTEGRADOS À PLAYLIST!")
    print("=" * 80)

if __name__ == "__main__":
    main()
