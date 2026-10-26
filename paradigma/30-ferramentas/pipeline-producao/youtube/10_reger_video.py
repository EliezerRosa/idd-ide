import json
import subprocess
from pathlib import Path

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt"
VIDEO_ORIG = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1 (Versão Otimizada).mp4"
TRANSCRICAO_JSON = OUT / "transcricao.json"
VIDEO_FINAL_SILENCE_CUT = OUT / "Refrigeracao_IDD_Video_1_YouTube_Antonio_silence_cut.mp4"
FFMPEG_CONCAT_LIST = OUT / "concat_list.txt"
SILENCE_THRESHOLD_S = 15.0 # Seconds

def format_timestamp(seconds):
    """Formats seconds into HH:MM:SS.mmm for ffmpeg compatibility."""
    milliseconds = int((seconds - int(seconds)) * 1000)
    total_seconds = int(seconds)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{milliseconds:03}"

def main():
    if not TRANSCRICAO_JSON.exists():
        print(f"Erro: Arquivo de transcrição não encontrado: {TRANSCRICAO_JSON}")
        print("Por favor, execute 01_transcrever.py primeiro.")
        return

    with open(TRANSCRICAO_JSON, "r", encoding="utf-8") as f:
        segments = json.load(f)

    if not segments:
        print("Nenhum segmento de fala encontrado na transcrição. Nenhum corte será realizado.")
        return

    # Create active speech intervals
    active_intervals = []
    for s in segments:
        active_intervals.append((s['start'], s['end']))

    # Sort intervals by start time (should already be sorted, but good practice)
    active_intervals.sort(key=lambda x: x[0])

    # Merge overlapping or very close intervals
    merged_intervals = []
    if active_intervals:
        current_start, current_end = active_intervals[0]
        for next_start, next_end in active_intervals[1:]:
            # If the next segment starts within a small buffer of the current end, merge
            # A small buffer helps avoid tiny unnecessary cuts
            if next_start - current_end < 0.5: # 0.5 seconds buffer
                current_end = max(current_end, next_end)
            else:
                merged_intervals.append((current_start, current_end))
                current_start, current_end = next_start, next_end
        merged_intervals.append((current_start, current_end))

    print(f"Intervalos de fala ativos (unificados): {len(merged_intervals)}")
    # for s,e in merged_intervals:
    #     print(f"  [{format_timestamp(s)} - {format_timestamp(e)}]")

    # Identify silence gaps longer than the threshold
    cuts = []
    current_video_pos = 0.0

    for start_speech, end_speech in merged_intervals:
        # Check for silence before the current speech segment
        if start_speech - current_video_pos > SILENCE_THRESHOLD_S:
            # We found a long silence gap, so the segment from current_video_pos to start_speech
            # should be skipped. The part to KEEP is up to current_video_pos.
            # Then the next part to KEEP starts at start_speech and ends at end_speech.
            # This logic needs to be inverted for how ffmpeg concat works:
            # We keep everything *between* the long silences.
            pass # We will reconstruct the keep segments directly

        # Add the current speech segment to the parts to keep
        cuts.append((start_speech, end_speech))
        current_video_pos = end_speech

    print(f"Número de segmentos a manter após corte de silêncio: {len(cuts)}")
    # if not cuts:
    #     print("Nenhum segmento de vídeo para manter após filtrar silêncios. O vídeo final será vazio.")
    #     return

    # Prepare ffmpeg concat list
    concat_lines = []
    for i, (start_time, end_time) in enumerate(cuts):
        # Extract each segment
        segment_output_path = OUT / f"temp_segment_{i:04d}.mp4"
        command = [
            "ffmpeg", "-y",
            "-i", str(VIDEO_ORIG),
            "-ss", format_timestamp(start_time),
            "-to", format_timestamp(end_time),
            "-c", "copy",
            str(segment_output_path)
        ]
        print(f"Extraindo segmento {i+1}/{len(cuts)}: {format_timestamp(start_time)} - {format_timestamp(end_time)}")
        try:
            subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            print(f"Erro ao extrair segmento {i}: {e}")
            print(f"stdout: {e.stdout.decode()}")
            print(f"stderr: {e.stderr.decode()}")
            return

        concat_lines.append(f"file '{segment_output_path.name}'")

    if not concat_lines:
        print("Nenhum segmento para concatenar. O vídeo final não será gerado.")
        return

    FFMPEG_CONCAT_LIST.write_text("\n".join(concat_lines), encoding="utf-8")

    # Concatenate all segments
    concat_command = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(FFMPEG_CONCAT_LIST),
        "-c", "copy",
        str(VIDEO_FINAL_SILENCE_CUT)
    ]
    print("\nConcatenando segmentos de vídeo...")
    try:
        subprocess.run(concat_command, check=True, cwd=OUT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Erro ao concatenar segmentos: {e}")
        print(f"stdout: {e.stdout.decode()}")
        print(f"stderr: {e.stderr.decode()}")
        return

    print(f"\nVídeo final com silêncios removidos gerado com sucesso: {VIDEO_FINAL_SILENCE_CUT}")

    # Clean up temporary segments
    print("Limpando arquivos temporários...")
    for i in range(len(cuts)):
        segment_output_path = OUT / f"temp_segment_{i:04d}.mp4"
        if segment_output_path.exists():
            segment_output_path.unlink()
    if FFMPEG_CONCAT_LIST.exists():
        FFMPEG_CONCAT_LIST.unlink()
    print("Limpeza concluída.")

if __name__ == "__main__":
    main()