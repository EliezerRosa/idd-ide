import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
OUT_DIR = BASE_DIR / "producao_yt" / "racha_assets"
AUDIO_DIR = OUT_DIR / "audio_completo_racha"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

# ROTEIRO APROFUNDADO DO TALK SHOW: HOMOLOGAÇÃO COMPLETA DO DOMÍNIO RACHA DE CONTA & PIX
# Focado 100% no aplicativo, nas situações de mesa de bar, fintech, webhook Pix e invariantes contábeis.
DIALOGUES = [
    # --- ATO 1: O CAOS DA CONTA DE BAR & O PROPÓSITO DO RACHA INTELIGENTE ---
    {
        "id": "r01_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer",
        "action": "point_header",
        "text": "Olá a todos da nossa comunidade no YouTube! Sejam muito bem-vindos a este episódio especial de homologação do nosso aplicativo de Racha de Conta e Pix no Paradigma IDD! Hoje, eu, a nossa Usuária Leiga e a IA Compilador vamos dissecar toda a engenharia de dados e comportamento deste app que veio para eliminar o constrangimento na hora de pagar a conta entre amigos."
    },
    {
        "id": "r02_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer",
        "action": "listen",
        "text": "Eliézer, quem nunca passou por isso? Você sai para um restaurante com dez amigos, uns beberam chope artesanal caro, outros só tomaram água, e no final alguém quer dividir a conta por igual na calculadora do celular. Sempre sobra para quem bebeu menos ou para quem assume o cartão de crédito e fica semanas cobrando os amigos no WhatsApp!"
    },
    {
        "id": "r03_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer",
        "action": "point_invariants_top",
        "text": "Exatamente, Leiga! Essa fricção social acontece porque os aplicativos comuns tratam a conta como um cálculo estático de planilha. No Paradigma IDD, nós modelamos o racha como um sistema financeiro transacional com conservação estrita de saldo e idempotência bancária. Eliézer, compartilhe o nosso Modelo Entidade-Relacionamento para vermos a blindagem dessas entidades."
    },

    # --- ATO 2: MER - A FUNDAÇÃO DA MESA & PARTICIPANTES ---
    {
        "id": "r04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer",
        "action": "point_mesa",
        "text": "Vejam no centro do nosso MER: a entidade MESA hospeda a sessão do bar ou restaurante. Cada amigo ingressa na mesa através de um código ou QR Code, registrando seu identificador na entidade PARTICIPANTE. Observem que o vínculo é direto e leve: nenhum amigo é obrigado a passar por cadastros pesados ou baixar aplicativos complexos no meio de uma conversa descontraída."
    },
    {
        "id": "r05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer",
        "action": "point_comanda",
        "text": "E onde ficam os pratos e bebidas? Se pedirmos uma porção de picanha que três amigos vão comer, mas o suco é individual, como o banco separa isso?"
    },

    # --- ATO 3: A MATRIZ ASSOCIATIVA & A INVARIANTE DA SOMA ZERO ---
    {
        "id": "r06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer",
        "action": "point_consumo_item",
        "text": "A resposta está na nossa tabela associativa N para N: a CONSUMO_ITEM! Ela faz a ponte entre o ITEM_COMANDA e os PARTICIPANTES que consumiram aquele prato. Em vez de simplesmente dividir valores com dízimas periódicas arredondadas que geram centavos fantasmas, o sistema armazena a fração exata de consumo de cada um."
    },
    {
        "id": "r07_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer",
        "action": "point_inv_soma_zero",
        "text": "E atenção para a nossa primeira Invariante Universal de Dados: a Invariante da Soma Zero! Para qualquer item compartilhado na mesa, o somatório de todas as frações atribuídas deve resultar em exatamente um ponto zero. O banco de dados rejeita qualquer lançamento que deixe frações órfãs ou gere cobranças duplicadas. Nenhum centavo se cria e nenhum centavo se perde!"
    },

    # --- ATO 4: COTA DE RATEIO & O SNAPSHOT IMUTÁVEL ---
    {
        "id": "r08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer",
        "action": "question_early_leave",
        "text": "E o caso clássico de quando um amigo precisa ir embora mais cedo, paga a parte dele no Pix e vai embora, mas o restante da mesa continua bebendo e pedindo saideiras?"
    },
    {
        "id": "r09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer",
        "action": "point_cota_rateio",
        "text": "Brilhante colocação, Leiga! Para isso nós criamos a entidade COTA_RATEIO como um snapshot auditado. Quando o amigo que vai embora solicita o fechamento antecipado, o sistema congela a cota dele com um Hash SHA-256. Aquele valor torna-se imutável e quitado, enquanto a mesa principal continua aberta e absorvendo novos itens para os que ficaram."
    },

    # --- ATO 5: PAYLOAD PIX EMV DINÂMICO & WEBHOOK BACEN IDEMPOTENTE ---
    {
        "id": "r10_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer",
        "action": "point_payload_pix",
        "text": "E vejam a entidade PAYLOAD_PIX conectada à cota de rateio! Nosso aplicativo não utiliza chave Pix estática onde o usuário digita o valor na mão correndo o risco de errar centavos. Nós geramos o QR Code dinâmico no padrão EMV do Banco Central com TxId exclusivo e valor travado. E a Invariante de Idempotência garante que se o webhook do banco central enviar notificações repetidas de liquidação, o saldo da mesa é atualizado exatamente uma única vez!"
    },

    # --- ATO 6: TRANSIÇÃO PARA O UML INTERATIVO - FOCO NO AMIGO ---
    {
        "id": "r11_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "switch_to_uml_amigo",
        "text": "Transitamos agora para a camada de comportamento: o Modelo UML Vivo do Racha de Pix! Vejam na tela o foco selecionado no Amigo na Mesa. O fluxo é limpo e direto: no Caso de Uso 02 ele ingressa na mesa escaneando o QR Code da comanda, no Caso de Uso 03 ele acompanha seu consumo individual e compartilhado com transparência total, e no Caso de Uso 07 ele clica em pagar via Pix Copia e Cola!"
    },
    {
        "id": "r12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "uml",
        "action": "point_whatsapp_notification",
        "text": "E assim que o Pix é pago, o Caso de Uso 08 já entrega o comprovante automático no WhatsApp dele! Nada de tirar print do comprovante do banco e ficar enviando no grupo para provar que pagou."
    },

    # --- ATO 7: A PERSPECTIVA DO ORGANIZADOR DA MESA ---
    {
        "id": "r13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "switch_to_uml_organizador",
        "text": "Alternando para a perspectiva do Organizador do Racha! Aqui vemos o amigo responsável pela mesa. Ele tem o Caso de Uso 01 para abrir a mesa e definir se a gorjeta de 10% do garçom é rateada proporcionalmente ao consumo de cada um ou dividida igualmente. E no Caso de Uso 06 ele fecha a mesa e dispara a geração das cotas imutáveis."
    },
    {
        "id": "r14_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml",
        "action": "point_saideira_extend",
        "text": "E observem a extensão do Caso de Uso 11: Reversão de Saideira! Se o organizador já tiver emitido as cotas, mas a mesa decidir pedir uma rodada extra de sobremesas ou chopes, o sistema anula de forma atômica apenas os QR Codes ainda não pagos, preservando quem já pagou e recalculando as novas cotas sem falha contábil."
    },

    # --- ATO 8: O PAPEL DO GARÇOM E A LIQUIDAÇÃO NO CAIXA ---
    {
        "id": "r15_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "uml",
        "action": "switch_to_uml_garcom",
        "text": "E para o garçom e o caixa do restaurante? Como eles sabem quem já pagou e quando a mesa está liberada para fechar a conta física no sistema do bar?"
    },
    {
        "id": "r16_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "point_caixa_view",
        "text": "Vejam a perspectiva do Garçom e Caixa! No Caso de Uso 10, o painel do caixa exibe em tempo real o status de cada amigo: quem já liquidou via Pix aparece em verde instantaneamente. E se alguém estiver sem celular ou preferir pagar sua cota exata em dinheiro físico, o Caso de Uso 12 permite o recebimento complementar direto no balcão sem quebrar o saldo do restante da mesa!"
    },

    # --- ATO 9: DIAGRAMA DE CLASSES NO PADRÃO OMG (3 COMPARTIMENTOS) ---
    {
        "id": "r17_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "scroll_to_classes_racha",
        "text": "Descendo para a Seção 2 do UML, temos o Diagrama de Classes Canônico nos três compartimentos da OMG! Reparem na pureza das classes: a classe Mesa com métodos públicos como abrirMesa e fecharMesa, e a classe ItemComanda com o método atribuirFracao e validarSomaZero. São métodos de domínio puros que garantem as regras de negócio antes de qualquer persistência em banco."
    },
    {
        "id": "r18_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml",
        "action": "point_transacaopix_class",
        "text": "E na classe TransacaoPix, os métodos de gerarChaveDinamica e processarWebhook encapsulam toda a lógica de segurança bancária e conciliação atômica, mantendo a camada de domínio completamente desacoplada de fornecedores de gateways específicos."
    },

    # --- ATO 10: STATECHART DA MESA & SELO FINAL COM HASH SHA-256 ---
    {
        "id": "r19_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "scroll_to_statechart_racha",
        "text": "E para fechar a arquitetura com chave de ouro, vejam a Seção 3 com a Máquina de Estados da Mesa! Ela parte do estado ABERTA, transita para LANCANDO_CONSUMO a cada pedido, e ao solicitar fechamento, entra no sub-fluxo estrito de FECHAMENTO_SOLICITADO, onde recalcula frações, valida a Soma Zero e emite as cotas."
    },
    {
        "id": "r20_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml",
        "action": "point_statechart_final",
        "text": "E a guarda para atingir o estado final CONCLUIDA é rigorosa: ou todas as cotas Pix foram liquidadas pelos amigos, ou o caixa confirmou o recebimento complementar. Ao atingir o nó final concêntrico, o sistema sela a mesa com Hash SHA-256 e gera o recibo contábil imutável, garantindo que o histórico fiscal daquele racha jamais possa ser alterado."
    },

    # --- ATO 11: HOMOLOGAÇÃO UNÂNIME & ENCERRAMENTO DA PLAYLIST ---
    {
        "id": "r21_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "uml",
        "action": "conclude_racha",
        "text": "Que experiência fantástica! É exatamente isso que todo grupo de amigos e donos de restaurantes sonham em ter no bolso: justiça na divisão, facilidade no Pix e transparência absoluta. Como validadora de domínio, o aplicativo de Racha de Conta & Pix está cem por cento aprovado para a compilação de código!"
    },
    {
        "id": "r22_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml",
        "action": "approve_racha",
        "text": "Invariante da Soma Zero formalmente travada, snapshots imutáveis de cota validados e webhook Pix blindado contra concorrência e duplicidade. A arquitetura de software está homologada com distinção pelo compilador autônomo!"
    },
    {
        "id": "r23_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml",
        "action": "farewell_racha",
        "text": "Sensacional! Com o MER e o UML homologados na sua totalidade, a esteira do Paradigma IDD prova mais uma vez como transformar dores reais do cotidiano em software de classe mundial sem gambiarras. Deixe seu like, inscreva-se no canal IDD na Prática e prepare-se: no próximo episódio da série, nosso compilador entrega o código completo do Racha de Pix funcionando em produção! Até lá!"
    }
]

