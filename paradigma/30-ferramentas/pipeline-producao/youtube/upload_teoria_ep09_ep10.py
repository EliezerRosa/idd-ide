"""Script de upload e inserção sequencial dos Episódios 09 e 10
na Playlist oficial "IDD — Base de Conhecimento (Série Completa)"
com thumbnails personalizadas 16:9 e metadados com SEO acadêmico e confronto com o mercado.
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
        "key": "teoria_ep09_idd_vs_mcp_antigravity",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep09.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep09.png",
        "title": "IDD Base de Conhecimento — Ep. 09: IDD vs MCP & Antigravity (Encanamento vs Engenharia)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | MASTERCLASS ESPECIAL (O CONFRONTO TÉCNICO)
Episódio 09: IDD vs. MCP & Antigravity (Encanamento de Ferramentas vs. Engenharia de Sistemas)

Com a explosão do Model Context Protocol (Anthropic MCP) e de agentes autônomos como o Google Antigravity, a engenharia de software foi finalmente resolvida ou estamos apenas acelerando desastres?

Neste episódio arrebatador da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga fazem uma avaliação técnica, lúcida e bem-humorada sobre as fronteiras entre a infraestrutura de transporte e a verdadeira arquitetura de sistemas.

Destaques deste Episódio:
• A Analogia da Escavadeira: Ter o Antigravity e o MCP sem IDD é como colocar um operador vendado para operar uma escavadeira potente sobre tubulações de gás
• Protocolo de Transporte vs. Semântica: O MCP é uma excelente camada JSON-RPC, mas não tem moral e não sabe dizer não a um comando destrutivo
• A Pergunta Provocativa: Quantas vezes a IA gerou um patch que compilou sem erros e ainda assim corrompeu as regras de faturamento em produção?
• O Pesadelo da 3ª Ferramenta: O que acontece quando um tool call falha no meio de uma cadeia sem Sagas ou rollback simétrico?
• A Síntese Harmônica: O IDD como a mente ontológica e o Antigravity/MCP como os músculos operacionais

⏱️ Capítulos:
00:00 - Introdução: A Ilusão de que o MCP e o Antigravity Resolveram Tudo
00:23 - A Analogia da Escavadeira: Encanamento vs Engenharia Civil
00:54 - A Pergunta Provocativa: O Código Compilou, mas o Faturamento Quebrou!
01:14 - Por que o Protocolo MCP não Sabe Dizer Não
01:37 - O Pesadelo da 3ª Chamada de Ferramenta sem Sagas Distribuídas
02:00 - A Conclusão: O IDD não Compete com o MCP, Ele Governa!
02:24 - Fechamento e Chamada para o Episódio 10: IDD vs Copilot Workspace e Aider!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #ModelContextProtocol #AnthropicMCP #Antigravity #GoogleAntigravity #SoftwareEngineering #EngenhariaDeSoftware #FormalMethods #SMTSolvers #NeuroSymbolicAI #VibeCoding #CriseDoSoftware #IAConfiável #EliezerRosa #EliezerJPRosa #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Model Context Protocol", "Anthropic MCP",
            "Antigravity", "Google Antigravity", "Software Engineering", "Engenharia de Software",
            "Formal Methods", "SMT Solvers", "Neuro-Symbolic AI", "Vibe Coding",
            "Crise do Software", "IA Confiavel", "Reliable AI", "Agentic AI",
            "Eliezer Rosa", "EliezerJPRosa", "Software 3.0"
        ]
    },
    {
        "key": "teoria_ep10_idd_vs_copilot_aider",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep10.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep10.png",
        "title": "IDD Base de Conhecimento — Ep. 10: IDD vs Copilot Workspace & Aider (Fim do Patch-and-Pray)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | MASTERCLASS ESPECIAL (O CONFRONTO TÉCNICO)
Episódio 10: IDD vs. GitHub Copilot Workspace & Aider (A Ilusão da Spec em Markdown e o Fim do Patch-and-Pray)

O GitHub Copilot Workspace e agentes como o Aider (líder no benchmark SWE-bench) representam o ápice do desenvolvimento guiado por especificação ou continuam presos ao empirismo frágil?

Neste episódio decisivo da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga desmistificam o paradigma do "Patch-and-Pray" e revelam por que a engenharia de software pós-sintaxe exige Intent IR e métodos formais.

Destaques deste Episódio:
• A Ilusão da Spec em Markdown: Transformar prompt em texto livre com bullet points não é compilador determinístico
• O Fim do "Patch-and-Pray": Por que comitar no Git e rezar após passar no pytest é uma falsa sensação de segurança
• Amostragem Finita vs. Prova Matemática: A diferença vital entre testar 3 exemplos e usar o Z3 Solver para provar invariantes universais
• Por que o Git é Cego: Hashes de texto ASCII não compreendem quebras de cardinalidade ou locks de tabela em produção
• A Máquina de Diff de Intenções: Evolução de esquema com Classes A, B e C e o padrão Expand and Contract para zero downtime

⏱️ Capítulos:
00:00 - Introdução: O Copilot Workspace e o Aider já Resolveram o Spec-Driven?
00:23 - A Armadilha da Spec em Markdown: Texto Livre Gerando Texto Livre
00:52 - A Cultura do "Patch-and-Pray": Passou no Pytest e Reza!
01:14 - Provadores SMT (Z3 & Dafny) vs Amostragem Finita de Testes
01:36 - Por que o Git é Cego para Mutações de Banco e Arquitetura
01:58 - A Máquina de Diff de Intenções e o Padrão Expand and Contract
02:20 - Manifesto da Engenharia de Software 3.0: O Triunfo do Paradigma IDD!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #GitHubCopilot #CopilotWorkspace #Aider #SWEbench #SpecDrivenDevelopment #IntentIR #FormalMethods #SMTSolvers #Z3Solver #Dafny #SoftwareEngineering #EngenhariaDeSoftware #VibeCoding #CriseDoSoftware #EliezerRosa #EliezerJPRosa #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "GitHub Copilot", "Copilot Workspace",
            "Aider", "SWEbench", "Spec-Driven Development", "Intent IR",
            "Formal Methods", "SMT Solvers", "Z3 Solver", "Dafny",
            "Software Engineering", "Engenharia de Software", "Vibe Coding",
            "Crise do Software", "Eliezer Rosa", "EliezerJPRosa", "Software 3.0"
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
    print("🚀 INICIANDO UPLOAD BROADCAST DOS EPISÓDIOS 09 E 10 PARA O YOUTUBE")
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
    print("🏆 EPISÓDIOS ESPECIAIS 09 E 10 PUBLICADOS E INTEGRADOS À PLAYLIST!")
    print("=" * 80)

if __name__ == "__main__":
    main()
