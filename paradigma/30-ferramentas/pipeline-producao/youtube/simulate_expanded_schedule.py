"""Simulação do Cronograma com os Blocos Expandidos (228 unidades):
Testa a distribuição e mede todos os gaps de silêncio remanescentes.
"""

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
OUT = BASE / "v1_dueto_neural"
blocks = json.loads((OUT / "expanded_blocks_v1.json").read_text(encoding="utf-8"))
scenes = json.loads((OUT / "cenas_v1.json").read_text(encoding="utf-8"))
video_dur = 4331.2

print(f"Total de unidades de fala: {len(blocks)}")

# Mapeia âncoras visuais explícitas
FIXED_ANCHORS = {
    "1": 1.0,
    "2": 16.0,
    "3": 56.8,
    "4": 62.0,
    "27": 459.5,
    "46": 802.0,
    "81": 1556.0,
    "84": 1640.0,
    "101": 2131.5,
    "114": 2530.5,
    "127": 2893.5,
    "142": 3340.0,
    "146": 3507.0,
    "166": 3913.0,
    "169": 3939.5
}

# Continuações diretas de blocos
DIRECT_CONTINUATIONS = {
    "129": "128.3",
    "143.1": "142",
    "145": "144",
    "156": "155",
    "165": "164",
    "181": "180"
}

# Atribui cena a cada unidade
for b in blocks:
    o_s = b['start']
    sc_start = 0.0
    sc_end = video_dur
    for s_idx in range(len(scenes) - 1):
        if scenes[s_idx] <= o_s < scenes[s_idx + 1]:
            sc_start = scenes[s_idx]
            sc_end = scenes[s_idx + 1]
            break
    b['scene_start'] = sc_start
    b['scene_end'] = sc_end

refined = []
cursor = 0.0

MIN_PAUSE_SAME = 0.50
MIN_PAUSE_CHANGE = 0.35

for i, b in enumerate(blocks):
    sub_id = b['sub_id']
    spk = b['speaker']
    nat_dur = b['nat_dur']
    sc_start = b['scene_start']
    sc_end = b['scene_end']
    orig_start = b['start']
    orig_end = b['end']
    prev = refined[-1] if refined else None
    is_change = prev and (prev['speaker'] != spk)
    min_p = MIN_PAUSE_CHANGE if is_change else MIN_PAUSE_SAME

    # Âncora visual estrita para os primeiros blocos do dueto e pontos-chave
    if sub_id == "1":
        sched_start = 1.0
    elif sub_id == "2":
        sched_start = 16.0
    elif sub_id == "3":
        # Francisca introduz a frase logo antes do slide aos 62.0s
        sched_start = 56.8
    elif sub_id == "4":
        # Antonio responde exatamente aos 62.0s
        sched_start = 62.0
    elif sub_id == "137.3":
        # Fala enquanto a apresentação HTML está sendo construída na tela
        sched_start = max(cursor + min_p, 3180.0)
    elif sub_id == "142":
        # Fala exatamente quando o desenho com cores aparece no Excalidraw
        sched_start = max(cursor + min_p, 3395.0)
    elif sub_id in DIRECT_CONTINUATIONS and prev and prev['sub_id'] == DIRECT_CONTINUATIONS[sub_id]:
        # Continuação direta da frase: pausa respiratória mínima
        sched_start = cursor + min_p

    else:
        # Padrão de ouro: respeita o momento original em que o desenvolvedor falou
        # garantindo que nunca sobreponha o anterior (cursor + min_p)
        # e antecipando no máximo 0.8s para fluidez
        min_allowed = cursor + min_p
        sched_start = max(min_allowed, orig_start - 0.8)


    # Ajuste de velocidade se ultrapassar o final da cena
    window = max(0.6, sc_end - sched_start)
    speed = 1.0
    if nat_dur > window:
        speed = min(1.28, nat_dur / window)
        
    dur = nat_dur / speed
    
    item = dict(b)
    item.update(
        sched_start=round(sched_start, 3),
        dur=round(dur, 3),
        speed=round(speed, 3)
    )
    refined.append(item)
    cursor = sched_start + dur

# Relatório de análise do novo agendamento
print("\n=== RELATÓRIO DO NOVO AGENDAMENTO COM AUTO-SPLIT ===")
gaps = []
max_gap = 0.0
total_silence = 0.0

for i in range(len(refined) - 1):
    b1 = refined[i]
    b2 = refined[i+1]
    e1 = b1['sched_start'] + b1['dur']
    s2 = b2['sched_start']
    gap = s2 - e1
    if gap > max_gap:
        max_gap = gap
    total_silence += max(0.0, gap)
    if gap > 6.0:
        gaps.append((b1['sub_id'], b2['sub_id'], gap, e1, s2, b1['speaker'], b2['speaker'], b1['text'][-35:], b2['text'][:35]))

print(f"Total de unidades: {len(refined)}")
print(f"Duração total da locução: {cursor:.1f}s / {video_dur:.1f}s")
print(f"Maior gap de silêncio: {max_gap:.2f}s (reduzido de 118.7s!)")
print(f"Total de silêncio acumulado: {total_silence:.1f}s ({total_silence/60:.1f} min)")
print(f"Gaps > 6.0s: {len(gaps)}")

print("\nMaiores gaps restantes (> 6s):")
for g in sorted(gaps, key=lambda x: x[2], reverse=True)[:20]:
    print(f"  Gap {g[2]:5.1f}s entre Bloco {g[0]:5s} e {g[1]:5s} em [{g[3]:6.1f}s -> {g[4]:6.1f}s] ({g[5]} -> {g[6]})")
    print(f"     Antes: '...{g[7]}'")
    print(f"     Depois: '{g[8]}...'")

# Salva arquivo final de agendamento
SCHEDULE_FINAL = OUT / "schedule_v1_dueto_final.json"
SCHEDULE_FINAL.write_text(json.dumps(refined, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[OK] Agendamento final salvo em: {SCHEDULE_FINAL.name}")