async def generate_speech(text, voice, out_path):
    communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
    await communicate.save(out_path)

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

async def main():
    print("=" * 80)
    print("🎙️ GERANDO ÁUDIO NEURAL TALK SHOW COMPLETO — RACHA DE CONTA & PIX (MER & UML)")
    print("   Total de Intervenções Ricas: 23 Falas Ativas")
    print("=" * 80)

    timeline_items = []
    current_time = 0.8  # folga inicial após a vinheta

    for idx, d in enumerate(DIALOGUES):
        seg_id = d["id"]
        who = d["who"]
        voice = VOICES[who]
        wav_path = AUDIO_DIR / f"{seg_id}.wav"
        mp3_path = AUDIO_DIR / f"{seg_id}.mp3"

        print(f"[{idx+1}/{len(DIALOGUES)}] Sintetizando {seg_id} ({d['actor']})...")
        await generate_speech(d["text"], voice, str(mp3_path))

        subprocess.run([
            "ffmpeg", "-y", "-i", str(mp3_path),
            "-ar", "48000", "-ac", "2",
            str(wav_path)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if mp3_path.exists():
            mp3_path.unlink()

        dur = get_audio_duration(wav_path)
        item = {
            "index": idx,
            "id": seg_id,
            "who": who,
            "actor": d["actor"],
            "avatar": d["avatar"],
            "stage": d["stage"],
            "action": d["action"],
            "text": d["text"],
            "wav": str(wav_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(current_time + dur, 3)
        }
        timeline_items.append(item)
        print(f"       Duração: {dur:.2f}s | Início: {current_time:.2f}s -> Fim: {current_time + dur:.2f}s")
        current_time += dur + 0.60  # pausa humana natural entre falas

    total_duration = round(current_time + 2.0, 2)
    print(f"\nDuração Total do Talk Show do Racha: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "timeline_racha_talkshow.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Racha_TalkShow_MER_UML",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline do Racha salva em: {timeline_path}")

    print("\nMontando Trilha Sonora Master Completa com EBU R128 (-14 LUFS)...")
    concat_list_file = OUT_DIR / "audio_concat_racha.txt"
    silence_wav = AUDIO_DIR / "silence_060s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.60", str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_silence_wav = AUDIO_DIR / "silence_080s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.80", str(initial_silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with open(concat_list_file, "w", encoding="utf-8") as f:
        f.write(f"file '{initial_silence_wav.as_posix()}'\n")
        for idx, item in enumerate(timeline_items):
            f.write(f"file '{Path(item['wav']).as_posix()}'\n")
            if idx < len(timeline_items) - 1:
                f.write(f"file '{silence_wav.as_posix()}'\n")

    raw_voice_master = OUT_DIR / "raw_voice_master_racha.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "copy", str(raw_voice_master)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    master_audio_path = OUT_DIR / "master_soundtrack_racha.wav"
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"{synth_ambience}[bg];"
        "[0:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.30 1.0[mixed];"
        "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_voice_master),
        "-filter_complex", filter_complex,
        "-map", "[out_audio]",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Sonora Master do Racha Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(main())
