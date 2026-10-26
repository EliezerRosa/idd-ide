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

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

playlist_title = "IDD  Paradigma - Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização"

playlist_description = """🏛️ IDD PARADIGMA — PERSPECTIVA TÉCNICA: AVALIAÇÃO ISENTA & ESTADO DA ARTE
Série Especial de Engenharia de Software 3.0 & Inteligência Artificial Autônoma

Autor: Eliézer Rosa | @eliezerjprosa

Esta playlist reúne as análises mais rigorosas, técnicas e desprovidas de condescendência sobre o ecossistema do Paradigma IDD (Intent-Driven Development), confrontando ferramentas experimentais de agentes de IA (Google Antigravity, Anthropic MCP, Copilot Workspace, Aider) com o rigor de métodos formais e ontologia de software.

🎯 EMENTA DO ESPECIAL DE PERSPECTIVA TÉCNICA:
1. Diagnóstico Isento: O que o IDD já conquistou vs o que falta para adoção em massa da indústria.
2. MCP & Ferramentas Experimentais vs IDD: A diferença entre encanamento de transporte (JSON-RPC) e engenharia de controle ontológico.
3. Pilar 1 — Intent IR Canônica: Superando o "Vibe Coding" e prompts frágeis através de uma AST formal de domínio.
4. Pilar 2 — SMT Solvers & Verificação Formal: A morte do assert_equal com Microsoft Z3, Dafny e padrões AWS Automated Reasoning.
5. Pilar 3 — Engenharia Constitucional: O Git é cego para IA; a Máquina de Diff de Grafo e o padrão Expand and Contract.
6. Pilar 4 — Ação Atômica & Sagas de Domínio: O Protocolo em 4 Fases (Guard, Mutate, Seal, Compensate) blindando transações contra falhas silenciosas.
7. Pilar 5 — O Benchmark Canônico IDD: Avaliação empírica com 1.000 mutações de domínio reais além do SWE-bench.
8. Genealogia Histórica: 79 anos de linhagem humanista, de Vannevar Bush (1945), Wiener e Engelbart até Alan Kay.
9. Estratégia de Descoberta: A ponte entre o debate prático do Vibe Coding e os fóruns científicos da Ciência da Computação.
10. O Futuro da Engenharia: A intenção governa, a IA compila e o ser humano retém o Comando Epistêmico soberano.

#IDD #IntentDrivenDevelopment #SoftwareEngineering #VibeCoding #FormalMethods #SMTSolvers #Z3Solver #Dafny #AWSAutomatedReasoning #ConstitutionalAI #ModelContextProtocol #MCP #Antigravity #DistributedSagas #PatHelland #DomainDrivenDesign #DDD #ComputerScience #ICSE #POPL #PLDI #EliezerRosa #EliezerJPRosa #Software3_0"""

print(f"Criando Playlist: '{playlist_title}'...")

res = yt.playlists().insert(
    part="snippet,status",
    body={
        "snippet": {
            "title": playlist_title,
            "description": playlist_description,
            "defaultLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public"
        }
    }
).execute()

new_pl_id = res.get("id")
print("=" * 80)
print("🎉 SUCESSO! NOVA PLAYLIST CRIADA NO CANAL OFICIAL DO YOUTUBE:")
print(f"ID da Playlist: {new_pl_id}")
print(f"URL Oficial: https://www.youtube.com/playlist?list={new_pl_id}")
print("=" * 80)

# Salvar referência no upload_manifest.json
manifest_file = BASE_DIR / "producao_yt" / "upload_manifest.json"
try:
    with open(manifest_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "playlists_especiais" not in data:
        data["playlists_especiais"] = {}
    data["playlists_especiais"]["perspectiva_tecnica"] = {
        "id": new_pl_id,
        "title": playlist_title,
        "url": f"https://www.youtube.com/playlist?list={new_pl_id}"
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Manifesto upload_manifest.json atualizado com a nova playlist.")
except Exception as e:
    print(f"Aviso ao salvar no manifesto: {e}")
