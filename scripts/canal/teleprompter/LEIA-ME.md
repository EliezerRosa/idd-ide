# Teleprompter de gravação de Shorts

O teleprompter grava o vídeo vertical (1080×1920) com o seu rosto e a sua voz enquanto o
roteiro rola na tela. O selo "✅ CONCEITO · IDD na formulação de Eliézer Rosa" e as legendas
"Tela" de cada parágrafo entram no vídeo. O texto do roteiro não entra.

## Gravar

```powershell
python scripts/canal/teleprompter/gravar.py
```

O comando abre o Chrome ou o Edge em `http://127.0.0.1:8765/...`. Permita a câmera e o
microfone quando o navegador pedir.

1. Escolha o **Roteiro**. Ele vem de
   [roteiros-shorts-x-vs-idd.md](../../../paradigma/50-comunicacao/canal/roteiros-shorts-x-vs-idd.md).
   Para outro texto, use **Texto próprio…**.
2. Escolha o **Modo**: "Câmera + voz", ou "Só voz" (fundo escuro com o título).
3. Ajuste a **Velocidade** (palavras por minuto; 150 é um ritmo natural) e a **Fonte**.
4. Aperte **R**. Há uma contagem de 3 segundos, e o roteiro começa a rolar. Ao fim do último
   parágrafo a gravação para sozinha; ou aperte **R** de novo.
5. O arquivo vai para a pasta **Downloads**, com nome `short-<roteiro>-<data>-<hora>.mp4`.

| Tecla | Ação |
| --- | --- |
| R | Gravar ou parar |
| Espaço | Pausar ou retomar a rolagem |
| ← → | Parágrafo anterior ou seguinte (também por clique no parágrafo) |
| ↑ ↓ | Velocidade ±10 palavras por minuto |

Dicas:

- Coloque a janela com o texto logo abaixo da webcam. A linha vermelha marca onde ler, e o
  olhar fica quase na lente.
- Use fone de ouvido ou microfone de lapela, se tiver. Grave num lugar silencioso, com a luz de
  frente para o rosto.

## Preparar para o YouTube

```powershell
python scripts/canal/teleprompter/gravar.py --converter "$HOME\Downloads\short-....mp4"
```

Gera `...-yt.mp4` em H.264 + AAC, com o áudio normalizado a −14 LUFS (o volume de referência
do YouTube). Requer o `ffmpeg` no PATH.

Ao publicar, use o título e a descrição do roteiro, que já seguem o
[GUIA-REDACAO](../GUIA-REDACAO.md).
