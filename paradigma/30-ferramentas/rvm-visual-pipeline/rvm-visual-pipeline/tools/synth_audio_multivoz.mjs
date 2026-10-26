/**
 * synth_audio_multivoz.mjs — sintetiza os WAVs de narração com 3 vozes + conectivos naturais.
 *
 * Uso:
 *   node synth_audio_multivoz.mjs              # sintetiza todos os segmentos
 *   node synth_audio_multivoz.mjs --preview    # gera preview_narration_multivoz.txt sem TTS
 *
 * Saída:
 *   tools/audio_multivoz/<segmentId>.wav       (um arquivo por segmento)
 *   tools/manifest_multivoz.json               (lista de segmentos com duração em segundos)
 *   tools/preview_narration_multivoz.txt       (texto expandido para revisão humana)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Caminhos ─────────────────────────────────────────────────────────────────
const HTML_FILE   = join(__dirname, '..', 'eleicao-candidatos-apresentacao-multivoz.html');
const JARGON_FILE = join(__dirname, 'jargon.json');
const AUDIO_DIR   = join(__dirname, 'audio_multivoz');
const MANIFEST    = join(__dirname, 'manifest_multivoz.json');
const PREVIEW_TXT = join(__dirname, 'preview_narration_multivoz.txt');

const PREVIEW_ONLY = process.argv.includes('--preview') ||
                     process.argv.includes('--preview-only');

// ── Vozes pt-BR ────────────────────────────────────────────────────────────────
const VOICES = {
  NARRATOR_A: 'pt-BR-AntonioNeural',        // Masculino principal
  NARRATOR_B: 'pt-BR-FabioNeural',          // Masculino secundário
  COMMENTATOR: 'pt-BR-FranciscaNeural'      // Feminino (IA)
};

const FALLBACK_VOICES = {
  NARRATOR_B: 'pt-BR-DonatoNeural',
  COMMENTATOR: 'pt-BR-ThalitaNeural'
};

const RATE = '-10%';   // um pouco mais lento, melhor para narração

// ── Pools de conectivos ────────────────────────────────────────────────────────
const CONNECTORS = {
  'A_TO_B': [
    'E aí entra',
    'Logo em seguida',
    'Na sequência',
    'Daí passamos para',
    'Outro ponto',
    'Continuando',
    'Próximo passo',
    'Em seguida',
    'Avançando',
    'Vejamos agora',
    'Segue então',
    'Mais adiante',
    'Depois disso',
    'Por sua vez',
    'Partindo daqui'
  ],
  'B_TO_A': [
    'Voltando ao fluxo',
    'Retomando',
    'Por outro lado',
    'Complementando',
    'Repare também que',
    'Note que',
    'Vale notar',
    'E mais',
    'Acrescentando',
    'Além disso',
    'Seguindo adiante',
    'Na continuação',
    'Indo além',
    'Prosseguindo',
    'Mais um ponto'
  ],
  'TO_AI': [
    'Comentário da IA',
    'Análise',
    'Em outras palavras',
    'Traduzindo',
    'Para fixar',
    'Em síntese',
    'O ponto-chave',
    'Resumindo',
    'Na prática isso significa',
    'Destaque',
    'Observação importante',
    'Vale destacar',
    'Fundamentalmente',
    'Essencialmente',
    'O cerne da questão'
  ],
  'FROM_AI': [
    'Seguimos',
    'Adiante',
    'Continuando',
    'Próximo',
    'Mais um passo',
    'E temos também',
    'Voltemos ao processo',
    'Retomando o fluxo',
    'Prossigamos',
    'Avancemos',
    'Seguindo',
    'De volta ao diagrama',
    'Continuemos',
    'Próxima etapa',
    'Vamos adiante'
  ]
};

// ── Jargão ────────────────────────────────────────────────────────────────────
const JARGON = JSON.parse(readFileSync(JARGON_FILE, 'utf8'));
const JARGON_KEYS = Object.keys(JARGON).sort((a, b) => b.length - a.length);

function expandJargon(text) {
  let out = text;
  for (const key of JARGON_KEYS) {
    const idx = out.toLowerCase().indexOf(key.toLowerCase());
    if (idx !== -1) {
      out = out.slice(0, idx) + JARGON[key] + out.slice(idx + key.length);
    }
  }
  return out;
}

// ── Extrai constantes do HTML ─────────────────────────────────────────────────
function extractConstants() {
  const html = readFileSync(HTML_FILE, 'utf8');
  const begin = html.indexOf('/* EXTRACT_CONSTANTS_BEGIN */');
  const end   = html.indexOf('/* EXTRACT_CONSTANTS_END */');
  if (begin === -1 || end === -1) {
    throw new Error('Marcadores EXTRACT_CONSTANTS não encontrados no HTML.');
  }
  const block = html.slice(begin + '/* EXTRACT_CONSTANTS_BEGIN */'.length, end);
  // eslint-disable-next-line no-new-func
  return new Function(block + '\nreturn { INTRO_SCRIPT, GRAPHS, GRAPH_INTENT, FLOWS, NARRATIVE_BY_INDEX };')();
}

