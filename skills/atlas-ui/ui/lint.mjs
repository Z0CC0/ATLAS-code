#!/usr/bin/env node
// ui lint — the checks of polish.md, motion.md and a11y.md that need no judgement, run by a
// script so nobody reads a tree for them. Each finding names the file and line, what was
// found, and the file of this skill that states the rule.
//
//   node lint.mjs <file or folder> [...more] [--json]
//
// It reads and prints; it changes nothing and always exits 0 unless the path is missing (2).
// What it cannot see is everything that needs eyes: hierarchy, rhythm, contrast on a real
// background, whether the motion means anything. A clean run says only that these are absent.
//
// The idea of a deterministic detector with no model behind it after pbakaus/impeccable
// (Apache-2.0), which runs 62 rules of its own. These rules and this code are ours.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = new Set(['.css', '.scss', '.less', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const SKIP = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', '.git', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache']);
const MAX_BYTES = 1024 * 1024;
const MARKUP = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const show = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 80);

// One rule: a name, the file that states it, what to do, and a finder over one file's text.
// A tag of JSX may hold an arrow function: `=>` is not the end of the tag.
const RULES = [
  { id: 'transition-all', see: 'polish.md', fix: 'name the properties that change',
    find: (t) => all(t, /\btransition(?:-property)?\s*:\s*all\b[^;}\n]*|(?<![\w-])transition-all(?![\w-])/g) },
  { id: 'scale-zero', see: 'motion.md', fix: 'enter from about 0.95, never from 0',
    find: (t) => all(t, /\bscale\(\s*0(?:\.0+)?\s*\)|\bscale\s*:\s*0(?:\.0+)?\s*[,}]/g) },
  { id: 'vh-100', see: 'polish.md', fix: 'use svh or dvh: 100vh is taller than a phone screen',
    find: (t) => all(t, /(?<![\w.])100vh\b/g) },
  { id: 'layout-animated', see: 'motion.md', fix: 'animate transform or opacity: these lay the page out on every frame',
    find: (t) => all(t, /\btransition(?:-property)?\s*:[^;}\n]*\b(?:width|height|top|left|right|bottom|margin|padding)\b[^;}\n]*/g) },
  { id: 'loops-forever', see: 'polish.md', fix: 'a pulse, bounce or ping runs while a state lasts, then stops',
    find: (t) => all(t, /\banimation(?:-iteration-count)?\s*:[^;}\n]*\binfinite\b[^;}\n]*|(?<![\w-])animate-(?:pulse|bounce|ping)(?![\w-])/g)
      .filter((m) => !/spin|rotate|progress|load/i.test(m.text)) },
  { id: 'zoom-disabled', see: 'a11y.md', fix: 'zoom is never disabled (1.4.4)',
    find: (t) => all(t, /user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\.0)?(?![\d.])/g) },
  { id: 'img-no-alt', see: 'a11y.md', fix: 'alt says what the image is for; decoration gets alt="" (1.1.1)', markup: true,
    find: (t) => all(t, /<(?:img|Image)\b(?:=>|[^>])*>/g).filter((m) => !/\balt\s*=|\{\s*\.\.\./.test(m.text)) },
  { id: 'click-on-div', see: 'a11y.md', fix: 'a button, or role and tabIndex and a key handler (2.1.1)', markup: true,
    find: (t) => all(t, /<(?:div|span|li|td|p)\b(?:=>|[^>])*?\b(?:onClick|@click|on:click)\b(?:=>|[^>])*>/g).filter((m) => !/\brole\s*=/.test(m.text) || !/tabindex/i.test(m.text)) },
  { id: 'html-no-lang', see: 'a11y.md', fix: 'lang on the document (3.1.1)', markup: true,
    find: (t) => all(t, /<html\b[^>]*>/g).filter((m) => !/\blang\s*=/.test(m.text)) },
  { id: 'heading-skipped', see: 'a11y.md', fix: 'headings in order, without skipping a level', markup: true,
    find: (t) => {
      const out = [];
      let prev = 0;
      for (const m of all(t, /<h([1-6])\b/g)) {
        const level = Number(m.text[2]);
        if (prev && level > prev + 1) out.push({ ...m, text: `h${prev} then h${level}` });
        prev = level;
      }
      return out;
    } },
  { id: 'two-h1', see: 'a11y.md', fix: 'one h1 on a page', markup: true,
    find: (t) => all(t, /<h1\b/g).slice(1).map((m) => ({ ...m, text: 'a second h1' })) },
  { id: 'outline-removed', see: 'a11y.md', fix: 'a focus style of its own in the same file, or the outline stays (2.4.7)',
    find: (t) => (/:focus-visible|:focus\b|focus-visible:|focus:/.test(t) ? [] : all(t, /\boutline\s*:\s*(?:none|0)\b|(?<![\w:-])outline-none(?![\w-])/g)) },
];

