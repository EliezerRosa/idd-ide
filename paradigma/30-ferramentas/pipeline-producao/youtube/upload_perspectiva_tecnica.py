"""Upload do Especial de Perspectiva Técnica do Paradigma IDD para a nova Playlist oficial
'IDD  Paradigma - Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização'
"""

import json
import os
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

PLAYLIST_ID = "PLW-P0rMNaKDs"  # IDD  Paradigma - Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização

VIDEO_FILE = PROD_DIR / "IDD_Paradigma_Perspectiva_Tecnica_Especial.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_perspectiva_tecnica.png"

TITLE = "IDD Paradigma — Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização"

DESCRIPTION = """\
🏛️ IDD PARADIGMA — PERSPECTIVA TÉCNICA (ESPECIAL DE ENGENHARIA DE SOFTWARE 3.0)
Episódio Especial: Uma Avaliação Técnica e Isenta — O Que Está Faltando para o IDD se Tornar Padrão Global da Indústria?

Por que o "Vibe Coding" — a prática de aceitar código gerado por IA sem garantias formais — está criando a maior crise silenciosa de dívida técnica da história, e o que separa o Paradigma IDD de ser adotado mundialmente como o DDD ou o LLVM?

Neste episódio especial, Eliézer Rosa e a bancada técnica do canal realizam uma avaliação rigorosamente técnica, isenta e desprovida de condescendência sobre o ecossistema de software contemporâneo, confrontando ferramentas experimentais de agentes de IA (Anthropic MCP, Google Antigravity, GitHub Copilot Workspace, Aider) com a ontologia formal do IDD e detalhando os Cinco Pilares de Formalização necessários para a maturidade industrial.

🎯 Destaques deste Episódio Especial:
• Diagnóstico Isento: As vitórias consolidadas do IDD (Ontologia da Intenção, Comando Epistêmico vs Operacional) vs As carências de formalização.
• MCP & Antigravity vs IDD: Por que o Model Context Protocol é o encanamento (JSON-RPC e tool calling mecânico), enquanto o IDD é a engenharia de controle ontológico.
• Pilar 1 — Intent IR Canônica: A superação do prompt solto através de uma Árvore Sintática Abstrata (AST) compilável para múltiplos targets (inspirada na tradição LLVM e Stanford DSPy).
• Pilar 2 — A Morte do Assert_Equal: Por que testes unitários por amostragem finita falham contra alucinações de IA, e como provadores matemáticos SMT (Microsoft Z3, Dafny e padrões AWS Automated Reasoning) provam invariantes universais (∀).
• Pilar 3 — Engenharia Constitucional & Diff Semântico: Por que o Git é cego (compara caracteres ASCII e ignora cardinalidades) e como a Máquina de Diff de Grafo e o padrão Expand & Contract protegem bancos de dados.
• Pilar 4 — A Teoria da Ação Atômica: O pesadelo da meia-transação em agentes autônomos e o Protocolo Canônico em 4 Fases (Guard, Mutate, Seal, Compensate) fundamentado em Pat Helland.
• Pilar 5 — O Benchmark Canônico IDD: Por que o SWE-bench é ingênuo e como um teste com 1.000 mutações consecutivas de domínio prova 0% de quebra catastrófica.
• A Linhagem Histórica de 79 Anos: De Vannevar Bush (1945), Wiener, Licklider e Douglas Engelbart (1968) a Alan Kay e a síntese humanista de Eliézer Rosa.
• A Grande Síntese: A intenção governa, a IA compila e o ser humano arbitra.

⏱️ Capítulos Oficiais:
00:00 - Introdução: O Que Falta para o IDD se Tornar Padrão Global?
00:50 - MCP & Ferramentas Experimentais vs IDD: Encanamento vs Engenharia
01:33 - Pilar 1: Intent IR Canônica (A Morte do Prompt Frágil e a AST de Domínio)
02:13 - Pilar 2: SMT Solvers & Verificação Formal (A Morte do Assert_Equal com Z3 e Dafny)
02:51 - Pilar 3: Engenharia Constitucional & Diff Semântico (Por que o Git é Cego)
03:28 - Pilar 4: A Teoria da Ação Atômica (Sagas de Domínio em 4 Fases)
04:06 - Pilar 5: O Benchmark Canônico IDD (Além do SWE-bench)
04:42 - A Linhagem Histórica de 79 Anos (De Vannevar Bush e Engelbart a Alan Kay)
05:20 - Estratégia de Descoberta & Matriz de Hashtags Acadêmicas
05:54 - Conclusão: O Futuro Pertence a Quem Governa a Intenção

📺 Assista à Playlist Oficial desta Série Especial:
https://www.youtube.com/playlist?list=PLW-P0rMNaKDs

📺 Assista também à Série Completa "IDD — Base de Conhecimento":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
Repositório em Produção: github.com/EliezerRosa/rvm-designacoes-antigravity

#IDD #IntentDrivenDevelopment #SoftwareEngineering #VibeCoding #FormalMethods #SMTSolvers #Z3Solver #Dafny #AWSAutomatedReasoning #ConstitutionalAI #ModelContextProtocol #MCP #Antigravity #DistributedSagas #PatHelland #DomainDrivenDesign #DDD #ComputerScience #ICSE #POPL #PLDI #EliezerRosa #EliezerJPRosa #Software3_0
"""

