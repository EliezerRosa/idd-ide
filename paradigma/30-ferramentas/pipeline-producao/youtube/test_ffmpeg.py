import subprocess
font_bold = "C\\:/Windows/Fonts/arialbd.ttf"
cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1',
    '-vf', f"drawtext=fontfile='{font_bold}':text='CANAL OFICIAL - @ELIEZERJPROSA':fontcolor=white:fontsize=30:x=100:y=100",
    '-update', '1', '-frames:v', '1',
    r'C:\Antigravity - IDD Refrigeração\producao_yt\test.jpg'
]
subprocess.run(cmd, check=True)
print('OK no colon inside text')