function all(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) out.push({ index: m.index, text: m[0] });
  return out;
}

// Comments say what not to do; they are not findings.
function uncomment(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, (c) => ' '.repeat(c.length));
}

/** Findings for a list of `{ path, text }`; the project-level one comes last. */
export function lint(files) {
  const findings = [];
  let animated = 0, reduced = false;
  for (const f of files) {
    const ext = extname(f.path).toLowerCase();
    const text = uncomment(f.text);
    if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|motion-safe:/.test(text)) reduced = true;
    animated += (text.match(/\b(?:transition|animation)\s*:|@keyframes\b|(?<![\w-])animate-[a-z]/g) || []).length;
    for (const rule of RULES) {
      if (rule.markup && !MARKUP.has(ext)) continue;
      for (const m of rule.find(text)) findings.push({ file: f.path, line: lineOf(text, m.index), rule: rule.id, found: show(m.text), fix: rule.fix, see: rule.see });
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  if (animated && !reduced) findings.push({ file: 'project', line: 0, rule: 'no-reduced-motion', found: `${animated} animated declarations, prefers-reduced-motion nowhere`, fix: 'honour reduced motion everywhere, in CSS and in script', see: 'motion.md' });
  return findings;
}

export function report(findings, count, limit = 60) {
  const head = `ui lint: ${count} file${count === 1 ? '' : 's'} read, ${findings.length} finding${findings.length === 1 ? '' : 's'}`;
  if (!findings.length) return `${head}\nnone of the checks a script can make; what needs eyes was not looked at`;
  const lines = findings.slice(0, limit).map((f) => `${f.line ? `${f.file}:${f.line}` : f.file}  ${f.rule}  ${f.found}  → ${f.fix} (${f.see})`);
  if (findings.length > limit) lines.push(`(${findings.length - limit} more, the same kinds; narrow the path)`);
  return [head, ...lines].join('\n');
}

function walk(path, out) {
  const s = statSync(path);
  if (s.isDirectory()) { for (const n of readdirSync(path)) if (!SKIP.has(n)) walk(join(path, n), out); return; }
  if (EXT.has(extname(path).toLowerCase()) && s.size <= MAX_BYTES) out.push(path);
}

// Nothing runs on import: a test that loads this file must not read a tree.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const paths = args.filter((a) => !a.startsWith('--'));
  if (!paths.length || paths.some((p) => !existsSync(p))) {
    console.error('usage: node lint.mjs <file or folder> [...more] [--json]');
    process.exit(2);
  }
  const list = [];
  for (const p of paths) walk(resolve(p), list);
  const files = list.map((p) => ({ path: relative(process.cwd(), p).replace(/\\/g, '/') || p, text: readFileSync(p, 'utf8') }));
  const findings = lint(files);
  process.stdout.write((args.includes('--json') ? JSON.stringify({ files: files.length, findings }, null, 2) : report(findings, files.length)) + '\n');
}
