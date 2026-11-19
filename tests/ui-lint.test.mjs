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
  assert.deepEqual(rules(jsx(`{/* <img src="x"> */}\n<img src="a.png" alt="A chart" width="8" height="8" />`)), [])
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
<img src="a.png" width="8" height="8">
<img src="b.png" alt="" width="8" height="8">
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
  assert.deepEqual(rules(jsx(`<img onLoad={() => done()} alt="A chart" src={a} width={8} height={8} />`)), [])
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

// The tells of a generated page: each rule fires on its case and stays quiet on the right one.
const only = (id, files) => lint(files).filter((f) => f.rule === id)
const html = (text) => [{ path: 'page.html', text: `<html lang="en">${text}` }]

test('gradient text, a hosted font, a z-index above the layers, 100vw', () => {
  assert.equal(only('gradient-text', css('.h { background: linear-gradient(red, blue); -webkit-background-clip: text; }')).length, 1)
  assert.equal(only('gradient-text', jsx('<h1 className="bg-clip-text text-transparent">x</h1>')).length, 1)
  assert.equal(only('gradient-text', css('.h { background-clip: padding-box; color: #111; }')).length, 0)
  assert.equal(only('hosted-font', css('@import url("https://fonts.googleapis.com/css2?family=Inter");')).length, 1)
  assert.equal(only('hosted-font', html('<link rel="stylesheet" href="https://use.typekit.net/abc.css">')).length, 1)
  assert.equal(only('hosted-font', css('@font-face { font-family: Brand; src: url(/fonts/brand.woff2) format("woff2"); }')).length, 0)
  assert.deepEqual(only('z-index-raw', css('.a { z-index: 9999 } .b { z-index: 400 } .c { z-index: 2 }')).map((f) => f.found), ['z-index: 9999'])
  assert.equal(only('z-index-raw', jsx('<div className="z-[1000]" style={{ zIndex: 50 }} />')).length, 1)
  assert.equal(only('vw-100', css('.band { width: 100vw; }')).length, 1)
  assert.equal(only('vw-100', jsx('<div className="w-screen" />')).length, 1)
  assert.equal(only('vw-100', css('.band { width: 100%; max-width: 90vw; }')).length, 0)
})

test('an image with no size, a bottom bar with no safe area, a small field', () => {
  assert.equal(only('img-no-size', html('<img src="a.png" alt="A">')).length, 1)
  assert.equal(only('img-no-size', html('<img src="a.png" alt="A" width="640" height="360">')).length, 0)
  assert.equal(only('img-no-size', jsx('<img src={a} alt="A" className="aspect-video w-full" />')).length, 0)
  assert.equal(only('img-no-size', css('.a::after { content: "<img src=x>"; }')).length, 0)
  assert.equal(only('img-no-size', html(`<img src="data:image/svg+xml,%3Csvg width='2' height='1'%3E" alt="A">`)).length, 1)
  assert.equal(only('gradient-text', css('.h { -webkit-background-clip: text; background-clip: text; }')).length, 1)
  assert.equal(only('bottom-bar-unsafe', css('.tabs { position: fixed; bottom: 0; left: 0; right: 0; }')).length, 1)
  assert.equal(only('bottom-bar-unsafe', css('@media (max-width: 600px) { .tabs { position: fixed; bottom: 0; } }')).length, 1)
  assert.equal(only('bottom-bar-unsafe', css('.tabs { position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom); }')).length, 0)
  assert.equal(only('bottom-bar-unsafe', jsx('<nav className="fixed inset-x-0 bottom-0 h-16">x</nav>')).length, 1)
  assert.equal(only('bottom-bar-unsafe', jsx('<nav className="fixed bottom-0 pb-[env(safe-area-inset-bottom)]">x</nav>')).length, 0)
  assert.equal(only('bottom-bar-unsafe', html('<style>.bar { position: fixed; bottom: 0 }</style><div class="bar"></div>')).length, 1)
  assert.equal(only('input-small-text', css('input, select { font-size: 14px; }')).length, 1)
  assert.equal(only('input-small-text', css('.form input { font-size: 0.875rem; }')).length, 1)
  assert.equal(only('input-small-text', css('input { font-size: 16px; } .label { font-size: 12px; }')).length, 0)
  assert.equal(only('input-small-text', jsx('<input className="text-sm border" />')).length, 1)
  assert.equal(only('input-small-text', jsx('<input className="text-base border" />')).length, 0)
})

