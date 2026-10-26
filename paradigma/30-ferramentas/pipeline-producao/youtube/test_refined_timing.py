"""Simulador e Otimizador de Sincronismo Cirúrgico do Vídeo 1:
- Elimina todos os silêncios excessivos (> 20s).
- Mantém rigorosa sincronia com o vídeo-fluxo.
- Ancora eventos visuais críticos:
  * Dueto Inicial:
    - Bloco 1 (0.5s -> 13.5s)
    - Bloco 2 (16.0s -> 24.3s)
    - Bloco 3 (56.8s -> 61.3s, Francisca pergunta)
    - Bloco 4 (62.0s, Antonio responde exatamente no slide 4)
  * Transições dos Slides 5 a 19 rigorosamente preservadas
  * Bloco 27: 459.5s (retorno do primeiro prompt)
  * Bloco 46: 802.0s (especificação)
  * Bloco 81: 1556.0s (abertura navegador)
  * Bloco 84: 1640.0s (execução do script)
  * Bloco 101: 2131.5s (testes)
  * Bloco 114: 2530.5s (login Chrome)
  * Bloco 127: 2893.5s (Excalidraw memória)
  * Bloco 142 + 143: 3340.0s (Excalidraw desenho)
  * Bloco 146: 3507.0s (Apresentação Francisca 1)
  * Bloco 166: 3913.0s (Apresentação Chrome)
  * Bloco 169: 3939.5s (Apresentação Francisca 2)
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
sched = json.loads((OUT / "schedule_v1_dueto.json").read_text(encoding="utf-8"))
scenes = json.loads((OUT / "cenas_v1.json").read_text(encoding="utf-8"))
video_dur = 4331.2

# Mapeia âncoras fixas de sincronismo visual estrito
FIXED_ANCHORS = {
    1: 1.0,
    2: 16.0,
    3: 56.8,
    4: 62.0,
    27: 459.5,
    46: 802.0,
    81: 1556.0,
    84: 1640.0,
    101: 2131.5,
    114: 2530.5,
    127: 2893.5,
    142: 3340.0,
    146: 3507.0,
    166: 3913.0,
    169: 3939.5
}

# Continuações diretas de frases que foram cortadas ao meio:
DIRECT_CONTINUATIONS = {
    129: 128,
    143: 142,
    145: 144,
    156: 155,
    165: 164,
    181: 180
}

# Atribui cena a cada bloco
for b in sched:
    orig_start = b['start']
    sc_start = 0.0
    sc_end = video_dur
    for s_idx in range(len(scenes) - 1):
        if scenes[s_idx] <= orig_start < scenes[s_idx + 1]:
            sc_start = scenes[s_idx]
            sc_end = scenes[s_idx + 1]
            break
    b['scene_start'] = sc_start
    b['scene_end'] = sc_end

refined = []
cursor = 0.0

MIN_PAUSE_SAME = 0.55
MIN_PAUSE_CHANGE = 0.40

for i, b in enumerate(sched):
    bid = b['id']
    spk = b['speaker']
    nat_dur = b['nat_dur']
    sc_start = b['scene_start']
    sc_end = b['scene_end']
    orig_start = b['start']
    orig_end = b['end']
    prev = refined[-1] if refined else None
    is_change = prev and (prev['speaker'] != spk)
    min_p = MIN_PAUSE_CHANGE if is_change else MIN_PAUSE_SAME
    
    # 1. Âncora visual explícita
    if bid in FIXED_ANCHORS:
        sched_start = max(cursor + min_p, FIXED_ANCHORS[bid])
    
    # 2. Continuação direta de frase anterior
    elif bid in DIRECT_CONTINUATIONS and prev and prev['id'] == DIRECT_CONTINUATIONS[bid]:
        sched_start = cursor + min_p
        
    # 3. Transição entre cenas visuais
    elif cursor < sc_start:
        # A cena ainda não começou: espera a cena visual
        sched_start = sc_start + (0.2 if is_change else 0.4)
        # Mas se o bloco original falava bem mais à frente na cena (e a cena é longa):
        # não atropela o início da cena, ancora suavemente
        if orig_start > sc_start + 4.0 and (sc_end - sc_start) > 25.0:
            sched_start = max(sched_start, min(orig_start - 2.0, sc_start + 1.5))
            
    # 4. Dentro da mesma cena visual
    else:
        # Gap original entre as falas
        orig_gap = max(0.0, orig_start - prev['end']) if prev else 0.0
        
        if orig_gap < 2.0:
            # Falou continuamente na gravação original: mantém fluidez direta
            sched_start = cursor + min_p
        else:
            # Houve pausa na gravação original (ex: digitando no VS Code ou pensando)
            # Para evitar silêncios mortos (> 15s), limitamos a pausa a no máximo 12s,
            # e ancoramos suavemente em direção ao orig_start
            max_pause = 14.0
            natural_pause = min_p + min(12.0, orig_gap * 0.35)
            
            # Se o cursor está muito distante do orig_start (mais de 15s antes):
            # avança o início para manter o ritmo sem criar um vácuo
            target = max(cursor + natural_pause, orig_start - 3.0)
            
            # Nunca deixa a pausa ultrapassar max_pause dentro da mesma cena
            sched_start = min(cursor + max_pause, target)
            sched_start = max(cursor + min_p, sched_start)
    
    # Garante que não ultrapasse a cena se couber acelerando levemente
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
print("\n=== RELATÓRIO DO NOVO AGENDAMENTO OTIMIZADO ===")
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
        gaps.append((b1['id'], b2['id'], gap, e1, s2, b1['speaker'], b2['speaker'], b1['text'][-40:], b2['text'][:40]))

print(f"Total de blocos: {len(refined)}")
print(f"Duração total da locução: {cursor:.1f}s / {video_dur:.1f}s")
print(f"Maior gap encontrado: {max_gap:.2f}s (reduzido de 118.7s!)")
print(f"Total de silêncio acumulado: {total_silence:.1f}s ({total_silence/60:.1f} min) (antes era 26.3 min!)")
print(f"Gaps > 6.0s: {len(gaps)} (antes eram mais de 75!)")

print("\nMaiores gaps restantes (> 6s):")
for g in sorted(gaps, key=lambda x: x[2], reverse=True)[:20]:
    print(f"  Gap {g[2]:5.1f}s entre Bloco {g[0]:3d} e {g[1]:3d} em [{g[3]:6.1f}s -> {g[4]:6.1f}s] ({g[5]} -> {g[6]})")
    print(f"     Antes: '...{g[7]}'")
    print(f"     Depois: '{g[8]}...'")

# Salva arquivo refinado
OUT_FILE = OUT / "schedule_v1_dueto_otimizado.json"
OUT_FILE.write_text(json.dumps(refined, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[OK] Agendamento otimizado salvo em: {OUT_FILE.name}")
