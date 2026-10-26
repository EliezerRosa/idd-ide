"""Módulo de Divisão Cirúrgica de Blocos Acumulados (Auto-Split):
Para os blocos onde múltiplos segmentos da gravação original foram agrupados
(gerando silêncios mortos de 30s a 60s), este script detecta os pontos de respiração
no WAV e divide o áudio em sub-blocos proporcionais, devolvendo cada frase ao seu
momento original no vídeo-fluxo.
"""

import json
import wave
import sys
from pathlib import Path
import numpy as np

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
OUT = BASE / "v1_dueto_neural"
SEGS = OUT / "audio_segs"
SUB_SEGS_DIR = OUT / "sub_audio_segs"
SUB_SEGS_DIR.mkdir(parents=True, exist_ok=True)

turbo = json.loads((BASE / "v1_verbatim" / "transcricao_turbo.json").read_text(encoding="utf-8"))
sched = json.loads((OUT / "schedule_v1_dueto.json").read_text(encoding="utf-8"))

print(f"Total de blocos originais: {len(sched)}")

def split_wav_by_subsegs(b, sub_segs):
    wav_path = Path(b['wav'])
    if not wav_path.exists():
        return [b]

    with wave.open(str(wav_path), 'rb') as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        frames = w.getnframes()
        raw = w.readframes(frames)
        data = np.frombuffer(raw, dtype=np.int16).reshape(-1, ch)

    total_samples = len(data)
    total_dur = total_samples / float(sr)

    # Calcula a contagem de palavras de cada sub-segmento
    word_counts = [max(1, len(s['text'].strip().split())) for s in sub_segs]
    total_words = sum(word_counts)
    
    # Proporções acumuladas ideais
    cut_samples = [0]
    mono = np.abs(data).mean(axis=1)
    win = int(sr * 0.04) # 40ms window

    acc_words = 0
    for s_idx in range(len(sub_segs) - 1):
        acc_words += word_counts[s_idx]
        frac = acc_words / float(total_words)
        target_sample = int(frac * total_samples)
        
        # Procura o ponto de menor energia em uma janela de +/- 1.2s ao redor do alvo
        search_radius = int(1.2 * sr)
        w_start = max(cut_samples[-1] + int(0.5 * sr), target_sample - search_radius)
        w_end = min(total_samples - int(0.5 * sr), target_sample + search_radius)
        
        if w_end <= w_start:
            best_sample = target_sample
        else:
            energies = [mono[i : i + win].mean() for i in range(w_start, w_end, win)]
            best_sample = w_start + int(np.argmin(energies) * win)
            
        cut_samples.append(best_sample)
    cut_samples.append(total_samples)

    # Gera os novos sub-blocos
    sub_blocks = []
    fade_len = int(0.008 * sr)
    
    for k in range(len(sub_segs)):
        s_start_sample = cut_samples[k]
        s_end_sample = cut_samples[k+1]
        chunk = data[s_start_sample:s_end_sample].copy()
        
        # Aplica micro-fade in/out para evitar cliques
        f = min(fade_len, len(chunk) // 4)
        if f > 0:
            fade_in = np.linspace(0, 1, f, dtype=np.float32)[:, None]
            fade_out = np.linspace(1, 0, f, dtype=np.float32)[:, None]
            chunk[:f] = (chunk[:f].astype(np.float32) * fade_in).astype(np.int16)
            chunk[-f:] = (chunk[-f:].astype(np.float32) * fade_out).astype(np.int16)

        chunk_dur = len(chunk) / float(sr)
        sub_wav = SUB_SEGS_DIR / f"sub_{b['id']:03d}_{k+1}.wav"
        
        with wave.open(str(sub_wav), 'wb') as w:
            w.setnchannels(ch)
            w.setsampwidth(sw)
            w.setframerate(sr)
            w.writeframes(chunk.tobytes())

        sub_s = sub_segs[k]
        new_b = {
            'id': b['id'],
            'sub_id': f"{b['id']}.{k+1}",
            'speaker': b['speaker'],
            'voice': b['voice'],
            'text': sub_s['text'],
            'start': sub_s['start'],
            'end': sub_s['end'],
            'nat_dur': round(chunk_dur, 3),
            'wav': str(sub_wav)
        }
        sub_blocks.append(new_b)

    return sub_blocks

# Processa todos os blocos
expanded_blocks = []
split_count = 0

for b in sched:
    orig_dur = b['end'] - b['start']
    diff = orig_dur - b['dur']
    
    # Se o bloco agrupa múltiplos segmentos e tem grande lacuna interna (> 14s)
    if diff > 14.0:
        sub_segs = [s for s in turbo if b['start'] <= s['start'] < b['end']]
        if len(sub_segs) > 1:
            subs = split_wav_by_subsegs(b, sub_segs)
            expanded_blocks.extend(subs)
            split_count += 1
            print(f"Bloco {b['id']:3d} dividido em {len(subs)} sub-frases: {orig_dur:.1f}s orig -> {b['dur']:.1f}s TTS")
            continue
            
    # Caso contrário, mantém o bloco intacto
    new_b = dict(b)
    new_b['sub_id'] = str(b['id'])
    expanded_blocks.append(new_b)

print(f"\n[OK] {split_count} blocos divididos. Total de unidades de fala agora: {len(expanded_blocks)} (antes era {len(sched)})")

OUT_EXP = OUT / "expanded_blocks_v1.json"
OUT_EXP.write_text(json.dumps(expanded_blocks, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Arquivo salvo: {OUT_EXP.name}")