test('glow, a hard offset shadow, a side stripe, a border with a shadow, a marquee, section numbers', () => {
  assert.equal(only('glow-shadow', css('.hero { box-shadow: 0 0 40px rgba(124, 58, 237, 0.6); }')).length, 1)
  assert.equal(only('glow-shadow', css('.card { box-shadow: 0 0 24px #7c3aed; }')).length, 1)
  assert.equal(only('glow-shadow', css('.card { box-shadow: 0 0 24px rgba(0, 0, 0, 0.12); } .b { box-shadow: 0 4px 12px #7c3aed55; }')).length, 0)
  assert.equal(only('offset-shadow', css('.btn { box-shadow: 4px 4px 0 #000; }')).length, 1)
  assert.equal(only('offset-shadow', css('.btn { box-shadow: 0 2px 8px rgba(0,0,0,.1); } .c { box-shadow: 4px 4px 0.5rem #0002; }')).length, 0)
  assert.equal(only('side-stripe', css('.alert { border-left: 4px solid var(--accent); }')).length, 1)
  assert.equal(only('side-stripe', jsx('<div className="border-l-4 border-blue-500">x</div>')).length, 1)
  assert.equal(only('side-stripe', css('.row { border-left: 1px solid #ddd; }')).length, 0)
  assert.equal(only('border-and-shadow', css('.card { border: 1px solid #e5e5e5; box-shadow: 0 8px 24px rgba(0,0,0,.08); }')).length, 1)
  assert.equal(only('border-and-shadow', jsx('<div className="rounded-xl border shadow-lg">x</div>')).length, 1)
  assert.equal(only('border-and-shadow', css('.card { border: 1px solid #e5e5e5; } .raised { box-shadow: 0 8px 24px rgba(0,0,0,.08); }')).length, 0)
  assert.equal(only('border-and-shadow', css('.f:focus-visible { border: 1px solid blue; box-shadow: 0 0 0 3px #00f4; }')).length, 0)
  assert.equal(only('marquee', css('@keyframes marquee { to { transform: translateX(-50%) } }')).length, 1)
  assert.equal(only('marquee', css('@keyframes slide { to { transform: translateX(-50%) } }')).length, 0)
  assert.equal(only('section-numbers', html('<span>01</span><h2>A</h2><span>02</span><h2>B</h2><span>03</span><h2>C</h2>')).length, 1)
  assert.equal(only('section-numbers', html('<span>01</span><h2>A</h2><span>02</span><h2>B</h2>')).length, 0)
})

test('project tallies: more sizes, faces, radii, shadows and accents than taste.md allows', () => {
  const sizes = css([12, 13, 14, 15, 16, 18, 20].map((n, i) => `.s${i} { font-size: ${n}px }`).join('\n'))
  assert.match(only('too-many-sizes', sizes)[0].found, /^7 \(limit 6\)/)
  assert.equal(lint(sizes).find((f) => f.rule === 'too-many-sizes').file, 'project')
  assert.equal(only('too-many-sizes', css('.a { font-size: 12px } .b { font-size: 0.75rem } .c { font-size: 16px } :root { --text-primary: #111 }')).length, 0)
  assert.equal(only('too-many-families', css('.a { font-family: Inter, sans-serif } .b { font-family: "Playfair Display", serif } .c { font-family: Poppins }')).length, 1)
  assert.equal(only('too-many-families', css('.a { font-family: Inter, system-ui, sans-serif } code { font-family: "JetBrains Mono", monospace } .b { font-family: inherit }')).length, 0)
  assert.equal(only('too-many-radii', css('.a{border-radius:4px}.b{border-radius:6px}.c{border-radius:8px}.d{border-radius:12px}')).length, 1)
  assert.equal(only('too-many-radii', css('.a{border-radius:6px}.b{border-radius:12px}.c{border-radius:50%}.d{border-radius:9999px}')).length, 0)
  assert.equal(only('too-many-shadows', css('.a{box-shadow:0 1px 2px #0001}.b{box-shadow:0 4px 8px #0002}.c{box-shadow:0 12px 32px #0003}')).length, 1)
  assert.equal(only('too-many-shadows', css('.a{box-shadow:0 1px 2px #0001}.b{box-shadow:0 4px 8px #0002}.f:focus{box-shadow:0 0 0 3px #00f}')).length, 0)
  assert.match(only('too-many-accents', css('.a{color:#2563eb}.b{color:#db2777}.c{color:#7c3aed}'))[0].found, /^3 hues/)
  assert.equal(only('too-many-accents', css('.a{color:#2563eb}.a:hover{color:#1d4ed8}.err{color:#dc2626}.ok{color:#16a34a}.warn{color:#d97706}.t{color:#333}')).length, 0)
  assert.match(only('space-off-scale', css('.a { padding: 18px 24px; margin: 10px }'))[0].found, /^2 values: 18px ×1, 10px ×1/)
  assert.equal(only('space-off-scale', css('.a { padding: 16px 24px; gap: 0.5rem; margin: 0 auto } section { padding-block: 96px }')).length, 0)
  assert.equal(only('space-off-scale', jsx('<div className="p-[18px]" />')).length, 1)
})

