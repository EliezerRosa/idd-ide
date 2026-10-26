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

PLAYLIST_ID = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7" # IDD — Base de Conhecimento (Série Completa)

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

VIDEOS = [
    {
        "key": "teoria_ep04_neuro_simbolico",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep04.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep04.png",
        "title": "IDD Base de Conhecimento — Ep. 04: O Paradigma Neuro-Simbólico (Por que LLMs Sozinhos Falham)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 04: O Paradigma Neuro-Simbólico (Por que LLMs Sozinhos Falham e a Resposta do IDD)

Por que a prática recente do "Vibe Coding" — confiar cegamente em código gerado por modelos de linguagem probabilísticos — é considerada insustentável pelos principais pesquisadores de computação do mundo?

Neste episódio da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga mostram a convergência direta do IDD com as pesquisas de fronteira do Google DeepMind e do MIT em Inteligência Artificial Neuro-Simbólica.

Destaques deste Episódio:
• A Ilusão Conexionista: Por que LLMs são brilhantes em intuição linguística, mas alucinam regras e lógica
• O Que É IA Neuro-Simbólica: A união da rede neural generativa com sistemas simbólicos formais
• O Tribunal Simbólico do IDD: O Modelo Entidade-Relacionamento (MER) e as Invariantes como filtros invioláveis
• A Tese Central: A IA gera o código; a matemática formal do IDD valida a verdade do negócio
• O Fim do Achismo Estatístico na Engenharia de Software de Missão Crítica

⏱️ Capítulos:
00:00 - Introdução: A Crise do Vibe Coding Puro
00:19 - A Fraqueza Probabilística das Redes Neurais Estatísticas
00:46 - A Solução Global: O Paradigma Neuro-Simbólico (DeepMind e MIT)
01:06 - A Camada Neuro (LLMs) unida à Camada Simbólica (MER e Invariantes)
01:31 - O Tribunal Simbólico do IDD: A IA Nunca é Juíza de Si Mesma
01:54 - Conclusão e Chamada para o Episódio 05: Compiladores de Intenção!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #NeuroSymbolicAI #DeepMind #VibeCoding #EngenhariaDeSoftware #FormalMethods #SoftwareEngineering #IAAutonoma #AgenticAI #ComputerScience #EliezerRosa #EliezerJPRosa #MIT #Software3_0
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Neuro-Symbolic AI", "DeepMind",
            "Vibe Coding", "Engenharia de Software", "Formal Methods", "Software Engineering",
            "IA Autonoma", "Agentic AI", "Computer Science", "Eliezer Rosa",
            "EliezerJPRosa", "MIT", "Software 3.0", "Stanford DSPy"
        ]
    },
    {
        "key": "teoria_ep05_compilador_intent_ir",
        "file": PROD_DIR / "IDD_Base_Conhecimento_Ep05.mp4",
        "thumb": PROD_DIR / "capas" / "capa_teoria_ep05.png",
        "title": "IDD Base de Conhecimento — Ep. 05: O Compilador de Intenções & Intent IR (A Morte do Prompt)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 05: O Compilador de Intenções & Intent IR (A Morte do Prompt Engineering e o Código como Artefato Transitório)

Por que ficar ajustando palavras em prompts de texto solto é amadorismo empírico e não engenharia de software?

Neste episódio divisor de águas da Base de Conhecimento do Paradigma IDD, Eliézer Rosa e a Usuária Leiga apresentam a Intent IR (Representação Intermediária de Intenção), conectando o IDD às pesquisas de Stanford (DSPy) e à tradição clássica de compiladores como o LLVM/MLIR.

Destaques deste Episódio:
• A Morte do Prompt Engineering: Por que a tentativa e erro de prompts falha em sistemas corporativos
• O Conceito de Intent IR: A árvore semântica abstrata independente de linguagens de programação
• A Analogia com o LLVM: Como a compilação declarativa traduz intenção em software executável
• O Pipeline Determinístico: Da linguagem natural à emissão semântica sem alucinação de sintaxe
• O Código como Artefato Transitório: A Intent IR é o verdadeiro patrimônio perpétuo da sua empresa

⏱️ Capítulos:
00:00 - Introdução: Por que o Prompt Engineering Não É Engenharia
00:20 - A Visão de Stanford DSPy e Compiladores Declarativos Formais
00:46 - O que é a Intent IR: A Representação Intermediária de Intenção
01:10 - A Analogia com o LLVM: Como a Intenção se Torna Código
01:35 - O Pipeline Determinístico em Quatro Etapas do IDD
01:57 - O Código como Mero Artefato Transitório e Descartável
02:18 - Conclusão e Chamada para o Episódio 06: Invariantes Formais e SMT!

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #IntentIR #StanfordDSPy #Compiladores #LLVM #EngenhariaDeSoftware #SoftwareEngineering #PromptEngineering #AgenticAI #NeuroSymbolicAI #Software3_0 #EliezerRosa #EliezerJPRosa #ComputerScience
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Intent IR", "Stanford DSPy",
            "Compiladores", "LLVM", "Engenharia de Software", "Software Engineering",
            "Prompt Engineering", "Agentic AI", "Neuro-Symbolic AI", "Software 3.0",
            "Eliezer Rosa", "EliezerJPRosa", "Computer Science", "Intermediate Representation"
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

    print(f"Inserindo na Playlist {PLAYLIST_ID}...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
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

    # Listar playlist completa
    print("\n" + "=" * 70)
    print("★ PLAYLIST OFICIAL ATUALIZADA: IDD — Base de Conhecimento ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  [{idx}] pos={sn.get('position', idx)}: {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