const { INTRO_SCRIPT, GRAPHS, GRAPH_INTENT, FLOWS, NARRATIVE_BY_INDEX } = extractConstants();

// ── Seleção de voz por tipo e índice ──────────────────────────────────────────
/**
 * Determina qual voz deve ser usada para um segmento.
 * 
 * Regras:
 * - intro, tab titles: Narrador A (Antonio)
 * - flow names: Narrador B (Fabio)
 * - explanation (índice par): Narrador A
 * - explanation (índice ímpar): Narrador B
 * - aiComment: Comentarista (Francisca)
 * - outro: Narrador A
 * - conectivos: voz do segmento de DESTINO
 */
function assignVoice(seg) {
  const { id, type, nodeIndex } = seg;
  
  if (type === 'intro' || type === 'tab' || type === 'outro') {
    return VOICES.NARRATOR_A;
  }
  
  if (type === 'flow') {
    return VOICES.NARRATOR_B;
  }
  
  if (type === 'explanation') {
    return (nodeIndex % 2 === 0) ? VOICES.NARRATOR_A : VOICES.NARRATOR_B;
  }
  
  if (type === 'aicomment') {
    return VOICES.COMMENTATOR;
  }
  
  if (type === 'connector') {
    // Conectivo usa a voz do destino (já calculada antes)
    return seg.voiceOverride || VOICES.NARRATOR_A;
  }
  
  return VOICES.NARRATOR_A;
}

// ── Hash determinístico ────────────────────────────────────────────────────────
function hashString(str) {
  return parseInt(createHash('md5').update(str).digest('hex').slice(0, 8), 16);
}

/**
 * Escolhe um conectivo do pool de forma determinística (baseado no hash do segId).
 * Evita repetir o último conectivo usado (anti-repetição simples).
 */
function pickConnector(type, segId, lastUsed) {
  const pool = CONNECTORS[type] || CONNECTORS.TO_AI;
  if (pool.length === 0) return '';
  
  // Filtra o último usado (se houver)
  const available = lastUsed ? pool.filter(c => c !== lastUsed) : pool;
  if (available.length === 0) return pool[0];
  
  const hash = hashString(segId);
  const idx = hash % available.length;
  return available[idx];
}

