// The interface checks a script can make: each rule finds what it names, and nothing in a
// comment or in code that is right. node --test tests/ui-lint.test.mjs (from code/)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const candidates = [path.join(here, '..', 'skills', 'atlas-ui', 'ui', 'lint.mjs')]
const tool = candidates.find((p) => fs.existsSync(p))
const { lint, report } = await import(pathToFileURL(tool).href)

const rules = (files) => lint(files).map((f) => f.rule)
const css = (text) => [{ path: 'a.css', text }]
const jsx = (text) => [{ path: 'a.tsx', text }]

test('importing the tool reads no tree', () => { assert.equal(typeof lint, 'function') })

test('movement: transition all, an entrance from nothing, layout animated, a loop that never ends', () => {
  const found = lint(css(`
@media (prefers-reduced-motion: reduce) { * { animation: none } }
.a { transition: all 0.2s ease; }
.b { transform: scale(0); }
.c { transition: width 0.3s, opacity 0.3s; }
.d { animation: pulse 2s infinite; }
.e { height: 100vh; }
`))
  assert.deepEqual(found.map((f) => [f.line, f.rule]), [[3, 'transition-all'], [4, 'scale-zero'], [5, 'layout-animated'], [6, 'loops-forever'], [7, 'vh-100']])
  assert.match(found[0].fix, /name the properties/)
  assert.equal(found[0].see, 'polish.md')
})

test('what is right is left alone', () => {
  assert.deepEqual(rules(css(`
@media (prefers-reduced-motion: reduce) { .x { transition: none } }
.a { transition: opacity 0.2s ease-out, transform 0.2s ease-out; }
.b { transform: scale(0.95); }
.c { height: 100dvh; min-height: 1100vh; }
.d { animation: spin 1s linear infinite; }
.e:focus-visible { outline: 2px solid; } .f { outline: none; }
`)), [])
})

test('a comment is not a finding', () => {
  assert.deepEqual(rules(css(`/* never transition: all, never scale(0) */\n// transition: all\n.a { color: red }`)), [])
  assert.deepEqual(rules(jsx(`{/* <img src="x"> */}\n<img src="a.png" alt="A chart" />`)), [])
})

test('the outline removed with no focus style of its own in the file', () => {
  assert.deepEqual(rules(css(`.a { outline: none; }`)), ['outline-removed'])
  assert.deepEqual(rules(jsx(`<button className="outline-none">x</button>`)), ['outline-removed'])
  assert.deepEqual(rules(jsx(`<button className="outline-none focus-visible:ring-2">x</button>`)), [])
})

test('markup: an image with no alt, a click on a div, headings out of order, a second h1, no lang', () => {
  const found = lint([{ path: 'page.html', text: `<html>
<h1>One</h1>
<h3>Three</h3>
<img src="a.png">
<img src="b.png" alt="">
<div onClick="go()">go</div>
<div role="button" tabindex="0" onClick="go()">go</div>
<h1>Again</h1>
<meta name="viewport" content="width=device-width, user-scalable=no">
` }])
  assert.deepEqual(found.map((f) => [f.line, f.rule]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])),
    [[1, 'html-no-lang'], [3, 'heading-skipped'], [4, 'img-no-alt'], [6, 'click-on-div'], [8, 'two-h1'], [9, 'zoom-disabled']])
  assert.equal(found.find((f) => f.rule === 'heading-skipped').found, 'h1 then h3')
})

test('an arrow function inside a tag does not end the tag', () => {
  assert.deepEqual(rules(jsx(`<div onClick={() => go()} role="button" tabIndex={0}>x</div>`)), [])
  assert.deepEqual(rules(jsx(`<div className="c" onClick={() => go()}>x</div>`)), ['click-on-div'])
  assert.deepEqual(rules(jsx(`<img onLoad={() => done()} alt="A chart" src={a} />`)), [])
})

test('markup rules are not run on a stylesheet, and a spread may carry the alt', () => {
  assert.deepEqual(rules(css(`/* x */ .a::after { content: "<img src=x>"; }`)), [])
  assert.deepEqual(rules(jsx(`<Image {...props} />\n<Image src={a} />`)), ['img-no-alt'])
})

test('motion with reduced motion nowhere in the project is one finding for the project', () => {
  const found = lint([{ path: 'a.css', text: '.a { transition: opacity .2s }' }, { path: 'b.css', text: '@keyframes k { to { opacity: 1 } }' }])
  assert.deepEqual(found.map((f) => [f.file, f.rule]), [['project', 'no-reduced-motion']])
  assert.match(found[0].found, /2 animated declarations/)
  assert.deepEqual(rules([{ path: 'a.css', text: '.a { transition: opacity .2s }' }, { path: 'b.tsx', text: 'const r = useReducedMotion()' }]), [])
  assert.deepEqual(rules(css('.a { color: red }')), [])
})

test('the report: one line per finding with the rule and where it is stated, and an honest clean run', () => {
  const text = report(lint(css('@media (prefers-reduced-motion: reduce) {}\n.a { transition: all .2s }')), 1)
  assert.equal(text, 'ui lint: 1 file read, 1 finding\na.css:2  transition-all  transition: all .2s  → name the properties that change (polish.md)')
  assert.match(report([], 3), /^ui lint: 3 files read, 0 findings\nnone of the checks a script can make; what needs eyes was not looked at$/)
  const many = Array.from({ length: 70 }, (_, i) => ({ file: 'a.css', line: i + 1, rule: 'vh-100', found: '100vh', fix: 'f', see: 'polish.md' }))
  assert.match(report(many, 1), /\(10 more, the same kinds; narrow the path\)$/)
})

test('run on a folder: it walks, skips what is built, and prints', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-ui-lint-'))
  fs.mkdirSync(path.join(dir, 'src')); fs.mkdirSync(path.join(dir, 'node_modules', 'x'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'src', 'a.css'), '.a { transition: all 1s }\n@media (prefers-reduced-motion: reduce) {}')
  fs.writeFileSync(path.join(dir, 'node_modules', 'x', 'b.css'), '.b { transition: all 1s }')
  fs.writeFileSync(path.join(dir, 'src', 'notes.md'), 'transition: all')
  const r = spawnSync(process.execPath, [tool, dir], { encoding: 'utf8', cwd: dir })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^ui lint: 1 file read, 1 finding\nsrc\/a\.css:1  transition-all/)
  const j = JSON.parse(spawnSync(process.execPath, [tool, dir, '--json'], { encoding: 'utf8', cwd: dir }).stdout)
  assert.equal(j.files, 1); assert.equal(j.findings[0].rule, 'transition-all')
  assert.equal(spawnSync(process.execPath, [tool, path.join(dir, 'nope')], { encoding: 'utf8' }).status, 2)
})
