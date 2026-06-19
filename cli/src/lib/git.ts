// src/lib/git.ts — Issue #10: helpers de git para blame
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GitIdentity {
  name:  string;
  email: string;
}

export interface GitCommitInfo {
  hash:    string;
  author:  string;
  email:   string;
  date:    string;
  message: string;
}

/** Returns true if cwd/root is inside a git repository. */
export function isGitRepo(root: string): boolean {
  return fs.existsSync(path.join(root, '.git'));
}

/** Local git identity configured for commits (user.name / user.email). */
export function getCurrentGitIdentity(root: string): GitIdentity | null {
  if (!isGitRepo(root)) return null;
  try {
    const name  = execSync('git config user.name',  { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    const email = execSync('git config user.email', { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (!name && !email) return null;
    return { name: name || 'desconhecido', email: email || '' };
  } catch {
    return null;
  }
}

/** Current HEAD commit short hash, or null if not in a repo / no commits yet. */
export function getCurrentCommit(root: string): string | null {
  if (!isGitRepo(root)) return null;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

/** Git log for a specific file — most recent commits first. */
export function getFileHistory(root: string, filePath: string, limit = 20): GitCommitInfo[] {
  if (!isGitRepo(root)) return [];
  try {
    const sep = '\x1f'; // unit separator, unlikely to collide
    const fmt = `%H${sep}%an${sep}%ae${sep}%aI${sep}%s`;
    const out = execSync(
      `git log --max-count=${limit} --pretty=format:"${fmt}" -- "${filePath}"`,
      { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] }
    ).toString();

    if (!out.trim()) return [];

    return out.split('\n').filter(Boolean).map(line => {
      const [hash, author, email, date, message] = line.split(sep);
      return { hash: hash?.slice(0, 8) ?? '', author: author ?? '', email: email ?? '', date: date ?? '', message: message ?? '' };
    });
  } catch {
    return [];
  }
}

/** Author of the very first commit that touched a file (i.e. who created it). */
export function getFileCreator(root: string, filePath: string): GitCommitInfo | null {
  const history = getFileHistory(root, filePath, 1000);
  return history.length > 0 ? history[history.length - 1] : null;
}

/** Most recent commit that touched a file. */
export function getFileLastModifier(root: string, filePath: string): GitCommitInfo | null {
  const history = getFileHistory(root, filePath, 1);
  return history[0] ?? null;
}
