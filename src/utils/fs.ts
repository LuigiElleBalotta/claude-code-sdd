import { readFile, mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export async function readFileIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (err) {
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

export async function writeFileEnsuringDir(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function listDirsIfExists(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

/**
 * Finds every file matching `fileName` nested under `rootDir`, e.g. every
 * `tasks.md` under `.kiro/specs`. Cross-platform, dependency-free glob
 * substitute for the one shape this tool actually needs.
 */
export async function findFilesNamed(rootDir: string, fileName: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isNotFound(err)) return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name === fileName) {
        results.push(full);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'ENOENT';
}
