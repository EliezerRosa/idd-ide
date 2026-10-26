import json
import sys
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

playlist_id = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"

playlist_description = """🏛️ TRATADO FUNDAMENTAL DO PARADIGMA IDD (INTENT-DRIVEN DEVELOPMENT)
Série Completa Oficial: Da Teoria Epistemológica à Engenharia de Software com IA Autônoma

Autor: Eliézer Rosa | @eliezerjprosa

Em um cenário onde a inteligência artificial generativa inundou o mercado com o fenômeno do "Vibe Coding" — aceitar código gerado sem controle formal —, o Paradigma IDD (Intent-Driven Development) emerge como o padrão de engenharia pós-sintaxe (Software Engineering 3.0), unindo ontologia de domínio, IA neuro-simbólica, métodos formais e sagas distribuídas.

📚 EMENTA COMPLETA DOS 10 EPISÓDIOS FUNDAMENTAIS:
• Ep. 01 — O que é o Paradigma IDD? (Ontologia da Intenção vs Caos do Vibe Coding)
• Ep. 02 — Comando Epistêmico vs Operacional (Teoria do Controle Humano-IA e o Caso AF447)
• Ep. 03 — A Genealogia do IDD (De Bush a LLMs: 79 Anos de Linhagem de Engelbart a Alan Kay)
• Ep. 04 — O Paradigma Neuro-Simbólico (Por que LLMs Probabilísticos Sozinhos Falham em Sistemas Críticos)
• Ep. 05 — O Compilador de Intenções & Intent IR (A Superação do Prompt e a AST de Domínio)
• Ep. 06 — Invariantes Formais & SMT Solvers (Raciocínio Automatizado com Microsoft Z3 e Dafny)
• Ep. 07 — Engenharia Constitucional & Diff Semântico (Superando a Cegueira do Git e Padrão Expand & Contract)
• Ep. 08 — A Teoria da Ação Atômica (Sagas de Domínio em 4 Fases e Consistência Transacional)
• Ep. 09 — IDD vs Protocolos MCP & Antigravity (Diferença entre Encanamento de Contexto e Governança de Domínio)
• Ep. 10 — IDD vs Copilot Workspace & Aider (A Superação da Edição Local Patch-and-Pray)

🔬 CONVERGÊNCIA ACADÊMICA & ESTADO DA ARTE:
O IDD dialoga diretamente com as principais fronteiras da ciência da computação contemporânea (ICSE, FSE, ASE, PLDI, POPL):
1. Raciocínio Automatizado & SMT Solvers (AWS Automated Reasoning Group, Z3, Dafny, TLA+)
2. Programação Declarativa & Compiladores de Intenção (Stanford DSPy, Intent IR)
3. Engenharia de Software Constitucional (Anthropic Constitutional AI aplicada à Arquitetura de Domínio)
4. Teoria dos Sistemas Complexos & Cybernetics (Norbert Wiener, Douglas Engelbart, J.C.R. Licklider)

👤 Eliézer Rosa — Criador do Paradigma IDD
Repositório em Produção: github.com/EliezerRosa/rvm-designacoes-antigravity

#IDD #IntentDrivenDevelopment #VibeCoding #SoftwareEngineering #Software3_0 #FormalMethods #SMTSolvers #Z3Solver #Dafny #AutomatedReasoning #AWSAutomatedReasoning #NeuroSymbolicAI #StanfordDSPy #IntentIR #ConstitutionalAI #Anthropic #DomainDrivenDesign #DDD #DistributedSagas #AtomicActions #SchemaEvolution #ExpandAndContract #EliezerRosa #EliezerJPRosa #ComputerScience #ICSE #FSE #ASE #PLDI #POPL"""

print(f"Playlist desc length: {len(playlist_description)} chars")

try:
    update_res = yt.playlists().update(
        part="snippet",
        body={
            "id": playlist_id,
            "snippet": {
                "title": "IDD — Base de Conhecimento (Série Completa)",
                "description": playlist_description,
                "defaultLanguage": "pt"
            }
        }
    ).execute()
    print("✅ SUCESSO! Playlist atualizada com metadados acadêmicos completos e hashtags de ponta!")
except Exception as e:
    print("❌ Erro ao atualizar playlist:", e)
