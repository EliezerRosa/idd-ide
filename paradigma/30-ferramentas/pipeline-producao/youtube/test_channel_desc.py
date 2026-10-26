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

desc = (
    "🎙 Engenharia de Software com IA Autônoma & Paradigma IDD | Eliézer Rosa\n\n"
    "Canal oficial do Intent-Driven Development (IDD) — o paradigma de engenharia de software pós-sintaxe onde a intenção humana governa e a IA compila de forma determinística.\n\n"
    "🏛️ Pilares Fundamentais:\n"
    "• Comando Epistêmico vs Operacional: Augmenting, não automating\n"
    "• IA Neuro-Simbólica & Intent IR: Superando a crise do Vibe Coding\n"
    "• Métodos Formais & SMT Solvers: Invariantes com Z3, Dafny e padrões AWS ARG\n"
    "• Engenharia Constitucional: Diff semântico e padrão Expand & Contract\n"
    "• Sagas & Ação Atômica: Protocolo em 4 fases\n\n"
    "📺 Série Completa: Base de Conhecimento IDD (10 Episódios)\n\n"
    "#IDD #IntentDrivenDevelopment #VibeCoding #SoftwareEngineering #FormalMethods #NeuroSymbolicAI #SMTSolvers #AutomatedReasoning #Software3_0 #EliezerRosa"
)

print(f"Desc length: {len(desc)} chars")

try:
    update_res = yt.channels().update(
        part="brandingSettings",
        body={
            "id": channel_id,
            "brandingSettings": {
                "channel": {
                    "description": desc
                }
            }
        }
    ).execute()
    print("✅ SUCESSO! Descrição do canal atualizada!")
except Exception as e:
    print("❌ Erro ao atualizar descrição:", e)
