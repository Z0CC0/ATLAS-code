// The full-review workflow run with stand-in agents: what it merges, what the refuters may drop,
// where a finding's line comes from, and the closing line on files read. The script runs inside
// the Workflow runtime, where top-level return is legal, so it is wrapped the way check.mjs
// wraps it. node --test tests/review-full.test.mjs (from code/, or from a built atlas-code)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
// in the source tree review lives under dev/; in a build it is beside the other skills
const skill = fs.existsSync(path.join(root, 'skills', 'atlas-review')) ? path.join(root, 'skills', 'atlas-review') : path.join(root, '..', 'dev', 'skills', 'atlas-review')
const src = fs.readFileSync(path.join(skill, 'workflows', 'review-full.mjs'), 'utf8').replace(/^export const meta/m, 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const script = new AsyncFunction('args', 'agent', 'parallel', 'pipeline', 'phase', 'log', 'budget', 'workflow', src)

// review: what each angle returns, by its label; refute: the verdict for a finding
const run = async (args, review, refute = () => ({ refuted: false, reason: 'holds', located: true })) => {
  const prompts = []
  const agent = async (prompt, opts) => {
    prompts.push({ prompt, label: opts.label })
    if (opts.phase === 'Review') return review(opts.label.slice('review:'.length))
    return refute(prompt, opts.label)
  }
  const parallel = (fns) => Promise.all(fns.map((f) => f()))
  const out = await script(args, agent, parallel, null, () => {}, () => {}, null, null)
  return { out, prompts }
}
const finding = (o) => ({ file: 'a.js', line: 10, tier: 'breaks', what: 'x', fix: 'y', snippet: 'z', subject: 'other', ...o })
const only = (angle, findings, extra = {}) => (key) => ({ findings: key === angle ? findings : [], changed: ['a.js'], read: ['a.js'], ...extra })

test('no target named: staged, unstaged and untracked files are all in the target', async () => {
  const { out, prompts } = await run({}, only('correctness', []))
  assert.equal(out.target, 'git diff HEAD')
  assert.ok(prompts.every((p) => p.prompt.includes('git status --porcelain')), 'every angle lists the untracked files')
  const plain = await run({ target: 'git diff' }, only('correctness', []))
  assert.equal(plain.out.target, 'git diff HEAD', 'a bare `git diff` is the local work too, staged changes included')
  const named = await run({ target: 'gh pr diff 12' }, only('correctness', []))
  assert.ok(!named.prompts.some((p) => p.prompt.includes('git status --porcelain')), 'a named target is reviewed as named')
})

test('the rules folder is passed on, with the CI rules for a target that touches a pipeline file', async () => {
  const { prompts } = await run({ rules: 'C:/x/review/' }, only('correctness', []))
  assert.ok(prompts.every((p) => p.prompt.includes('C:/x/review/method.md') && p.prompt.includes('C:/x/review/ci.md') && p.prompt.includes('.github/workflows/')))
})

test('two defects on one line stay two; one defect from two angles is refuted once', async () => {
  const injection = finding({ what: 'issue title concatenated into the shell command string' })
  const swallowed = finding({ what: 'empty catch block hides the failed write' })
  const twice = await run({}, (key) => ({ findings: key === 'security' ? [injection] : key === 'errors-tests' ? [swallowed] : [], changed: ['a.js'], read: ['a.js'] }))
  assert.equal(twice.out.confirmed.length, 2)
  const same = finding({ what: 'empty catch block hides the failed write to disk' })
  const once = await run({}, (key) => ({ findings: key === 'correctness' ? [swallowed] : key === 'errors-tests' ? [same] : [], changed: ['a.js'], read: ['a.js'] }))
  assert.equal(once.prompts.filter((p) => p.label.startsWith('refute:')).length, 1)
})

test('a refuter drops a bounds or concurrency finding only by naming the guard', async () => {
  const race = finding({ subject: 'concurrency', what: 'two workers both pass the check and insert' })
  const noGuard = await run({}, only('correctness', [race]), () => ({ refuted: true, reason: 'unlikely', located: true }))
  assert.equal(noGuard.out.confirmed.length, 1)
  assert.match(noGuard.out.lines[0], /\[kept: no guard named\]/)
  const guarded = await run({}, only('correctness', [race]), () => ({ refuted: true, reason: 'unique index', located: true, guard: 'db/schema.sql:14' }))
  assert.equal(guarded.out.confirmed.length, 0)
  assert.match(guarded.out.lines.join('\n'), /1 dropped on second look/)
  const plain = await run({}, only('correctness', [finding()]), () => ({ refuted: true, reason: 'caught upstream', located: true }))
  assert.equal(plain.out.confirmed.length, 0, 'other subjects are dropped on the refuter\'s word')
  assert.ok(noGuard.prompts.some((p) => p.label.startsWith('refute:') && /needs `guard`/.test(p.prompt)))
})

test('the snippet decides the line: moved to where it is, dropped when it is nowhere', async () => {
  const f = finding({ snippet: 'items[i + 1]' })
  const moved = await run({}, only('correctness', [f]), (prompt) => {
    assert.ok(prompt.includes('items[i + 1]'), 'the refuter is shown the snippet')
    return { refuted: false, reason: 'holds', located: true, line: 12 }
  })
  assert.equal(moved.out.confirmed[0].line, 12)
  assert.match(moved.out.lines[0], /^a\.js:12 /)
  const missing = await run({}, only('correctness', [f]), () => ({ refuted: false, reason: 'holds', located: false }))
  assert.equal(missing.out.confirmed.length, 0)
})

test('the closing line says how many changed files were read, and names the skipped ones', async () => {
  const changed = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js']
  const big = await run({}, (key) => ({ findings: [], changed, read: key === 'security' ? ['f.js'] : changed.slice(0, 4), skipped: [{ path: 'e.js', reason: 'generated' }] }))
  assert.deepEqual(big.out.lines, ['nothing found', 'read 5/6 files; skipped: e.js (generated)'])
  const small = await run({}, only('correctness', []))
  assert.deepEqual(small.out.lines, ['nothing found'], 'five files or fewer, all read: no closing line')
  const unread = await run({}, () => ({ findings: [], changed: ['a.js', 'b.js'], read: ['a.js'] }))
  assert.equal(unread.out.coverage, 'read 1/2 files; skipped: b.js (no angle read it)')
})

test('the skill text gathers what the workflow gathers', () => {
  const method = fs.readFileSync(path.join(skill, 'review', 'method.md'), 'utf8')
  assert.match(method, /git status --porcelain/)
  const body = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8')
  assert.match(body, /rules: "\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/atlas-review\/review"/)
  assert.match(body, /`ci\.md`/)
})
