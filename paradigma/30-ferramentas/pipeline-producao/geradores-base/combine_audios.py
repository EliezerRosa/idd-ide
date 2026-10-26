"""
Combina os áudios do Eliézer e Antigravity em um único arquivo
"""
from pydub import AudioSegment
import os

# Caminhos
projeto_dir = r"c:\Antigravity - RVM Designações\narracoes_audio"
output_dir = r"C:\narracoes_audio"

eliezer_file = os.path.join(projeto_dir, "dialogo_eliezer.mp3")
antigravity_file = os.path.join(projeto_dir, "dialogo_antigravity.mp3")
output_file = os.path.join(output_dir, "slide_01.wav")

print("🎙️ Combinando áudios...")
print(f"   Eliézer: {eliezer_file}")
print(f"   Antigravity: {antigravity_file}")

# Carregar áudios
eliezer = AudioSegment.from_mp3(eliezer_file)
antigravity = AudioSegment.from_mp3(antigravity_file)

# Pausa de 1.5 segundos entre as falas
pausa = AudioSegment.silent(duration=1500)

# Combinar: Eliézer + pausa + Antigravity
combinado = eliezer + pausa + antigravity

# Exportar como WAV
os.makedirs(output_dir, exist_ok=True)
combinado.export(output_file, format="wav")

print(f"\n✅ Áudio combinado salvo em: {output_file}")
print(f"   Duração total: {len(combinado) / 1000:.1f} segundos")
