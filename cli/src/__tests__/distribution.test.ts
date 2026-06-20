// src/__tests__/distribution.test.ts — Issue #11: product.json e branding
import { describe, it, expect } from 'vitest';
import * as fs   from 'node:fs';
import * as path from 'node:path';

// ── Helpers para localizar arquivos na raiz do repo ──────────────

function findRepoFile(relativePath: string): string | null {
  const candidates = [
    path.resolve(import.meta.dirname, '../../../../', relativePath),
    path.resolve(import.meta.dirname, '../../../', relativePath),
    path.resolve(import.meta.dirname, '../../', relativePath),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

function readRepoFile(relativePath: string): string {
  const p = findRepoFile(relativePath);
  if (!p) throw new Error(`Arquivo não encontrado: ${relativePath}`);
  return fs.readFileSync(p, 'utf8');
}

// ════════════════════════════════════════════════════════════════
// product.json
// ════════════════════════════════════════════════════════════════

describe('product.json — existência e estrutura', () => {
  it('arquivo product.json existe na raiz do repositório', () => {
    expect(findRepoFile('product.json')).not.toBeNull();
  });

  it('é um JSON válido', () => {
    const content = readRepoFile('product.json');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('tem nameShort = "IDD IDE"', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.nameShort).toBe('IDD IDE');
  });

  it('tem nameLong mencionando Intent Driven Development', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.nameLong).toContain('Intent Driven Development');
  });

  it('tem applicationName em lowercase sem espaços', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.applicationName).toBe('idd-ide');
    expect(data.applicationName).not.toMatch(/\s/);
  });

  it('tem licenseName MIT', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.licenseName).toBe('MIT');
  });

  it('aponta para o repositório correto no GitHub', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.reportIssueUrl).toContain('github.com/EliezerRosa/idd-ide');
    expect(data.documentationUrl).toContain('github.com/EliezerRosa/idd-ide');
  });
});

describe('product.json — marketplace de extensões', () => {
  it('usa Open VSX Registry (não Microsoft Marketplace)', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.extensionsGallery.serviceUrl).toContain('open-vsx.org');
    expect(data.extensionsGallery.serviceUrl).not.toContain('marketplace.visualstudio.com');
  });

  it('tem itemUrl do Open VSX configurado', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.extensionsGallery.itemUrl).toContain('open-vsx.org');
  });
});

describe('product.json — extensão idd-core built-in', () => {
  it('lista idd-core em builtInExtensions', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.builtInExtensions).toBeInstanceOf(Array);
    expect(data.builtInExtensions.some((e: any) => e.name === 'idd-ide.idd-core')).toBe(true);
  });

  it('builtInExtension tem repo apontando para o projeto', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    const ext   = data.builtInExtensions.find((e: any) => e.name === 'idd-ide.idd-core');
    expect(ext.repo).toContain('github.com/EliezerRosa/idd-ide');
  });
});

describe('product.json — privacidade e telemetria', () => {
  it('showTelemetryOptOut é true', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.showTelemetryOptOut).toBe(true);
  });

  it('telemetryOptOutUrl está definida', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.telemetryOptOutUrl).toBeTruthy();
  });
});

describe('product.json — cores da marca', () => {
  it('tem objeto colors.brand com as cores principais', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.colors).toBeDefined();
    expect(data.colors.brand).toBeDefined();
  });

  it('cor primary é o roxo IDD (#534AB7)', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.colors.brand.primary).toBe('#534AB7');
  });

  it('cores de status (ok/warn/drift) estão definidas', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.colors.brand.ok).toBeTruthy();
    expect(data.colors.brand.warn).toBeTruthy();
    expect(data.colors.brand.drift).toBeTruthy();
  });
});

