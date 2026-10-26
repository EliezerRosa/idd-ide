import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
sched = json.loads((BASE / "v1_dueto_neural" / "schedule_v1_dueto.json").read_text(encoding="utf-8"))
scenes = json.loads((BASE / "v1_dueto_neural" / "cenas_v1.json").read_text(encoding="utf-8"))

print(f"Total blocks: {len(sched)}")

# Vamos analisar bloco a bloco
# Para cada bloco b:
# 1. Ele tem um orig_start e orig_end
# 2. Ele tem uma cena de início e cena de fim
# 3. Ele tem nat_dur
# 4. Qual é a janela visual ideal?

# Cenários específicos chave:
# Bloco 3 (Francisca pergunta sobre a frase): Deve terminar exatamente antes do slide da frase (62.0s)
# Bloco 20 (Início da governança no VS Code): 222.5s
# Bloco 27 (Olha o que ele fez): 459.5s (quando a IA gera a resposta)
# Bloco 46 (Apresentação dos invariantes): 802.0s
# Bloco 81 (Abertura do navegador): 1556.0s
# Bloco 84 (Execução do script): 1640.0s
# Bloco 101 (Testes): 2131.5s
# Bloco 114 (Login no navegador): 2530.5s
# Bloco 127 (Excalidraw): 2893.5s
# Bloco 146 (Francisca diagrama operacional 1): 3507.0s
# Bloco 166 (Apresentação Chrome): 3913.0s
# Bloco 169 (Francisca diagrama operacional 2): 3939.5s

# Vamos inspecionar os blocos entre 3200s e 3450s onde houve o gap de 118s (2 minutos)
print("\n--- BLOCOS ENTRE 3200s e 3500s ---")
for b in sched:
    if 3200 <= b['start'] <= 3500:
        print(f"Bloco {b['id']:3d}: orig [{b['start']:6.1f}s -> {b['end']:6.1f}s] sched [{b['sched_start']:6.1f}s -> {b['sched_start']+b['dur']:6.1f}s] dur {b['dur']:4.1f}s | {b['text'][:60]}")
