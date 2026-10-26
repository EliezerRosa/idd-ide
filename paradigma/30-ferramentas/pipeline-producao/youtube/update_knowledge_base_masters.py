import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

SCOPES = ["https://www.googleapis.com/auth/youtube"]

MASTERS = [
    {
        "videoId": "lNEr7vb0Gyo",
        "newTitle": "IDD Base de Conhecimento — Ep. 01: O que é o Paradigma IDD? (Ontologia da Intenção vs Vibe Coding)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 01: O que é o Paradigma Intent-Driven Development (IDD)? A Ontologia da Intenção contra o Caos do Vibe Coding

Em um cenário onde a inteligência artificial generativa inundou o desenvolvimento de software com a prática do "Vibe Coding" — aceitar código gerado sem controle formal —, como garantir que sistemas complexos permaneçam corretos, compreensíveis e longevos?

Neste episódio inaugural da Base de Conhecimento do Paradigma IDD, o autor Eliézer Rosa apresenta a ontologia fundamental do desenvolvimento orientado à intenção: a passagem do "Requisito Passivo" para a "Intenção Ativa".

Destaques deste Episódio:
• A Crise do Vibe Coding: Por que prompts soltos geram dívida técnica silenciosa e alucinação arquitetural
• O que é o Paradigma IDD: Engenharia de software orientada a intenções matemáticas e modelos formais
• A Metáfora do GPS de Código: O sistema conhece a rota, recalcula desvios e impede violação de limites
• O Princípio do Confirm-Once: O ser humano como árbitro epistemológico e a IA como força de compilação
• Requisito Passivo vs Intenção Ativa: A virada de chave ontológica na era dos agentes autônomos

⏱️ Capítulos:
00:00 - Introdução: A Crise do Vibe Coding e o Papel da IA
00:15 - O que é o Paradigma Intent-Driven Development (IDD)?
00:45 - Requisito Passivo vs Intenção Ativa
01:15 - A Analogia do GPS para Engenharia de Software
01:45 - O Princípio Confirm-Once e a Soberania Humana
02:15 - Conclusão e Próximos Passos na Base de Conhecimento

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #VibeCoding #EngenhariaDeSoftware #SoftwareEngineering #IAAutonoma #AgenticAI #NeuroSymbolicAI #FormalMethods #Software3_0 #EliezerRosa #EliezerJPRosa #GitHubCopilot #DeepMind #ComputerScience
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Vibe Coding", "Engenharia de Software",
            "Software Engineering", "IA Autonoma", "Agentic AI", "Neuro-Symbolic AI",
            "Formal Methods", "Software 3.0", "Eliezer Rosa", "EliezerJPRosa",
            "GitHub Copilot", "DeepMind", "Computer Science", "Stanford DSPy"
        ]
    },
    {
        "videoId": "a3tIPjowBMk",
        "newTitle": "IDD Base de Conhecimento — Ep. 02: Comando Epistêmico vs Operacional (Teoria do Controle Humano-IA)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 02: Comando Epistêmico vs. Comando Operacional (A Teoria do Controle Humano-IA e a Lição do Voo AF447)

Qual é o verdadeiro papel do engenheiro de software quando a inteligência artificial é capaz de escrever milhões de linhas de código em segundos?

Neste episódio seminal, Eliézer Rosa analisa a fronteira mais crítica do desenvolvimento moderno com IA: a distinção entre Comando Epistêmico (o saber, o arbítrio e a intenção de negócio) e Comando Operacional (a execução mecânica de código). Usando a trágica analogia do voo Air France 447, o autor demonstra os perigos mortais da perda de consciência situacional na engenharia.

Destaques deste Episódio:
• A Lição do Voo Air France 447: O que acontece quando os operadores perdem a consciência do sistema
• Comando Epistêmico vs Operacional: Por que delegar a intenção para a IA é suicídio arquitetural
• Augmenting vs Automating: Por que aumentar o ser humano é infinitamente superior a tentar substituí-lo
• Fé Bayesiana vs Credulidade Cega: Como calibrar a confiança nas respostas probabilísticas dos LLMs
• A Origem nos Anos 90: Como o autor implementou Two-Phase Commit (2PC) determinístico sem bibliotecas

⏱️ Capítulos:
00:00 - Introdução: Quem Está Pilotando o Avião do Software?
00:18 - A Tragédia do Voo Air France 447 e a Perda de Consciência Situacional
00:45 - Comando Epistêmico vs Comando Operacional explicados
01:15 - Augmenting vs Automating: O Modelo de Douglas Engelbart
01:45 - Fé Bayesiana: Confiança Baseada em Provas, Não em Credulidade
02:15 - A Experiência dos Anos 90: Construindo Sistemas Confiáveis
02:40 - Conclusão e Síntese Metodológica

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #ComandoEpistemico #AirFrance447 #HumanInTheLoop #TeoriaDoControle #EngenhariaDeSoftware #AgenticAI #NeuroSymbolicAI #BayesianInference #EliezerRosa #EliezerJPRosa #Cybernetics #AugmentedIntelligence
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Comando Epistemico", "Air France 447",
            "Human in the Loop", "Teoria do Controle", "Engenharia de Software", "Agentic AI",
            "Neuro-Symbolic AI", "Bayesian Inference", "Eliezer Rosa", "EliezerJPRosa",
            "Cybernetics", "Augmented Intelligence", "Sistemas Complexos"
        ]
    },
    {
        "videoId": "Kb0EynowDH4",
        "newTitle": "IDD Base de Conhecimento — Ep. 03: A Genealogia do IDD (De Bush a LLMs: 79 Anos de Linhagem)",
        "description": """\
🏛️ IDD — BASE DE CONHECIMENTO | SÉRIE COMPLETA (TRATADO FUNDAMENTAL)
Episódio 03: A Genealogia do Paradigma IDD | De Vannevar Bush a LLMs: 79 Anos de Linhagem Epistemológica

O Paradigma IDD não surgiu do nada e nem é uma moda passageira de prompts. Ele é o herdeiro legítimo de uma linhagem de 79 anos de pesquisa e visão dos maiores pioneiros da ciência da computação.

Neste episódio histórico e aprofundado, Eliézer Rosa traça a genealogia intelectual do Intent-Driven Development, resgatando as ideias seminais que permitiram aos humanos interagir com máquinas como parceiros simbióticos de pensamento.

Destaques deste Episódio:
• 1945 — Vannevar Bush e o "As We May Think": O Memex e o nascimento do hipertexto associativo
• 1948/1960 — Norbert Wiener (Cibernética) e J.C.R. Licklider: A Simbiose Humano-Máquina
• 1963 — Ivan Sutherland e o Sketchpad: Os primeiros constraints e intenções declarativas na computação
• 1968 — Douglas Engelbart e a "Mother of All Demos": O ser humano aumentado pela tecnologia
• Década de 1970 — Alan Kay, Dynabook e Smalltalk: A essência da Orientação a Objetos como troca de intenções
• Da Década de 80 aos LLMs Modernos: Como o IDD unifica 79 anos de história na era dos Agentes de IA

⏱️ Capítulos:
00:00 - Introdução: 79 Anos de História da Computação Humana
00:20 - 1945: Vannevar Bush e o Memex (As We May Think)
00:50 - 1960: Licklider e a Simbiose Humano-Máquina
01:25 - 1963: Ivan Sutherland, Sketchpad e Restrições Declarativas
02:00 - 1968: Douglas Engelbart e a Mother of All Demos
02:40 - 1970: Alan Kay, Dynabook e a Verdadeira Orientação a Objetos
03:20 - O Ponto de Encontro com os LLMs: A Consagração do Paradigma IDD

📺 Assista a Playlist Oficial Completa "IDD — Base de Conhecimento (Série Completa)":
https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7

👤 Eliézer Rosa | Autor do Paradigma IDD
#IDD #IntentDrivenDevelopment #HistoriaDaComputacao #VannevarBush #Engelbart #AlanKay #Licklider #IvanSutherland #Cibernetica #SimbioseHumanoMaquina #EngenhariaDeSoftware #ComputerScience #EliezerRosa #EliezerJPRosa #MIT #XeroxPARC
""",
        "tags": [
            "IDD", "Intent-Driven Development", "Historia da Computacao", "Vannevar Bush",
            "Douglas Engelbart", "Alan Kay", "Licklider", "Ivan Sutherland", "Cibernetica",
            "Simbiose Humano-Maquina", "Engenharia de Software", "Computer Science",
            "Eliezer Rosa", "EliezerJPRosa", "MIT", "Xerox PARC"
        ]
    }
]

def main():
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    print("=" * 70)
    print("🚀 ATUALIZANDO METADADOS DOS VÍDEOS MESTRES (EP. 01, EP. 02, EP. 03)")
    print("=" * 70)

    for item in MASTERS:
        vid = item["videoId"]
        title = item["newTitle"]
        desc = item["description"]
        tags = item["tags"]
        print(f"\nAtualizando vídeo [{vid}]: {title[:60]}...")
        
        # Buscar video snippet atual para preservar categoryId
        curr = yt.videos().list(part="snippet,status", id=vid).execute().get("items", [])
        if not curr:
            print(f"[!] Vídeo {vid} não encontrado.")
            continue
        
        snippet = curr[0]["snippet"]
        snippet["title"] = title
        snippet["description"] = desc
        snippet["tags"] = tags
        snippet["categoryId"] = "28"
        snippet["defaultLanguage"] = "pt"
        snippet["defaultAudioLanguage"] = "pt"

        upd_body = {
            "id": vid,
            "snippet": snippet
        }
        res = yt.videos().update(part="snippet", body=upd_body).execute()
        print(f"[OK] Atualizado com sucesso: {res['snippet']['title']}")

if __name__ == "__main__":
    main()