test('copy: tells counted per page against the budgets of copy.md', () => {
  const page = (body) => html(`<body>${body}</body>`)
  assert.equal(only('copy-two-fragments', page('<h2>Fast. Private.</h2><h2>Small. Quiet.</h2>')).length, 1)
  assert.equal(only('copy-two-fragments', page('<h2>Fast. Private.</h2><h2>Shared books for workshops</h2>')).length, 0)
  assert.equal(only('copy-contrast-frame', page('<p>Not a tool, but a partner.</p><p>Rather than guess, measure.</p><p>Instead of email, a ledger.</p>')).length, 1)
  assert.equal(only('copy-contrast-frame', page('<p>Rather than guess, measure.</p><p>Instead of email, a ledger.</p>')).length, 0)
  assert.equal(only('copy-negation-run', page('<p>No setup. No fees.</p><p>No limits. No contracts.</p>')).length, 1)
  assert.equal(only('copy-negation-run', page('<p>No setup. No fees.</p>')).length, 0)
  assert.equal(only('copy-praise', page('<p>A seamless way to work.</p>')).length, 1)
  assert.equal(only('copy-praise', page('<p>Receipts land in one ledger.</p>')).length, 0)
  assert.equal(only('copy-praise', css('.seamless { color: red }')).length, 0)
  assert.equal(only('copy-praise', page('<script>const x = "seamless"</script><p>Plain.</p>')).length, 0)
  assert.equal(only('copy-stock-line', page('<p>Loved by developers everywhere.</p>')).length, 1)
  assert.equal(only('copy-stock-line', page('<p>Used by four joinery shops in Leeds.</p>')).length, 0)
  assert.equal(only('copy-sample-name', page('<p>Jane Doe, CEO at Acme Corp</p>')).length, 1)
  assert.equal(only('copy-sample-name', page('<p>Priya Raman, owner of Raman Joinery</p>')).length, 0)
  assert.equal(only('copy-vague-label', page('<a href="/x">Learn more</a>')).length, 1)
  assert.equal(only('copy-vague-label', page('<a href="/x">See the prices</a><button>Open a ledger</button>')).length, 0)
  assert.equal(only('copy-eyebrow', page('<p class="eyebrow">One</p><p class="eyebrow">Two</p><p class="eyebrow">Three</p>')).length, 1)
  assert.equal(only('copy-eyebrow', jsx('<p className="uppercase text-xs tracking-wide">a</p><p className="uppercase text-xs">b</p>')).length, 0)
  assert.match(only('copy-em-dash', page(`<p>${'word '.repeat(80)}— a — b — c</p>`))[0].found, /^3 em dashes in \d+ characters \(budget 0, fails the pass\)/)
  assert.equal(only('copy-em-dash', page(`<p>${'word '.repeat(110)}— a</p>`)).length, 0)
})
