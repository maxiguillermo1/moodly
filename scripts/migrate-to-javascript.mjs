#!/usr/bin/env node
/**
 * One-shot TypeScript → JavaScript migration for Kairo.
 * Uses the project's TypeScript compiler to strip types while preserving runtime code.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

const ROOT_TS_FILES = ['app.config.ts', 'App.tsx', 'jest.setup.ts'];

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  'ios',
  'android',
  'dist',
  'build',
  '.tmp-expo-export',
  '.tmp-expo-export-all',
  '.tmp-export-test',
  '.tmp-metro-alias-check',
  '.metro-cache',
  '.runtime',
]);

/** @param {string} dir */
function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, out);
      continue;
    }
    if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** @param {string} filePath */
function targetJsPath(filePath) {
  if (filePath.endsWith('.tsx')) return filePath.slice(0, -4) + '.jsx';
  if (filePath.endsWith('.ts')) return filePath.slice(0, -3) + '.js';
  return filePath;
}

/** @param {string} source */
function transpile(source, fileName) {
  const isTsx = fileName.endsWith('.tsx');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      jsx: isTsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      preserveValueImports: false,
    },
    fileName,
    reportDiagnostics: true,
  });

  const errors = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    const msg = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    });
    throw new Error(`Transpile failed for ${fileName}:\n${msg}`);
  }

  let code = result.outputText;
  // Normalize trailing newlines.
  if (!code.endsWith('\n')) code += '\n';
  return code;
}

function collectFiles() {
  const files = walkTsFiles(path.join(ROOT, 'src'));
  for (const rel of ROOT_TS_FILES) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) files.push(full);
  }
  return [...new Set(files)].sort();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = collectFiles();
  console.log(`Found ${files.length} TypeScript files to convert.`);

  const written = [];
  const skippedEmpty = [];

  for (const srcPath of files) {
    const rel = path.relative(ROOT, srcPath);
    const destPath = targetJsPath(srcPath);
    const source = fs.readFileSync(srcPath, 'utf8');

    let code;
    try {
      code = transpile(source, rel);
    } catch (err) {
      console.error(String(err));
      process.exitCode = 1;
      return;
    }

  // Pure type modules may transpile to whitespace only — keep a stub for import graph stability.
    const trimmed = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
    if (!trimmed) {
      code = `/** Types moved to JSDoc — migrated from ${path.basename(srcPath)} */\nexport {};\n`;
      skippedEmpty.push(rel);
    }

    if (dryRun) {
      console.log(`[dry-run] ${rel} → ${path.relative(ROOT, destPath)}`);
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, code, 'utf8');
    written.push({ srcPath, destPath, rel });
  }

  if (dryRun) {
    console.log(`Dry run complete. ${files.length} files would be written.`);
    return;
  }

  // Remove source .ts/.tsx after successful writes.
  for (const { srcPath, destPath, rel } of written) {
    fs.unlinkSync(srcPath);
    console.log(`✓ ${rel} → ${path.relative(ROOT, destPath)}`);
  }

  console.log(`\nConverted ${written.length} files.`);
  if (skippedEmpty.length) {
    console.log(`Stubbed ${skippedEmpty.length} type-only modules: ${skippedEmpty.join(', ')}`);
  }
}

main();