describe('product.json — ícones referenciados', () => {
  it('tem campo icons.application com svg', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.icons.application.svg).toBeTruthy();
  });

  it('tem campo icons.fileIcon.intentYaml', () => {
    const data = JSON.parse(readRepoFile('product.json'));
    expect(data.icons.fileIcon.intentYaml).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════
// Ícones SVG
// ════════════════════════════════════════════════════════════════

describe('Ícones — existência e validade', () => {
  it('idd-icon.svg existe', () => {
    expect(findRepoFile('resources/idd/idd-icon.svg')).not.toBeNull();
  });

  it('idd-icon.svg é XML/SVG bem formado', () => {
    const content = readRepoFile('resources/idd/idd-icon.svg');
    expect(content).toContain('<svg');
    expect(content).toContain('</svg>');
    expect(content).toMatch(/viewBox="[\d\s]+"/);
  });

  it('idd-icon.svg usa as cores da marca (#534AB7 ou gradiente)', () => {
    const content = readRepoFile('resources/idd/idd-icon.svg');
    expect(content).toMatch(/#534AB7|#7F77DD/i);
  });

  it('file-icon-intent.svg existe', () => {
    expect(findRepoFile('resources/idd/file-icon-intent.svg')).not.toBeNull();
  });

  it('file-icon-intent.svg é XML/SVG bem formado', () => {
    const content = readRepoFile('resources/idd/file-icon-intent.svg');
    expect(content).toContain('<svg');
    expect(content).toContain('</svg>');
  });
});

// ════════════════════════════════════════════════════════════════
// Tema IDD Dark
// ════════════════════════════════════════════════════════════════

describe('Tema IDD Dark — existência e estrutura', () => {
  const themePath = 'extensions/idd-core/themes/idd-dark-theme.json';

  it('arquivo de tema existe', () => {
    expect(findRepoFile(themePath)).not.toBeNull();
  });

  it('é JSON válido', () => {
    expect(() => JSON.parse(readRepoFile(themePath))).not.toThrow();
  });

  it('tem name = "IDD Dark"', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    expect(theme.name).toBe('IDD Dark');
  });

  it('tem type = "dark"', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    expect(theme.type).toBe('dark');
  });

  it('define editor.background', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    expect(theme.colors['editor.background']).toBeTruthy();
  });

  it('usa a cor primary da marca em algum lugar (statusBar ou button)', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    const allColors = JSON.stringify(theme.colors);
    expect(allColors).toContain('#534AB7');
  });

  it('tem tokenColors definidos', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    expect(theme.tokenColors).toBeInstanceOf(Array);
    expect(theme.tokenColors.length).toBeGreaterThan(0);
  });

  it('define cores de diff (inserted/removed)', () => {
    const theme = JSON.parse(readRepoFile(themePath));
    expect(theme.colors['diffEditor.insertedTextBackground']).toBeTruthy();
    expect(theme.colors['diffEditor.removedTextBackground']).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════
// Extensão idd-core — package.json com branding
// ════════════════════════════════════════════════════════════════

describe('extensions/idd-core/package.json — branding', () => {
  const pkgPath = 'extensions/idd-core/package.json';

  it('tem campo repository apontando para o GitHub', () => {
    const pkg = JSON.parse(readRepoFile(pkgPath));
    expect(pkg.repository?.url).toContain('github.com/EliezerRosa/idd-ide');
  });

  it('tem campo license = MIT', () => {
    const pkg = JSON.parse(readRepoFile(pkgPath));
    expect(pkg.license).toBe('MIT');
  });

  it('tem galleryBanner com cor da marca', () => {
    const pkg = JSON.parse(readRepoFile(pkgPath));
    expect(pkg.galleryBanner?.color).toBe('#534AB7');
  });

  it('contributes.themes inclui "IDD Dark"', () => {
    const pkg = JSON.parse(readRepoFile(pkgPath));
    const themes = pkg.contributes?.themes ?? [];
    expect(themes.some((t: any) => t.label === 'IDD Dark')).toBe(true);
  });

  it('tema apontado existe no caminho relativo correto', () => {
    const pkg    = JSON.parse(readRepoFile(pkgPath));
    const theme  = pkg.contributes.themes.find((t: any) => t.label === 'IDD Dark');
    const themePath = 'extensions/idd-core/' + theme.path.replace('./', '');
    expect(findRepoFile(themePath)).not.toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// scripts/build.sh
// ════════════════════════════════════════════════════════════════

describe('scripts/build.sh — existência e estrutura', () => {
  it('arquivo build.sh existe', () => {
    expect(findRepoFile('scripts/build.sh')).not.toBeNull();
  });

  it('tem shebang bash', () => {
    const content = readRepoFile('scripts/build.sh');
    expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  it('suporta as 3 plataformas: linux, darwin, win32', () => {
    const content = readRepoFile('scripts/build.sh');
    expect(content).toContain('linux');
    expect(content).toContain('darwin');
    expect(content).toContain('win32');
  });

  it('compila o CLI antes de empacotar', () => {
    const content = readRepoFile('scripts/build.sh');
    expect(content).toMatch(/npm run build/);
  });

  it('compila a extensão idd-core', () => {
    const content = readRepoFile('scripts/build.sh');
    expect(content).toMatch(/npm run compile/);
  });

  it('usa set -euo pipefail (fail-fast)', () => {
    const content = readRepoFile('scripts/build.sh');
    expect(content).toContain('set -euo pipefail');
  });
});

// ════════════════════════════════════════════════════════════════
// docs/DISTRIBUTION.md
// ════════════════════════════════════════════════════════════════

describe('docs/DISTRIBUTION.md', () => {
  it('arquivo existe', () => {
    expect(findRepoFile('docs/DISTRIBUTION.md')).not.toBeNull();
  });

  it('menciona Open VSX Registry', () => {
    const content = readRepoFile('docs/DISTRIBUTION.md');
    expect(content).toContain('Open VSX');
  });

  it('documenta as cores da marca', () => {
    const content = readRepoFile('docs/DISTRIBUTION.md');
    expect(content).toContain('#534AB7');
  });

  it('explica o processo de build com scripts/build.sh', () => {
    const content = readRepoFile('docs/DISTRIBUTION.md');
    expect(content).toContain('build.sh');
  });

  it('documenta publicação via GitHub Releases', () => {
    const content = readRepoFile('docs/DISTRIBUTION.md');
    expect(content).toMatch(/GitHub Releases?/i);
  });
});