TAGS = [
    "IDD", "Intent-Driven Development", "Vibe Coding", "Software Engineering",
    "Formal Methods", "SMT Solvers", "Z3 Solver", "Microsoft Z3", "Dafny",
    "AWS Automated Reasoning", "Constitutional AI", "Model Context Protocol", "MCP",
    "Antigravity", "Distributed Sagas", "Pat Helland", "Domain-Driven Design", "DDD",
    "Intent IR", "Stanford DSPy", "Computer Science", "ICSE", "POPL", "PLDI",
    "Eliezer Rosa", "EliezerJPRosa", "Software 3.0", "Program Synthesis"
]

def get_yt_service():
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    creds = Credentials.from_authorized_user_info(data)
    return build("youtube", "v3", credentials=creds)

def upload_video():
    if not VIDEO_FILE.exists():
        print(f"❌ Arquivo de vídeo ainda não encontrado: {VIDEO_FILE}")
        return

    print("=" * 80)
    print("🚀 INICIANDO UPLOAD DO ESPECIAL DE PERSPECTIVA TÉCNICA PARA O YOUTUBE...")
    print(f"📁 Arquivo: {VIDEO_FILE} ({VIDEO_FILE.stat().st_size / (1024*1024):.2f} MB)")
    print(f"🎬 Título: {TITLE}")
    print(f"📋 Playlist Destino: {PLAYLIST_ID}")
    print("=" * 80)

    yt = get_yt_service()

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28",  # Ciência e Tecnologia
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(str(VIDEO_FILE), mimetype="video/mp4", resumable=True, chunksize=1024*1024*5)
    request = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"   Upload progresso: {int(status.progress() * 100)}%")

    video_id = response.get("id")
    print(f"\n🎉 VÍDEO PUBLICADO COM SUCESSO! Video ID: {video_id}")
    print(f"🔗 URL: https://www.youtube.com/watch?v={video_id}")

    # Upload da Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\n🖼️ Fazendo upload da Thumbnail 16:9: {THUMBNAIL_FILE}...")
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE), mimetype="image/png")
            ).execute()
            print("✅ Thumbnail definida com sucesso!")
        except Exception as e:
            print(f"⚠️ Erro ao definir thumbnail: {e}")

    # Adicionar à nova Playlist
    print(f"\n📑 Inserindo vídeo na Playlist '{PLAYLIST_ID}'...")
    try:
        yt.playlistItems().insert(
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
        print("✅ Vídeo adicionado à Playlist com sucesso!")
    except Exception as e:
        print(f"⚠️ Erro ao adicionar à playlist: {e}")

    # Atualizar upload_manifest.json
    manifest_file = PROD_DIR / "upload_manifest.json"
    try:
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest_data["especial_perspectiva_tecnica"] = {
            "videoId": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "title": TITLE,
            "playlistId": PLAYLIST_ID,
            "filename": VIDEO_FILE.name
        }
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2, ensure_ascii=False)
        print("✅ Manifesto upload_manifest.json atualizado com o vídeo.")
    except Exception as e:
        print(f"Aviso no manifesto: {e}")

    print("\n" + "=" * 80)
    print("🏆 ESTEIRA COMPLETA FINALIZADA COM SUCESSO!")
    print(f"🎬 Vídeo: https://www.youtube.com/watch?v={video_id}")
    print(f"📑 Playlist: https://www.youtube.com/playlist?list={PLAYLIST_ID}")
    print("=" * 80)

if __name__ == "__main__":
    upload_video()
