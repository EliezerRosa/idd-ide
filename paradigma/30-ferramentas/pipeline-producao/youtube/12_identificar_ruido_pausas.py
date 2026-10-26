import json
import subprocess
import re
from pathlib import Path
import tempfile
import os

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt"
VIDEO_NOISE_REDUCED_INPUT = OUT / "Refrigeracao_IDD_Video_1_YouTube_Antonio_noise_reduced.mp4"
TRANSCRICAO_JSON = OUT / "transcricao.json"

# Threshold for detecting "noise" in pauses (dB). Adjust as needed.
# -40dB is a reasonable starting point for detectable background noise.
NOISE_VOLUME_THRESHOLD_DB = -40.0
# Minimum duration for a pause to be considered for noise detection
MIN_PAUSE_DURATION_S = 1.0

def format_timestamp(seconds):
    milliseconds = int((seconds - int(seconds)) * 1000)
    total_seconds = int(seconds)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{milliseconds:03}"

def get_audio_duration(file_path):
    try:
        duration_str = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)], capture_output=True, text=True, encoding='utf-8').stdout.strip()
        return float(duration_str) if duration_str else 0.0
    except Exception:
        return 0.0

def detect_volume_in_segment(audio_path, start_s, end_s):
    if end_s <= start_s:
        return -1000.0 # Effectively -infinity dB for no sound

    # Use a temporary file for segment extraction to avoid issues with long paths/spaces
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio_segment:
        temp_audio_path = Path(temp_audio_segment.name)

    extract_command = [
        "ffmpeg", "-y",
        "-i", str(audio_path),
        "-ss", format_timestamp(start_s),
        "-to", format_timestamp(end_s),
        "-vn", # No video
        "-acodec", "pcm_s16le", # PCM 16-bit little-endian
        "-ac", "1", # Mono
        "-ar", "16000", # 16 kHz sample rate
        str(temp_audio_path)
    ]
    try:
        subprocess.run(extract_command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
    except subprocess.CalledProcessError as e:
        print(f"Error extracting audio segment [{start_s:.2f}-{end_s:.2f}]: {e}")
        if temp_audio_path.exists():
            temp_audio_path.unlink()
        return -1000.0

    volume_command = [
        "ffmpeg", "-i", str(temp_audio_path),
        "-af", "volumedetect",
        "-f", "null", "-"
    ]
    try:
        process = subprocess.run(volume_command, check=False, capture_output=True, text=True, encoding='utf-8')
        output_lines = process.stderr.splitlines()
        max_volume = -1000.0
        for line in output_lines:
            if "max_volume" in line:
                match = re.search(r"max_volume: (-?\d+\.?\d*) dB", line)
                if match:
                    max_volume = float(match.group(1))
                    break
        return max_volume
    except Exception as e:
        print(f"Error detecting volume in segment [{start_s:.2f}-{end_s:.2f}]: {e}")
        return -1000.0
    finally:
        if temp_audio_path.exists():
            temp_audio_path.unlink()

def main():
    if not VIDEO_NOISE_REDUCED_INPUT.exists():
        print(f"Erro: Vídeo noise-reduced não encontrado: {VIDEO_NOISE_REDUCED_INPUT}")
        print("Por favor, certifique-se de que '11_eliminar_ruido.py' foi executado com sucesso.")
        return

    if not TRANSCRICAO_JSON.exists():
        print(f"Erro: Arquivo de transcrição não encontrado: {TRANSCRICAO_JSON}")
        print("Por favor, execute '01_transcrever.py' primeiro.")
        return

    with open(TRANSCRICAO_JSON, "r", encoding="utf-8") as f:
        segments = json.load(f)

    if not segments:
        print("Nenhum segmento de fala encontrado na transcrição. Nenhuma análise de ruído em pausas será realizada.")
        return

    video_duration = get_audio_duration(VIDEO_NOISE_REDUCED_INPUT)
    if video_duration == 0.0:
        print("Erro: Não foi possível obter a duração do vídeo.")
        return

    # Sort segments by start time (should already be sorted)
    segments.sort(key=lambda x: x['start'])

    pause_intervals = []
    current_pos = 0.0

    # Add initial pause if any
    if segments[0]['start'] > 0:
        pause_intervals.append((0.0, segments[0]['start']))

    for i in range(len(segments) - 1):
        end_current_speech = segments[i]['end']
        start_next_speech = segments[i+1]['start']
        if start_next_speech > end_current_speech:
            pause_intervals.append((end_current_speech, start_next_speech))

    # Add final pause if any
    if segments[-1]['end'] < video_duration:
        pause_intervals.append((segments[-1]['end'], video_duration))

    print(f"\nTotal de {len(pause_intervals)} intervalos de pausa identificados.")
    print(f"Analisando pausas para ruído (volume > {NOISE_VOLUME_THRESHOLD_DB}dB e duração > {MIN_PAUSE_DURATION_S}s)...")

    noisy_pauses = []
    for i, (start_pause, end_pause) in enumerate(pause_intervals):
        pause_duration = end_pause - start_pause
        if pause_duration < MIN_PAUSE_DURATION_S:
            continue

        print(f"  Analisando pausa {i+1}/{len(pause_intervals)}: {format_timestamp(start_pause)} - {format_timestamp(end_pause)}", end='\r')
        max_vol = detect_volume_in_segment(VIDEO_NOISE_REDUCED_INPUT, start_pause, end_pause)

        if max_vol > NOISE_VOLUME_THRESHOLD_DB:
            noisy_pauses.append({
                "start": start_pause,
                "end": end_pause,
                "duration": pause_duration,
                "max_volume_db": max_vol
            })
    print("\nAnálise de pausas concluída.")

    if noisy_pauses:
        print(f"\n=== {len(noisy_pauses)} SEGMENTOS DE PAUSA COM RUÍDO DETECTADO ===")
        for p in noisy_pauses:
            print(f"[{format_timestamp(p['start'])} - {format_timestamp(p['end'])}] Duração: {p['duration']:.2f}s, Volume Máx: {p['max_volume_db']:.2f}dB")
    else:
        print("\nNenhum segmento de pausa com ruído detectado acima do limiar.")

if __name__ == "__main__":
    main()