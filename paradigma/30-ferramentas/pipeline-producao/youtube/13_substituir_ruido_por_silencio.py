import json
import subprocess
from pathlib import Path
import tempfile
import os
import re # Ensure re is imported

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt"
VIDEO_NOISE_REDUCED_INPUT = OUT / "Refrigeracao_IDD_Video_1_YouTube_Antonio_noise_reduced.mp4"
TRANSCRICAO_JSON = OUT / "transcricao.json"
VIDEO_FINAL_SILENT_PAUSES = OUT / "Refrigeracao_IDD_Video_1_YouTube_Antonio_silent_pauses.mp4"
FFMPEG_CONCAT_LIST = OUT / "concat_list_silent.txt"

# Threshold for detecting "noise" in pauses (dB). Must match 12_identificar_ruido_pausas.py
NOISE_VOLUME_THRESHOLD_DB = -60.0
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
        return -1000.0

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio_segment:
        temp_audio_path = Path(temp_audio_segment.name)

    extract_command = [
        "ffmpeg", "-y",
        "-i", str(audio_path),
        "-ss", format_timestamp(start_s),
        "-to", format_timestamp(end_s),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ac", "1",
        "-ar", "16000",
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
    max_volume = -1000.0 # Initialize max_volume outside try block
    try:
        process = subprocess.run(volume_command, check=False, capture_output=True, text=True, encoding='utf-8')
        output_lines = process.stderr.splitlines() # output_lines is defined here

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
        print("Nenhum segmento de fala encontrado na transcrição. Nenhuma alteração será realizada.")
        return

    video_duration = get_audio_duration(VIDEO_NOISE_REDUCED_INPUT)
    if video_duration == 0.0:
        print("Erro: Não foi possível obter a duração do vídeo.")
        return

    segments.sort(key=lambda x: x['start'])

    pause_intervals = []
    if segments[0]['start'] > 0:
        pause_intervals.append((0.0, segments[0]['start']))

    for i in range(len(segments) - 1):
        end_current_speech = segments[i]['end']
        start_next_speech = segments[i+1]['start']
        if start_next_speech > end_current_speech:
            pause_intervals.append((end_current_speech, start_next_speech))

    if segments[-1]['end'] < video_duration:
        pause_intervals.append((segments[-1]['end'], video_duration))

    print(f"\nTotal de {len(pause_intervals)} intervalos de pausa identificados.")

    temp_segment_paths = []
    current_processing_pos = 0.0

    for i, (start_pause, end_pause) in enumerate(pause_intervals):
        pause_duration = end_pause - start_pause

        # Process the segment *before* the current pause
        if start_pause > current_processing_pos:
            seg_path_before = OUT / f"temp_segment_{len(temp_segment_paths):04d}.mp4"
            cmd_extract_before = [
                "ffmpeg", "-y",
                "-i", str(VIDEO_NOISE_REDUCED_INPUT),
                "-ss", format_timestamp(current_processing_pos),
                "-to", format_timestamp(start_pause),
                "-c", "copy",
                str(seg_path_before)
            ]
            print(f"Extraindo segmento de vídeo (fala): {format_timestamp(current_processing_pos)} - {format_timestamp(start_pause)}")
            subprocess.run(cmd_extract_before, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            temp_segment_paths.append(seg_path_before)

        # Check if the pause is noisy and long enough to be replaced with silence
        is_noisy = False
        if pause_duration >= MIN_PAUSE_DURATION_S:
            print(f"  Analisando pausa {i+1}/{len(pause_intervals)}: {format_timestamp(start_pause)} - {format_timestamp(end_pause)}", end='\r')
            max_vol = detect_volume_in_segment(VIDEO_NOISE_REDUCED_INPUT, start_pause, end_pause)
            if max_vol > NOISE_VOLUME_THRESHOLD_DB:
                is_noisy = True
                print(f"\n    Ruído detectado na pausa [{format_timestamp(start_pause)} - {format_timestamp(end_pause)}], Volume Máx: {max_vol:.2f}dB")
            else:
                print(f"\n    Pausa [{format_timestamp(start_pause)} - {format_timestamp(end_pause)}] é silenciosa o suficiente (Volume Máx: {max_vol:.2f}dB).")

        if is_noisy:
            # Generate a silent video segment for the noisy pause
            silent_seg_path = OUT / f"temp_silent_segment_{len(temp_segment_paths):04d}.mp4"
            cmd_silent_video = [
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", f"color=c=black:s=1920x1080:d={pause_duration}",
                "-f", "lavfi",
                "-i", f"anullsrc=cl=mono:r=16000:d={pause_duration}",
                "-c:v", "libx264",
                "-c:a", "aac",
                "-b:a", "96k",
                "-pix_fmt", "yuv420p",
                str(silent_seg_path)
            ]
            print(f"Gerando segmento silencioso para pausa: {format_timestamp(start_pause)} - {format_timestamp(end_pause)}")
            subprocess.run(cmd_silent_video, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            temp_segment_paths.append(silent_seg_path)
        else:
            if pause_duration > 0:
                orig_pause_path = OUT / f"temp_original_pause_{len(temp_segment_paths):04d}.mp4"
                cmd_copy_orig_pause = [
                    "ffmpeg", "-y",
                    "-i", str(VIDEO_NOISE_REDUCED_INPUT),
                    "-ss", format_timestamp(start_pause),
                    "-to", format_timestamp(end_pause),
                    "-c", "copy",
                    str(orig_pause_path)
                ]
                print(f"Copiando pausa original (silenciosa o suficiente): {format_timestamp(start_pause)} - {format_timestamp(end_pause)}")
                subprocess.run(cmd_copy_orig_pause, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                temp_segment_paths.append(orig_pause_path)

        current_processing_pos = end_pause

    last_speech_end = segments[-1]['end']
    if video_duration > last_speech_end and video_duration > current_processing_pos:
        seg_path_after = OUT / f"temp_segment_{len(temp_segment_paths):04d}.mp4"
        cmd_extract_after = [
            "ffmpeg", "-y",
            "-i", str(VIDEO_NOISE_REDUCED_INPUT),
            "-ss", format_timestamp(current_processing_pos),
            "-to", format_timestamp(video_duration),
            "-c", "copy",
            str(seg_path_after)
        ]
        print(f"Extraindo segmento de vídeo final: {format_timestamp(current_processing_pos)} - {format_timestamp(video_duration)}")
        subprocess.run(cmd_extract_after, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        temp_segment_paths.append(seg_path_after)




    if not temp_segment_paths:
        print("Nenhum segmento de vídeo para concatenar. O vídeo final não será gerado.")
        return

    concat_lines = [f"file '{p.name}'" for p in temp_segment_paths]
    FFMPEG_CONCAT_LIST.write_text("\n".join(concat_lines), encoding="utf-8")

    print("\nConcatenando segmentos de vídeo...")
    concat_command = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(FFMPEG_CONCAT_LIST),
        "-c", "copy",
        str(VIDEO_FINAL_SILENT_PAUSES)
    ]
    try:
        subprocess.run(concat_command, check=True, cwd=OUT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"\nVídeo final com pausas ruidosas substituídas por silêncio gerado com sucesso: {VIDEO_FINAL_SILENT_PAUSES}")
    except subprocess.CalledProcessError as e:
        print(f"Erro ao concatenar segmentos: {e}")
        print(f"stdout: {e.stdout.decode()}")
        print(f"stderr: {e.stderr.decode()}")
    finally:
        print("Limpando arquivos temporários...")
        for p in temp_segment_paths:
            if p.exists():
                p.unlink()
        if FFMPEG_CONCAT_LIST.exists():
            FFMPEG_CONCAT_LIST.unlink()
        print("Limpeza concluída.")

if __name__ == "__main__":
    main()