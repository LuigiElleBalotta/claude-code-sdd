export declare function readFileIfExists(filePath: string): Promise<string | undefined>;
export declare function pathExists(targetPath: string): Promise<boolean>;
export declare function writeFileEnsuringDir(filePath: string, content: string): Promise<void>;
export declare function listDirsIfExists(dirPath: string): Promise<string[]>;
/**
 * Finds every file matching `fileName` nested under `rootDir`, e.g. every
 * `tasks.md` under `.kiro/specs`. Cross-platform, dependency-free glob
 * substitute for the one shape this tool actually needs.
 */
export declare function findFilesNamed(rootDir: string, fileName: string): Promise<string[]>;
//# sourceMappingURL=fs.d.ts.map