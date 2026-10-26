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
video_dur = 4331.2

print(f"Total blocks: {len(sched)}")
print(f"Total scenes: {len(scenes)}")

# Vamos agrupar os blocos por cena visual
# Cada bloco pertence à cena onde seu orig_start ocorre
scene_blocks = [[] for _ in range(len(scenes) - 1)]

for b in sched:
    o_s = b['start']
    # Encontra a cena
    idx = 0
    for s_idx in range(len(scenes) - 1):
        if scenes[s_idx] <= o_s < scenes[s_idx + 1]:
            idx = s_idx
            break
    scene_blocks[idx].append(b)

new_sched = []
cursor = 0.0

MAX_ALLOWED_GAP = 4.0  # Nenhum silêncio entre blocos no mesmo contexto deve passar de 4s!
MIN_PAUSE_SAME = 0.60
MIN_PAUSE_CHANGE = 0.40

for s_idx in range(len(scenes) - 1):
    sc_start = scenes[s_idx]
    sc_end = scenes[s_idx + 1]
    sc_dur = sc_end - sc_start
    blks = scene_blocks[s_idx]
    
    if not blks:
        continue

    # Cursor não pode começar antes da cena visual
    cursor = max(cursor, sc_start)

    for i, b in enumerate(blks):
        prev_b = blks[i-1] if i > 0 else (new_sched[-1] if new_sched else None)
        is_change = prev_b and (prev_b['speaker'] != b['speaker'])
        min_p = MIN_PAUSE_CHANGE if is_change else MIN_PAUSE_SAME
        
        # Qual era o gap original no áudio do locutor?
        if prev_b:
            orig_gap = max(0.0, b['start'] - prev_b['end'])
        else:
            orig_gap = max(0.0, b['start'] - sc_start)

        # Regra de ouro de sincronismo do vídeo-fluxo:
        # Se na gravação original o locutor falou continuamente (orig_gap < 1.5s):
        # mantemos a continuidade do pensamento com pausa natural (0.6s)
        # Se houve hesitação ou pausa real (orig_gap >= 1.5s):
        # respeitamos parte da pausa, mas limitamos a MAX_ALLOWED_GAP (ex: max 3.5s)
        # E se a cena é longa e tem espaço livre, ancoramos suavemente ao momento do vídeo
        if prev_b and prev_b['id'] == b['id'] - 1 and (cursor >= sc_start):
            if orig_gap < 1.5:
                # Continuação imediata da frase/pensamento
                target_start = cursor + min_p
            else:
                # Houve pausa real na fala original (digitação, espera)
                # Escala suave da pausa original, nunca passando de 4s
                scaled_pause = min_p + min(3.5, orig_gap * 0.4)
                target_start = cursor + scaled_pause
                # Mas também não deixa disparar muito à frente do vídeo original
                # se o cursor estiver muito adiantado
                if target_start < b['start'] - 1.5 and sc_dur > 30.0:
                    # Em cenas longas, interpola suavemente para acompanhar a ação da tela
                    target_start = min(b['start'], max(target_start, cursor + scaled_pause))
        else:
            # Primeiro bloco da cena: começa logo após a transição visual
            target_start = max(sc_start + 0.3, cursor + min_p)
            if b['start'] > sc_start + 2.0 and sc_dur > 20.0:
                # Se na cena o bloco falava mais para frente, não atropela o início da tela
                target_start = max(target_start, min(b['start'], sc_start + 1.5))

        # Garante limites estritos da cena
        # Se passar do fim da cena, ajusta velocidade
        remaining_in_scene = max(0.5, sc_end - target_start)
        nat_dur = b['nat_dur']
        speed = 1.0
        if nat_dur > remaining_in_scene:
            speed = min(1.28, nat_dur / remaining_in_scene)
        
        dur = nat_dur / speed
        end_time = target_start + dur
        
        item = {
            'id': b['id'],
            'speaker': b['speaker'],
            'voice': b['voice'],
            'text': b['text'],
            'tts': b['tts'],
            'mp3': b['mp3'],
            'nat_dur': nat_dur,
            'start': b['start'],
            'end': b['end'],
            'sched_start': round(target_start, 3),
            'dur': round(dur, 3),
            'speed': round(speed, 3),
            'scene': [sc_start, sc_end]
        }
        new_sched.append(item)
        cursor = end_time

# Análise do novo agendamento
print("\n--- RESULTADO DA SIMULAÇÃO ---")
gaps_over_5s = []
max_gap = 0.0
total_silence = 0.0

for i in range(len(new_sched) - 1):
    b1 = new_sched[i]
    b2 = new_sched[i+1]
    e1 = b1['sched_start'] + b1['dur']
    s2 = b2['sched_start']
    gap = s2 - e1
    if gap > max_gap:
        max_gap = gap
    total_silence += max(0.0, gap)
    if gap > 5.0:
        gaps_over_5s.append((b1['id'], b2['id'], gap, e1, s2, b1['scene'], b2['scene']))

print(f"Duração total do áudio: {cursor:.1f}s / {video_dur:.1f}s")
print(f"Maior gap de silêncio encontrado: {max_gap:.2f}s")
print(f"Total de silêncio acumulado: {total_silence:.1f}s ({total_silence/60:.1f} min) (antes era 26.3 min!)")
print(f"Gaps > 5.0s: {len(gaps_over_5s)} (antes eram 92!)")
for g in gaps_over_5s:
    print(f"  Gap {g[2]:.1f}s entre Bloco {g[0]} e {g[1]} em [{g[3]:.1f}s -> {g[4]:.1f}s] | Cenas: {g[5]} -> {g[6]}")