// ── Monta segmentos na ordem exata de reprodução ──────────────────────────────
function buildSegments() {
  const segs = [];
  const lastConnectorByType = {};

  function addConnector(fromRole, toRole, beforeSegId, destVoice) {
    let connectorType = 'TO_AI';
    
    if (fromRole === 'AI' && toRole !== 'AI') {
      connectorType = 'FROM_AI';
    } else if (fromRole !== 'AI' && toRole === 'AI') {
      connectorType = 'TO_AI';
    } else if (fromRole === 'A' && toRole === 'B') {
      connectorType = 'A_TO_B';
    } else if (fromRole === 'B' && toRole === 'A') {
      connectorType = 'B_TO_A';
    }
    
    const connectorId = `connector-${beforeSegId}`;
    const text = pickConnector(connectorType, connectorId, lastConnectorByType[connectorType]);
    lastConnectorByType[connectorType] = text;
    
    segs.push({
      id: connectorId,
      type: 'connector',
      text,
      voiceOverride: destVoice
    });
  }

  // Função auxiliar para determinar o "papel" de uma voz
  function getRole(voice) {
    if (voice === VOICES.COMMENTATOR || voice === FALLBACK_VOICES.COMMENTATOR) return 'AI';
    if (voice === VOICES.NARRATOR_A) return 'A';
    if (voice === VOICES.NARRATOR_B || voice === FALLBACK_VOICES.NARRATOR_B) return 'B';
    return 'A';
  }

  // 1. Introdução (sem conectivo antes)
  segs.push({ id: 'intro', type: 'intro', text: INTRO_SCRIPT });

  let lastVoice = VOICES.NARRATOR_A;
  let lastRole = 'A';

  // 2. Cada aba
  for (const graph of GRAPHS) {
    const gid = graph.id;
    const intent = GRAPH_INTENT?.[gid] || '';
    const tabText = `${graph.title}. ${intent}`;
    const tabVoice = VOICES.NARRATOR_A;
    const tabRole = 'A';
    
    // Conectivo antes do tab (se não for o primeiro elemento)
    if (segs.length > 1) {
      addConnector(lastRole, tabRole, `tab-${gid}`, tabVoice);
    }
    
    segs.push({
      id: `tab-${gid}`,
      type: 'tab',
      text: tabText
    });
    
    lastVoice = tabVoice;
    lastRole = tabRole;

    const flows = FLOWS?.[gid] || [];
    for (let fi = 0; fi < flows.length; fi++) {
      const flow = flows[fi];
      const flowText = `Caminho ${fi + 1}: ${flow.name}. Objetivo: ${flow.objective}`;
      const flowVoice = VOICES.NARRATOR_B;
      const flowRole = 'B';
      
      // Conectivo antes do flow
      addConnector(lastRole, flowRole, `flow-${gid}-${fi}`, flowVoice);
      
      segs.push({
        id: `flow-${gid}-${fi}`,
        type: 'flow',
        text: flowText
      });
      
      lastVoice = flowVoice;
      lastRole = flowRole;

      for (const ni of flow.indexes) {
        const narr = NARRATIVE_BY_INDEX?.[gid]?.[ni];
        if (!narr) continue;

        // Explanation
        const explVoice = (ni % 2 === 0) ? VOICES.NARRATOR_A : VOICES.NARRATOR_B;
        const explRole = (ni % 2 === 0) ? 'A' : 'B';
        
        addConnector(lastRole, explRole, `node-${gid}-${ni}-explanation`, explVoice);
        
        segs.push({
          id: `node-${gid}-${ni}-explanation`,
          type: 'explanation',
          nodeIndex: ni,
          text: narr.explanation
        });
        
        lastVoice = explVoice;
        lastRole = explRole;

        // AI Comment
        const aiVoice = VOICES.COMMENTATOR;
        const aiRole = 'AI';
        
        addConnector(lastRole, aiRole, `node-${gid}-${ni}-aicomment`, aiVoice);
        
        segs.push({
          id: `node-${gid}-${ni}-aicomment`,
          type: 'aicomment',
          nodeIndex: ni,
          text: narr.aiComment
        });
        
        lastVoice = aiVoice;
        lastRole = aiRole;
      }
    }
  }

  // 3. Encerramento
  const outroVoice = VOICES.NARRATOR_A;
  const outroRole = 'A';
  
  addConnector(lastRole, outroRole, 'outro', outroVoice);
  
  segs.push({
    id: 'outro',
    type: 'outro',
    text: 'Fim da apresentação. Obrigado por acompanhar o RVM Designações.'
  });

  // Aplica expansão de jargão em todos
  return segs.map(s => ({ ...s, textExpanded: expandJargon(s.text) }));
}

