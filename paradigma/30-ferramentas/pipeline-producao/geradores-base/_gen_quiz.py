"""
Gera as perguntas do quiz IDD (Ep1 + Ep2) via Gemini 2.5 Pro
e salva em idd_quiz_questions.json
"""
import json, os, sys
from pathlib import Path

# Carrega .env manualmente
env_file = Path(r'C:\Antigravity - RVM Designações') / '.env'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

from google import genai

API_KEY = os.environ.get('GEMINI_API_KEY')
client = genai.Client(api_key=API_KEY)

BASE = Path(r'C:\Antigravity - RVM Designações')

def load_script(ep):
    with open(BASE / f'idd_p{ep}_output' / 'script.json', encoding='utf-8') as f:
        s = json.load(f)
    return ' '.join(e['pt'] for e in s)

ep1 = load_script(1)
ep2 = load_script(2)

prompt = f"""Você é um especialista em IDD (Intent-Driven Development) criado por Eliezer Rosa.

Abaixo estão as transcrições completas dos 2 primeiros episódios da série "Base de Conhecimento IDD".

## Episódio 1 — O que é IDD?
{ep1}

## Episódio 2 — Comando Epistêmico vs. Operacional
{ep2}

---

Gere EXATAMENTE 10 perguntas de múltipla escolha sobre o conteúdo DESSES dois episódios.

Regras:
- 5 perguntas do Ep1, 5 do Ep2
- Cada pergunta tem 4 alternativas (A, B, C, D)
- Apenas 1 alternativa correta por pergunta
- Nível: intermediário/avançado — sem perguntas triviais
- Tom: sério mas acessível
- Após cada resposta correta, inclua uma explicação curta (2-3 frases) que o "avatar" vai falar em voz alta
- Após cada resposta errada, inclua uma dica gentil que motiva o usuário a refletir (não entrega a resposta)

Retorne APENAS um JSON válido, sem markdown, sem comentários, no seguinte formato:
{{
  "questions": [
    {{
      "id": 1,
      "episode": 1,
      "question": "Pergunta aqui?",
      "options": {{
        "A": "Opção A",
        "B": "Opção B",
        "C": "Opção C",
        "D": "Opção D"
      }},
      "correct": "B",
      "explanation_correct": "Texto que o avatar fala quando acerta (2-3 frases).",
      "hint_wrong": "Texto gentil do avatar quando erra (não entrega a resposta)."
    }}
  ]
}}
"""

print("Chamando Gemini 2.5 Pro...", flush=True)
response = client.models.generate_content(
    model='gemini-3.1-pro-preview',
    contents=prompt,
)

raw = response.text.strip()
# Limpa possível ```json ... ``` wrapping
if raw.startswith('```'):
    raw = raw.split('\n', 1)[1]
    raw = raw.rsplit('```', 1)[0]

data = json.loads(raw)
out = BASE / 'idd_quiz_questions.json'
with open(out, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ {len(data['questions'])} perguntas salvas em {out}")
for q in data['questions']:
    print(f"  [{q['id']}] Ep{q['episode']} — {q['question'][:70]}")
