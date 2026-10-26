"""V1 Verbatim 100% Neural - Etapa 3:
Combina os 152 blocos neurais em uma trilha de áudio estéreo mestre limpa (zero cooler, zero ruído analógico),
aplica soft-limiter e normalização profissional YouTube em -14 LUFS (EBU R128),
faz o mux com o vídeo original via stream copy e gera o vídeo final perfeito.
"""
import json, subprocess, wave, math, shutil
from pathlib import Path
import numpy as np

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt" / "v1_verbatim"
VIDEO = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1.mp4"
SCHEDULE = OUT / "schedule_100_neural.json" if (OUT / "schedule_100_neural.json").exists() else OUT / "schedule.json"
MASTER_RAW = OUT / "temp_master_100_neural.wav"
FINAL_PRIMARY = BASE / "producao_yt" / "Refrigeracao_IDD_Video_1_Narrador.mp4"
FINAL_100_NEURAL = BASE / "producao_yt" / "Refrigeracao_IDD_Video_1_100_Neural.mp4"
BACKUP_OLD = BASE / "producao_yt" / "Refrigeracao_IDD_Video_1_Narrador_backup_com_ruido.mp4"

SR = 48000
VIDEO_DUR = 4331.195
FADE_NARR = int(0.012 * SR)  # micro-fade de 12ms nas bordas de cada bloco para evitar cliques

def read_wav(path):
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 2 and w.getsampwidth() == 2
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2)

def main():
    print("==================================================", flush=True)
    print("INICIANDO MASTERIZAÇÃO E MUX 100% NEURAL (SEM COOLER)", flush=True)
    print("==================================================", flush=True)

    print(f"Lendo cronograma: {SCHEDULE.name}...", flush=True)
    blocks = json.loads(SCHEDULE.read_text(encoding="utf-8"))
    total_samples = int(VIDEO_DUR * SR)
    print(f"Total de blocos: {len(blocks)} | Duração total: {VIDEO_DUR:.1f}s ({total_samples} amostras)", flush=True)

    # 1. Alocação do buffer mestre limpo
    print("Construindo trilha de voz 100% neural...", flush=True)
    narr_track = np.zeros((total_samples, 2), dtype=np.float32)

    for i, b in enumerate(blocks, 1):
        wav_path = Path(b["wav"])
        if not wav_path.exists():
            raise FileNotFoundError(f"Arquivo WAV não encontrado para o bloco {b['id']}: {wav_path}")
        
        seg = read_wav(wav_path).astype(np.float32)
        f = min(FADE_NARR, len(seg) // 2)
        if f > 0:
            fade_in = np.linspace(0, 1, f, dtype=np.float32)[:, None]
            fade_out = np.linspace(1, 0, f, dtype=np.float32)[:, None]
            seg[:f] *= fade_in
            seg[-f:] *= fade_out

        s = int(b["sched_start"] * SR)
        e = min(total_samples, s + len(seg))
        narr_track[s:e] += seg[: e - s]

        if i % 30 == 0 or i == len(blocks):
            print(f"  posicionados {i}/{len(blocks)} blocos na linha do tempo", flush=True)

    # 2. Soft-limiter suave (tanh) para máxima fidelidade sem distorção digital
    print("Aplicando soft-limiter...", flush=True)
    master = narr_track / 32768.0
    del narr_track
    master = np.tanh(master * 0.95)
    master_int16 = (master * 32767.0).astype(np.int16)
    del master

    print(f"Gravando WAV intermediário: {MASTER_RAW.name}...", flush=True)
    with wave.open(str(MASTER_RAW), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(master_int16.tobytes())
    del master_int16

    # 3. Backup do vídeo antigo caso ainda não tenha sido feito
    if FINAL_PRIMARY.exists() and not BACKUP_OLD.exists():
        print(f"Criando backup da versão anterior: {BACKUP_OLD.name}...", flush=True)
        shutil.copy2(str(FINAL_PRIMARY), str(BACKUP_OLD))

    # 4. Masterização em -14 LUFS e remux com stream copy de vídeo
    print("Normalizando áudio em -14 LUFS e gerando vídeo final...", flush=True)
    cmd_final = [
        "ffmpeg", "-y",
        "-i", str(VIDEO),
        "-i", str(MASTER_RAW),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-filter:a:0", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        str(FINAL_PRIMARY)
    ]
    subprocess.run(cmd_final, check=True)

    # Cria cópia também como Refrigeracao_IDD_Video_1_100_Neural.mp4
    if FINAL_PRIMARY.exists():
        print(f"Criando alias explícito: {FINAL_100_NEURAL.name}...", flush=True)
        shutil.copy2(str(FINAL_PRIMARY), str(FINAL_100_NEURAL))

    # Limpeza do WAV temporário
    if MASTER_RAW.exists():
        MASTER_RAW.unlink()

    print("\n==================================================", flush=True)
    print("SUCESSO ABSOLUTO! VÍDEO 100% NEURAL CONCLUÍDO!", flush=True)
    print(f"Vídeo principal: {FINAL_PRIMARY}")
    print(f"Vídeo cópia:     {FINAL_100_NEURAL}")
    print(f"Tamanho:         {FINAL_PRIMARY.stat().st_size / (1024*1024):.1f} MB")
    print("==================================================", flush=True)

if __name__ == "__main__":
    main()
