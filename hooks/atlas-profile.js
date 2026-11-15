#!/usr/bin/env node
// atlas-profile — SessionStart, atlas-code only. One line naming what this repository has
// (tests, an interface, a pipeline, docs, a changelog) and the skill that holds the rules for
// each. A request made in plain words, "add tests for this", is otherwise done without the
// skill's rules: the model only sees a list of descriptions, and the work looks ordinary.
//
// Printed only when a dial is on: a plugin that is off says nothing. Read from the project
// root with a handful of stat calls; no file is opened but package.json.
//
// The idea of a profile of the repository at session start after vercel/vercel-plugin
// (Apache-2.0), which sets "likely skill" hints from config files and dependencies.

'use strict';

const fs = require('fs');
const path = require('path');
// In a built plugin the config sits beside this file; in the source tree it is in the base hooks.
const cfg = (() => { try { return require('./atlas-config'); } catch (e) { return require('../../hooks/atlas-config'); } })();

const has = (root, ...names) => names.some((n) => fs.existsSync(path.join(root, n)));

/** What the repository at `root` has, as `[[what, skill]]`, in a fixed order. */
function profile(root) {
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch (e) { pkg = null; }
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const out = [];
  if (has(root, 'test', 'tests', '__tests__', 'spec', 'pytest.ini', 'jest.config.js', 'jest.config.ts', 'vitest.config.ts', 'vitest.config.js', 'playwright.config.ts') ||
    (pkg && pkg.scripts && pkg.scripts.test && !/no test specified/.test(pkg.scripts.test))) out.push(['tests', 'atlas-test']);
  if (['react', 'vue', 'svelte', 'next', 'nuxt', 'astro', 'solid-js', '@angular/core', 'preact'].some((d) => d in deps) ||
    has(root, 'index.html', 'src/index.html', 'src/App.tsx', 'src/App.jsx', 'src/App.vue', 'tailwind.config.js', 'tailwind.config.ts')) out.push(['an interface', 'atlas-ui']);
  if (has(root, '.github/workflows', '.gitlab-ci.yml', 'Dockerfile', 'docker-compose.yml', '.circleci', 'Jenkinsfile')) out.push(['a pipeline', 'atlas-ship']);
  if (has(root, 'docs', 'doc')) out.push(['docs', 'atlas-docs']);
  if (has(root, 'CHANGELOG.md', 'CHANGES.md', 'HISTORY.md')) out.push(['a changelog', 'atlas-changelog']);
  return out;
}

function line(found) {
  if (!found.length) return '';
  return '[ATLAS] This repository has ' + found.map(([w]) => w).join(', ') + '. Work on one of them goes through its skill, loaded before starting: ' +
    found.map(([w, s]) => `${w.replace(/^an? /, '')} \`${s}\``).join(', ') + '.';
}

function main() {
  let input = {};
  try { if (!process.stdin.isTTY) input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { input = {}; }
  cfg.setProject(input.cwd);
  const state = cfg.readState();
  if (!state || cfg.isAllOff(state)) return;
  process.stdout.write(line(profile(cfg.projectRoot())));
}

// ATLAS_SKIP_HOOKS=name,name (or `all`) makes a hook do nothing for one run: for a bench that
// measures one hook without the others, and for finding which hook is behind a problem.
if (require.main === module && !/(?:^|[,\s])(?:all|profile)(?:[,\s]|$)/i.test(process.env.ATLAS_SKIP_HOOKS || '')) { try { main(); } catch (e) { /* never worth a session */ } }

module.exports = { profile, line };
