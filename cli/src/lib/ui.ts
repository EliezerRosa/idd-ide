// src/lib/ui.ts — saída formatada para o terminal IDD CLI

export const RESET  = '\x1b[0m';
export const BOLD   = '\x1b[1m';
export const DIM    = '\x1b[2m';

export const RED    = '\x1b[31m';
export const GREEN  = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const BLUE   = '\x1b[34m';
export const PURPLE = '\x1b[35m';
export const CYAN   = '\x1b[36m';
export const WHITE  = '\x1b[37m';
export const GRAY   = '\x1b[90m';

// Ícones de status
export const ICONS = {
  ok:      `${GREEN}✓${RESET}`,
  drift:   `${RED}✗${RESET}`,
  warn:    `${YELLOW}⚠${RESET}`,
  orphan:  `${GRAY}○${RESET}`,
  info:    `${BLUE}ℹ${RESET}`,
  gen:     `${PURPLE}⚡${RESET}`,
  store:   `${CYAN}◈${RESET}`,
  run:     `${CYAN}▶${RESET}`,
};

export function header(title: string): void {
  const line = '─'.repeat(52);
  console.log(`\n${BOLD}${PURPLE}⬡ IDD${RESET}  ${BOLD}${title}${RESET}`);
  console.log(`${GRAY}${line}${RESET}`);
}

export function subHeader(title: string): void {
  console.log(`\n${BOLD}${BLUE}  ${title}${RESET}`);
}

export function success(msg: string): void {
  console.log(`  ${ICONS.ok}  ${msg}`);
}

export function error(msg: string): void {
  console.error(`  ${ICONS.drift}  ${RED}${msg}${RESET}`);
}

export function warn(msg: string): void {
  console.log(`  ${ICONS.warn}  ${YELLOW}${msg}${RESET}`);
}

export function info(msg: string): void {
  console.log(`  ${ICONS.info}  ${GRAY}${msg}${RESET}`);
}

export function row(label: string, value: string, color = WHITE): void {
  const padded = label.padEnd(22);
  console.log(`  ${GRAY}${padded}${RESET}${color}${value}${RESET}`);
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'ok':       return `${GREEN}${BOLD}ok${RESET}`;
    case 'drift':    return `${RED}${BOLD}drift${RESET}`;
    case 'warn':     return `${YELLOW}${BOLD}aviso${RESET}`;
    case 'orphan':   return `${GRAY}${BOLD}órfã${RESET}`;
    default:         return `${GRAY}${status}${RESET}`;
  }
}

export function spinner(label: string): { stop: (ok?: boolean) => void } {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  const iv = setInterval(() => {
    process.stdout.write(`\r  ${CYAN}${frames[i++ % frames.length]}${RESET}  ${label}`);
  }, 80);
  return {
    stop(ok = true) {
      clearInterval(iv);
      process.stdout.write(`\r  ${ok ? ICONS.ok : ICONS.drift}  ${label}\n`);
    }
  };
}

export function table(
  headers: string[],
  rows: string[][],
  colors: string[] = []
): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').replace(/\x1b\[[0-9;]*m/g, '').length))
  );
  const divider = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const fmt = (cells: string[], isHeader = false) =>
    cells.map((c, i) => {
      const plain  = c.replace(/\x1b\[[0-9;]*m/g, '');
      const pad    = ' '.repeat(widths[i] - plain.length);
      const color  = isHeader ? BOLD : (colors[i] ?? '');
      return ` ${color}${c}${RESET}${pad} `;
    }).join('│');

  console.log(`  ┌${widths.map(w=>'─'.repeat(w+2)).join('┬')}┐`);
  console.log(`  │${fmt(headers, true)}│`);
  console.log(`  ├${divider}┤`);
  rows.forEach(r => console.log(`  │${fmt(r)}│`));
  console.log(`  └${widths.map(w=>'─'.repeat(w+2)).join('┴')}┘`);
}

export function footer(msg = ''): void {
  console.log(`\n${GRAY}${'─'.repeat(52)}${RESET}`);
  if (msg) console.log(`  ${GRAY}${msg}${RESET}`);
  console.log('');
}
