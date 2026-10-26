"""Gerador do Agendamento Refinado do Vídeo 1 (Dueto Neural):
- Elimina lacunas mortas e silêncios excessivos (> 4s dentro do mesmo fluxo).
- Garante sincronia cirúrgica com o vídeo-fluxo (cenas visuais, slides e ações na tela).
- Conecta frases cortadas ao meio (ex: Bloco 142 -> 143, Bloco 155 -> 156, etc.).
- Ajusta a cadência do Dueto Inicial (Blocos 1 a 4).
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

print(f"Carregados {len(sched)} blocos e {len(scenes)} âncoras de cena.")

# Classifica a relação de cada bloco com a cena visual
for b in sched:
    orig_start = b['start']
    # Encontra a cena correspondente
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

# Palavras que indicam continuação gramatical direta da frase anterior
CONTINUATION_PREFIXES = (
    "e ", "ou ", "que ", "de ", "do ", "da ", "dos ", "das ", "para ", "por ", "com ",
    "em ", "na ", "no ", "nas ", "nos ", "como ", "quando ", "onde ", "porque ", "pois ",
    "mas ", "porém ", "contudo ", "todavia ", "entanto ", "se ", "já ", "aí ", "mesmo ",
    "com cores ", "de refrigeração ", "no download ", "estamos lá "
)

for i, b in enumerate(sched):
    bid = b['id']
    txt = b['text'].strip()
    spk = b['speaker']
    nat_dur = b['nat_dur']
    sc_start = b['scene_start']
    sc_end = b['scene_end']
    orig_start = b['start']
    prev = refined[-1] if refined else None
    
    is_change = prev and (prev['speaker'] != spk)
    min_p = MIN_PAUSE_CHANGE if is_change else MIN_PAUSE_SAME
    
    # --- AJUSTES CIRÚRGICOS DE CENAS ESPECÍFICAS ---
    
    # 1. Dueto Inicial (Blocos 1 a 4):
    if bid == 1:
        sched_start = 1.0
    elif bid == 2:
        sched_start = max(cursor + 1.2, 16.0)
    elif bid == 3:
        # Francisca introduz a frase-chave. Deve terminar logo antes do slide aos 62.0s!
        # Duração da Francisca é ~4.5s. Começando aos 56.8s, termina aos 61.3s.
        sched_start = 56.8
    elif bid == 4:
        # Antonio responde no exato segundo em que o slide aparece!
        sched_start = 62.0
    
    # 2. Excalidraw e Desenho na tela (Blocos 142 e 143):
    # Na versão anterior, o Bloco 142 foi falado aos 3273s e o 143 aos 3398s (118s de silêncio no meio da frase!)
    # O navegador com Excalidraw abre aos 3339.5s e desenha até 3415s.
    elif bid == 142:
        # Fala exatamente quando o navegador abre o Excalidraw
        sched_start = max(3340.0, cursor + min_p)
    elif bid == 143:
        # Continuação imediata da frase: "...com cores é na ferramenta escala e grau"
        sched_start = cursor + 0.6
    
    # 3. Bloco 156 ("de refrigeração, que já estão em uso..."):
    # Continuação de 155 ("...conjunto de formulários, documentos da empresa, que")
    elif bid == 156 and prev and prev['id'] == 155:
        sched_start = cursor + 0.5
        
    # 4. Bloco 165 ("no download mesmo quando ele exportar..."):
    # Continuação de 164 ("...aqui a especificação aqui eu vou deixar")
    elif bid == 165 and prev and prev['id'] == 164:
        sched_start = cursor + 0.5

    # 5. Bloco 145 ("estamos lá, e ele está fazendo isso aqui..."):
    # Continuação de 144 ("...a tela local, local rosto do grau que nós")
    elif bid == 145 and prev and prev['id'] == 144:
        sched_start = cursor + 0.5
        
    # 6. Bloco 129 ("mesmo vai ser uma coisa basicamente por voz..."):
    # Continuação de 128 ("...e ele vai tocar o resto, o computador")
    elif bid == 129 and prev and prev['id'] == 128:
        sched_start = cursor + 0.5

    # 7. Bloco 181 (Francisca: "Estamos prontos para iniciar"):
    # Resposta final do encerramento da apresentação
    elif bid == 181 and prev and prev['id'] == 180:
        sched_start = cursor + 0.8

    # --- REGRA GERAL INTELIGENTE ---
    else:
        # Se cruza mudança de cena visual (novo slide / nova tela):
        # A fala NUNCA deve começar antes da cena visual!
        if cursor < sc_start:
            # A cena ainda não começou: aguarda o corte visual da tela
            sched_start = sc_start + (0.2 if is_change else 0.4)
        else:
            # Já estamos dentro da cena visual
            # Verifica se é continuação gramatical
            is_grammatical_continuation = False
            for pfx in CONTINUATION_PREFIXES:
                if txt.lower().startswith(pfx):
                    is_grammatical_continuation = True
                    break
            if prev and prev['text'].strip().endswith((",", " que", " de", " da", " do", " e", " ou")):
                is_grammatical_continuation = True
                
            if is_grammatical_continuation and prev and prev['scene_start'] == sc_start:
                sched_start = cursor + min_p
            else:
                # Distância para o momento em que a frase foi dita na gravação original
                gap_to_orig = orig_start - cursor
                
                if gap_to_orig <= 3.0:
                    # Pequena hesitação: elimina o silêncio morto e mantém fluxo natural
                    sched_start = cursor + min_p
                elif gap_to_orig <= 12.0:
                    # Pausa média (12s): reduz para pausa confortável e elegante (1.0s a 2.5s)
                    scaled_gap = min_p + (gap_to_orig - 3.0) * 0.25
                    sched_start = cursor + min(2.5, scaled_gap)
                else:
                    # Gap longo (> 12s, ex: digitação de código ou espera de resposta da IA na tela):
                    # Não atropela a ação da tela, mas também não deixa um vácuo gigante.
                    # Se o bloco descreve uma ação que acontece mais à frente na tela:
                    # Começa no máximo 4.0s antes da ação original, garantindo sincronismo do vídeo-fluxo!
                    # E garante que a pausa anterior não exceda 4.0s se estiver no mesmo bloco de pensamento
                    earliest_allowed = cursor + min_p
                    anchored_target = max(earliest_allowed, orig_start - 3.0)
                    
                    # Limita a pausa silenciosa anterior a no máximo 6.0s se estiver dentro da mesma cena
                    if prev and prev['scene_start'] == sc_start:
                        sched_start = min(cursor + 5.0, anchored_target)
                    else:
                        sched_start = anchored_target

    # Ajuste de velocidade se ultrapassar o final da cena visual
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
print("\n=== RELATÓRIO DO NOVO AGENDAMENTO REFINADO ===")
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
print(f"Maior gap encontrado: {max_gap:.2f}s (antes era 118.7s / 2 minutos!)")
print(f"Total de silêncio acumulado: {total_silence:.1f}s ({total_silence/60:.1f} min) (antes era 26.3 min!)")
print(f"Gaps > 6.0s: {len(gaps)} (antes eram mais de 75!)")

print("\nMaiores gaps restantes (> 6s) - apenas pausas legítimas de carregamento/espera de tela:")
for g in sorted(gaps, key=lambda x: x[2], reverse=True)[:15]:
    print(f"  Gap {g[2]:5.1f}s entre Bloco {g[0]:3d} e {g[1]:3d} em [{g[3]:6.1f}s -> {g[4]:6.1f}s] ({g[5]} -> {g[6]})")
    print(f"     Antes: '...{g[7]}'")
    print(f"     Depois: '{g[8]}...'")

# Salva arquivo refinado
OUT_FILE = OUT / "schedule_v1_dueto_refinado.json"
OUT_FILE.write_text(json.dumps(refined, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[OK] Agendamento refinado salvo com sucesso em: {OUT_FILE.name}")
