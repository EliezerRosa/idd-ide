"""Atualiza as palavras-chave (Channel Keywords) do canal no YouTube com as perspectivas
acadêmicas e contemporâneas em torno da problemática do software com IA.
"""

import json
import sys
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")

# Palavras-chave meticulosamente selecionadas cobrindo:
# 1. Paradigma IDD e Engenharia pós-sintaxe
# 2. IA Neuro-Simbólica e Compiladores Declarativos (Stanford DSPy, Intent IR)
# 3. Métodos Formais e Raciocínio Automatizado (Z3, Dafny, AWS, DeepMind)
# 4. A Crise do Vibe Coding vs Engenharia Confiável
# 5. Arquitetura de Software Resiliente (DDD, Sagas, Invariantes, Schema Evolution)
# 6. Conferências e Comunidade Científica (ICSE, FSE, ASE, PLDI, POPL)
CHANNEL_KEYWORDS_LIST = [
    # Paradigma & Fundador
    "IDD",
    '"Intent-Driven Development"',
    '"Desenvolvimento Orientado a Intenção"',
    '"Eliézer Rosa"',
    '"Eliezer JP Rosa"',
    '"Software Engineering 3.0"',
    '"Post-Syntax Programming"',
    '"Ontologia de Software"',

    # Problemática Contemporânea (A Crise da IA sem Fundações)
    '"Vibe Coding"',
    '"Crise do Software"',
    '"Alucinação de IA"',
    '"Dívida Técnica com IA"',
    '"IA Confiável"',
    '"Reliable AI"',

    # IA Neuro-Simbólica & Compiladores
    '"Neuro-Symbolic AI"',
    '"IA Neuro-Simbólica"',
    '"Stanford DSPy"',
    '"Intent IR"',
    '"Compilador de Intenções"',
    '"Program Synthesis"',
    '"Constitutional AI"',
    '"Google DeepMind"',
    '"Anthropic"',

    # Métodos Formais & Raciocínio Automatizado
    '"Formal Methods"',
    '"Métodos Formais"',
    '"Automated Reasoning"',
    '"Raciocínio Automatizado"',
    '"SMT Solvers"',
    '"Z3 Solver"',
    '"Microsoft Z3"',
    '"Dafny"',
    '"AWS Automated Reasoning"',
    '"Domain Invariants"',
    '"Verificação Formal"',
    '"TLA+"',

    # Arquitetura & Sistemas Concorrentes
    '"Domain-Driven Design"',
    '"DDD"',
    '"Event Sourcing"',
    '"CQRS"',
    '"Distributed Sagas"',
    '"Pat Helland"',
    '"Atomic Actions"',
    '"Schema Evolution"',
    '"Expand and Contract"',
    '"Idempotência"',

    # Ciência da Computação & Conferências
    '"Computer Science"',
    '"Ciência da Computação"',
    '"Engenharia de Software"',
    '"ICSE"',
    '"FSE"',
    '"ASE"',
    '"PLDI"',
    '"POPL"'
]

def get_yt_service():
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    creds = Credentials.from_authorized_user_info(data)
    return build('youtube', 'v3', credentials=creds)

def update_keywords():
    yt = get_yt_service()

    # 1. Obter canal atual
    res = yt.channels().list(
        part="brandingSettings",
        mine=True
    ).execute()

    items = res.get("items", [])
    if not items:
        print("❌ Canal não encontrado!")
        return

    channel = items[0]
    channel_id = channel["id"]
    branding = channel.get("brandingSettings", {})
    channel_data = branding.get("channel", {})

    keywords_str = " ".join(CHANNEL_KEYWORDS_LIST)
    channel_data["keywords"] = keywords_str
    branding["channel"] = channel_data

    print("=" * 80)
    print("🚀 ATUALIZANDO PALAVRAS-CHAVE DO CANAL DO YOUTUBE...")
    print(f"Canal ID: {channel_id}")
    print(f"Total de Tags/Keywords estruturadas: {len(CHANNEL_KEYWORDS_LIST)}")
    print(f"Payload de Keywords ({len(keywords_str)} caracteres):\n{keywords_str}")
    print("=" * 80)

    try:
        update_res = yt.channels().update(
            part="brandingSettings",
            body={
                "id": channel_id,
                "brandingSettings": branding
            }
        ).execute()

        new_keywords = update_res.get("brandingSettings", {}).get("channel", {}).get("keywords")
        print("\n🎉 SUCESSO ABSOLUTO! PALAVRAS-CHAVE DO CANAL ATUALIZADAS NO YOUTUBE!")
        print(f"Keywords confirmadas na API: {new_keywords[:200]}...")
    except Exception as e:
        print(f"⚠️ Erro ao atualizar brandingSettings via API: {e}")
        print("Algumas contas exigem permissão direta no YouTube Studio ou escopo avançado de parceiro.")
        print("Caso ocorra limitação de permissão de canal na API, as tags serão injetadas nas descrições e metadados de vídeo!")

if __name__ == "__main__":
    update_keywords()