const segments = buildSegments();

// ── Preview ───────────────────────────────────────────────────────────────────
const previewLines = [];
previewLines.push('=== PREVIEW MULTIVOZ - ORDEM CRONOLÓGICA ===\n');
previewLines.push('Vozes usadas:');
previewLines.push(`  Narrador A (principal): ${VOICES.NARRATOR_A}`);
previewLines.push(`  Narrador B (secundário): ${VOICES.NARRATOR_B}`);
previewLines.push(`  Comentarista IA (feminino): ${VOICES.COMMENTATOR}`);
previewLines.push('');

segments.forEach((s, idx) => {
  const voice = assignVoice(s);
  const roleLabel = s.type === 'connector' ? '[CONECTIVO]' : s.type.toUpperCase();
  previewLines.push(`\n[${idx + 1}/${segments.length}] ${roleLabel} - ${voice}`);
  previewLines.push(`ID: ${s.id}`);
  previewLines.push(`Texto: ${s.textExpanded}`);
  if (s.text !== s.textExpanded) {
    previewLines.push(`Original: ${s.text}`);
  }
});

writeFileSync(PREVIEW_TXT, previewLines.join('\n'), 'utf8');
console.log(`\nPreview salvo em: ${PREVIEW_TXT}`);
console.log(`Total de segmentos (incluindo conectivos): ${segments.length}`);

// Contagem por tipo
const counts = {};
segments.forEach(s => {
  counts[s.type] = (counts[s.type] || 0) + 1;
});
console.log('\nSegmentos por tipo:');
Object.entries(counts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

if (PREVIEW_ONLY) {
  console.log('\nModo --preview: TTS ignorado.');
  process.exit(0);
}

// ── Validar vozes disponíveis ─────────────────────────────────────────────────
console.log('\n=== Validando vozes edge-tts disponíveis ===');

function checkVoiceAvailable(voiceName) {
  try {
    const py = `
import edge_tts
import asyncio

async def check():
    voices = await edge_tts.list_voices()
    for v in voices:
        if v['Name'] == '${voiceName}':
            return True
    return False

print('yes' if asyncio.run(check()) else 'no')
`.trim();
    
    const res = spawnSync('python', ['-c', py], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 10000
    });
    
    return res.stdout.trim() === 'yes';
  } catch (e) {
    console.warn(`Erro ao verificar voz ${voiceName}: ${e.message}`);
    return false;
  }
}

// Validar e aplicar fallbacks se necessário
const finalVoices = { ...VOICES };

if (!checkVoiceAvailable(VOICES.NARRATOR_B)) {
  console.log(`⚠️  ${VOICES.NARRATOR_B} não disponível, usando fallback ${FALLBACK_VOICES.NARRATOR_B}`);
  finalVoices.NARRATOR_B = FALLBACK_VOICES.NARRATOR_B;
}

if (!checkVoiceAvailable(VOICES.COMMENTATOR)) {
  console.log(`⚠️  ${VOICES.COMMENTATOR} não disponível, usando fallback ${FALLBACK_VOICES.COMMENTATOR}`);
  finalVoices.COMMENTATOR = FALLBACK_VOICES.COMMENTATOR;
}

console.log('\n✓ Vozes finais configuradas:');
console.log(`  Narrador A: ${finalVoices.NARRATOR_A}`);
console.log(`  Narrador B: ${finalVoices.NARRATOR_B}`);
console.log(`  Comentarista: ${finalVoices.COMMENTATOR}`);

// ── TTS via edge-tts (Python) ─────────────────────────────────────────────────
mkdirSync(AUDIO_DIR, { recursive: true });

/**
 * Sintetiza `text` para `outPath` usando edge-tts (Python package).
 */
