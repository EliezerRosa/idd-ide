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

channel_id = "UCmXhQsrKa5wlO46etZKDkeA"

# Channel keywords string under 500 characters (canonical YouTube standard limit)
canonical_keywords = (
    'IDD "Intent-Driven Development" "Vibe Coding" "Software Engineering" '
    '"Formal Methods" "Neuro-Symbolic AI" "Automated Reasoning" "SMT Solvers" '
    '"Z3 Solver" "Dafny" "Intent IR" "Constitutional AI" "Domain Invariants" '
    '"Software 3.0" "Post-Syntax" "Eliezer Rosa" "EliezerJPRosa" "DDD" "Distributed Sagas" '
    '"ICSE" "ASE" "PLDI" "POPL" "Computer Science"'
)

print(f"Keywords length: {len(canonical_keywords)} chars")

# Detailed Channel Description (rich in academic terms, SEO and authoritative hashtags)
channel_description = """🎙 Engenharia de Software com IA Autônoma & Paradigma IDD | Eliézer Rosa

Canal oficial do Intent-Driven Development (IDD) — o paradigma epistemológico e arquitetural pós-sintaxe onde a intenção humana governa e a inteligência artificial executa.

🏛️ Pilares Teóricos e Práticos:
• Comando Epistêmico vs Operacional: O ser humano como árbitro epistemológico; a IA como força de compilação determinística (Augmenting, não Automating).
• IA Neuro-Simbólica & Intent IR: Superação do "Vibe Coding" através de Representação Intermediária (IR) e compiladores de domínio.
• Métodos Formais & Raciocínio Automatizado: Invariantes matemáticas provadas via SMT Solvers (Microsoft Z3, Dafny e padrões AWS ARG).
• Engenharia Constitucional: Diff semântico de esquemas (superando a cegueira do Git) e Padrão Expand & Contract.
• Ação Atômica & Sagas Distribuídas: Protocolo em 4 fases e consistência transacional absoluta.

📚 Série Completa: "IDD — Base de Conhecimento" (10 Episódios Fundamentais) disponível na playlist oficial.

#IDD #IntentDrivenDevelopment #VibeCoding #SoftwareEngineering #FormalMethods #NeuroSymbolicAI #SMTSolvers #AutomatedReasoning #Z3Solver #Dafny #ConstitutionalAI #DomainDrivenDesign #Software3_0 #EliezerRosa #EliezerJPRosa #ComputerScience #ICSE #FSE #ASE #PLDI #POPL"""

print(f"Description length: {len(channel_description)} chars")

try:
    update_res = yt.channels().update(
        part="brandingSettings",
        body={
            "id": channel_id,
            "brandingSettings": {
                "channel": {
                    "description": channel_description,
                    "keywords": canonical_keywords,
                    "defaultLanguage": "pt"
                }
            }
        }
    ).execute()
    
    saved_ch = update_res.get("brandingSettings", {}).get("channel", {})
    print("✅ SUCESSO! Branding do canal atualizado com perfeição:")
    print("Keywords salvas:", saved_ch.get("keywords"))
    print("Descrição salva (início):", saved_ch.get("description")[:160], "...")
except Exception as e:
    print("❌ Erro ao atualizar branding:", e)
