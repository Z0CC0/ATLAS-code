// The profile of the repository at session start: what it names, when it is silent.
// node --test tests/profile.test.mjs (from code/)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const hookFile = path.join(here, '..', 'hooks', 'atlas-profile.js')
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-profile-cfg-'))
process.env.CLAUDE_CONFIG_DIR = SANDBOX
const { profile, line } = require(hookFile)
const cfg = (() => { try { return require(path.join(here, '..', 'hooks', 'atlas-config.js')) } catch { return require(path.join(here, '..', '..', 'hooks', 'atlas-config.js')) } })()

function repo(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-profile-'))
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, name)), { recursive: true })
    if (text === null) fs.mkdirSync(path.join(d, name), { recursive: true }); else fs.writeFileSync(path.join(d, name), text)
  }
  return d
}

test('what a repository has, each with its skill, in a fixed order', () => {
  const d = repo({ 'tests': null, '.github/workflows': null, 'docs': null, 'CHANGELOG.md': '', 'package.json': JSON.stringify({ dependencies: { react: '19' } }) })
  assert.deepEqual(profile(d), [['tests', 'atlas-test'], ['an interface', 'atlas-ui'], ['a pipeline', 'atlas-ship'], ['docs', 'atlas-docs'], ['a changelog', 'atlas-changelog']])
  assert.equal(line(profile(d)), '[ATLAS] This repository has tests, an interface, a pipeline, docs, a changelog. Work on one of them goes through its skill, loaded before starting: tests `atlas-test`, interface `atlas-ui`, pipeline `atlas-ship`, docs `atlas-docs`, changelog `atlas-changelog`.')
})

test('a test script counts, the placeholder npm writes does not', () => {
  assert.deepEqual(profile(repo({ 'package.json': JSON.stringify({ scripts: { test: 'vitest run' } }) })), [['tests', 'atlas-test']])
  assert.deepEqual(profile(repo({ 'package.json': JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }) })), [])
})

test('nothing found, a folder that is not there, a broken package.json: nothing said', () => {
  assert.equal(line(profile(repo({ 'README.md': 'x' }))), '')
  assert.equal(line(profile(path.join(os.tmpdir(), 'atlas-profile-nope'))), '')
  assert.deepEqual(profile(repo({ 'package.json': '{ broken', 'Dockerfile': 'FROM node' })), [['a pipeline', 'atlas-ship']])
})

const run = (cwd, skip = '') => execFileSync(process.execPath, [hookFile], { input: JSON.stringify({ cwd, session_id: 's', source: 'startup' }), encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: SANDBOX, ATLAS_SKIP_HOOKS: skip } })

test('the hook is silent while the dials are off, and speaks once one is on', () => {
  const d = repo({ 'tests': null, '.git': null })
  assert.equal(run(d), '')
  cfg.markInstalled(); cfg.setProject(d); cfg.writeState({ level: 'low', rigour: 'off', check: 'off', silent: 'off' })
  assert.match(run(d), /^\[ATLAS\] This repository has tests\. .*tests `atlas-test`\.$/)
  assert.match(run(path.join(d, 'tests')), /atlas-test/, 'a subfolder is the same project')
  assert.equal(run(d, 'profile'), '')
  cfg.writeState({ level: 'off', rigour: 'off', check: 'off', silent: 'off' })
  assert.equal(run(d), '')
})

test('the line stays short: it is paid for in every session of that repository', () => {
  const all = line([['tests', 'atlas-test'], ['an interface', 'atlas-ui'], ['a pipeline', 'atlas-ship'], ['docs', 'atlas-docs'], ['a changelog', 'atlas-changelog']])
  assert.ok(all.length < 330, String(all.length))
})