function synthesize(text, voice, outPath, maxRetries = 5) {
  const tmpFile = join(tmpdir(), `rvm-tts-${randomUUID()}.json`);
  try {
    writeFileSync(tmpFile, JSON.stringify({ text, voice, rate: RATE, out: outPath }));
    const py = /* python */ `
import json, sys, asyncio, time
with open(sys.argv[1], encoding='utf-8') as fh:
    data = json.load(fh)
import edge_tts

async def run():
    max_retries = 5
    for attempt in range(max_retries):
        try:
            comm = edge_tts.Communicate(data['text'], data['voice'],
                                         rate=data.get('rate', '+0%'))
            await comm.save(data['out'])
            return
        except edge_tts.exceptions.NoAudioReceived:
            if attempt < max_retries - 1:
                wait = (2 ** attempt) + (0.5 * attempt)
                print(f"Retry {attempt+1}/{max_retries} após {wait}s...", file=sys.stderr)
                await asyncio.sleep(wait)
            else:
                raise

asyncio.run(run())
`.trim();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = spawnSync('python', ['-c', py, tmpFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 60000, // 60s timeout por tentativa
      });
      
      // Verifica se WAV foi criado com sucesso
      if (res.status === 0 && existsSync(outPath)) {
        const stat = statSync(outPath);
        if (stat.size > 0) {
          return; // Sucesso
        }
      }
      
      if (attempt < maxRetries - 1) {
        const waitMs = (2 ** attempt) * 1000 + Math.random() * 500;
        console.error(`Tentativa ${attempt + 1}/${maxRetries} falhou para ${outPath}, aguardando ${(waitMs/1000).toFixed(1)}s...`);
        spawnSync('timeout', ['/t', String(Math.ceil(waitMs / 1000)), '/nobreak'], { shell: true });
      } else {
        console.error(`FALHA FINAL após ${maxRetries} tentativas para ${outPath}:\n${res.stderr}`);
      }
    }
  } finally {
    try { unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

/**
 * Obtém a duração em segundos de um arquivo de áudio via ffprobe.
 */
function getDuration(filePath) {
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });
  return parseFloat(res.stdout.trim()) || 0;
}

// ── Sintetiza cada segmento ───────────────────────────────────────────────────
console.log('\n=== Sintetizando segmentos ===\n');

const manifest = [];
const total = segments.length;

// Atualiza função de atribuição de voz para usar as vozes finais (com fallbacks)
function getFinalVoice(seg) {
  const baseVoice = assignVoice(seg);
  
  if (baseVoice === VOICES.NARRATOR_A) return finalVoices.NARRATOR_A;
  if (baseVoice === VOICES.NARRATOR_B) return finalVoices.NARRATOR_B;
  if (baseVoice === VOICES.COMMENTATOR) return finalVoices.COMMENTATOR;
  
  return baseVoice;
}

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const voice = getFinalVoice(seg);
  const outPath = join(AUDIO_DIR, `${seg.id}.wav`);
  
  const roleLabel = seg.type === 'connector' ? 'CONECTIVO' : seg.type.toUpperCase();
  console.log(`[${i + 1}/${total}] ${roleLabel} - ${seg.id}`);
  console.log(`  Voz: ${voice}`);

  if (!existsSync(outPath)) {
    synthesize(seg.textExpanded, voice, outPath);
  } else {
    console.log('  → já existe, pulando TTS');
  }

  const duration = getDuration(outPath);
  manifest.push({ id: seg.id, file: `audio_multivoz/${seg.id}.wav`, duration });
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n✓ Manifest salvo: ${MANIFEST}`);
console.log(`✓ Total de segmentos: ${manifest.length}`);

const totalDuration = manifest.reduce((s, m) => s + m.duration, 0);
console.log(`✓ Duração total estimada: ${(totalDuration / 60).toFixed(1)} min`);

// Exemplos de conectivos gerados
console.log('\n=== Exemplos de conectivos gerados ===');
const connectorExamples = segments.filter(s => s.type === 'connector').slice(0, 10);
connectorExamples.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.id}] "${c.text}"`);
});
