<p align="center"><img src="assets/banner.svg" alt="ATLAS code: plan, test, verify, review, ship" width="860"></p>
<p align="center"><img src="assets/stats.svg" alt="28 commands, 10 subagents" width="860"></p>

**A coding cycle for Claude Code that costs a fifth of its largest rival in every chat.** Everything in [`atlas`](https://github.com/Z0CC0/ATLAS), plus review, fix, plan, test, verify, ship, a security audit and the documents around them. Each command is a short router: what stays loaded is one description, and the files behind it are read when the request calls for them.

```
/plugin marketplace add Z0CC0/ATLAS
/plugin install atlas-code@atlas
```

It ships off, and nothing changes until you type `atlas low` or `atlas high`. Install one ATLAS build: two side by side inject the rules twice. To add the memory and video too, install [`atlas-max`](https://github.com/Z0CC0/ATLAS-max) instead.

**Is it for you?** Yes if you write code in long sessions and use the commands. No if your sessions are short: below about 50 turns it costs more than no plugin at all. [`atlas`](https://github.com/Z0CC0/ATLAS) is the lighter choice then.

## What it adds

| type this | and it |
|---|---|
| `atlas review` | what is wrong with a diff, a branch, a file or a pull request, with a checklist for the languages in it |
| `atlas fix` | a failing build, type check or linter back to green, one error at a time |
| `atlas commit` | the commit message for what is staged |
| `atlas test` | writes tests: test-first, coverage gaps, end to end, or against a deployed site |
| `atlas verify` | build, types, lint, tests and leftovers in one pass, compared with the previous run |
| `atlas plan` | plans before code and waits for a yes; asked to build, carries the work through tests and review to a commit, with a second yes before committing |
| `atlas multi` | asks other models for an opinion, a review or an approach, after showing what will be sent |
| `atlas docs` | keeps docs true to the code: sync, a map, onboarding, one feature traced end to end, locale files |
| `atlas perf` | speed work by measurement: baseline, one change, keep or revert |
| `atlas ship` | pull request, container, pipeline, deploy, Windows installer; nothing leaves the machine without a yes |
| `atlas track` | GitHub issues, Jira, Linear: read a ticket, update it, triage a backlog |
| `atlas refactor` | dead code, simplification, duplicates, an old codebase's own style; behaviour unchanged |
| `atlas publish` | prepares a private project to go public, on a copy, with a scan by a reader that did not do the cleaning |
| `atlas ui` | direction, polish, accessibility to WCAG 2.2 AA, motion, design tokens, a screenshot into components |
| `atlas build-ai` | code that calls a model: prompts, agent tools, evals, retrieval, cost, MCP servers, scheduled collectors |
| `atlas context` | what every session loads, when to compact, one answer at a chosen depth, a side question mid-task |
| `atlas secure` | audits a whole project you own: dangerous code, vulnerable dependencies, secrets in the files and the git history. Finds, never changes |

For the documents that are not code:

| type this | and it |
|---|---|
| `atlas spec` | turns an idea, a brief or a conversation into a specification in eight short sections, every "must" testable; hands a spec to the plan, checking that each requirement has a step and a proof; reviews a spec with a verdict (`BUILDABLE`, `QUESTIONS`, `NOT YET`) and one problem per line |
| `atlas changelog` | reads the history of a range (since the last tag by default) and writes the changelog entry in the project's own format, the release notes for the people who install the version, and the version number the changes call for |
| `atlas brief` | writes the text other agents read: a project's `CLAUDE.md` or `AGENTS.md`, a rules file scoped to a path, the description and body of a skill or a subagent, with the token cost measured |
| `atlas explain` | explains one thing to one reader: in plain words for someone who does not code, a decision with the options that lost and what would reopen it, a table of measurements with what it proves and what it does not |

One more skill is not typed: `atlas-stack`, eighteen short files on how code is written in
a given language or framework. `atlas plan` reads the one for your project before writing
code.

Each skill is a short router with a folder of files beside it. Only its description is
loaded in every session; a file is read when the request calls for it.

## What the document commands have in common

The document is written whole, in the language of the project's documents, for people who
were not in the room; the active compression level governs the conversation, not the
document. Every statement is traceable to its source (the conversation, the history, the
code, the measurement) or marked as reconstructed. Writing into a file, bumping a version,
creating a release: shown first, done after a yes; the release on the forge is `atlas-ship`'s
and needs its own.

## The guard hook

One hook file with three switches. All are off until you put one in `.atlas.json` at the
root of a project, or in `~/.claude/atlas.json` for every project:

```json
{ "guard": true, "gate": true, "finish": true }
```

- `guard` asks you before a command that destroys or publishes: a recursive forced delete,
  `git push --force`, `git reset --hard`, `git clean -f`, `DROP TABLE`, `kubectl delete`,
  `npm publish`, `--no-verify`. Add `"freeze": "src/api"` and it also asks before a write
  outside that folder.
- `gate` turns back the first edit of each file once per session, with what to look up
  first: who imports the file, which instruction the edit serves. The second attempt goes
  through.
- by voice: `atlas guard on`, `atlas guard off` (the same for `gate` and `finish`) write the
  switch to `~/.claude/atlas.json` (`$CLAUDE_CONFIG_DIR/atlas.json` when that is set). A
  project's `.atlas.json` can turn a switch on or add a `freeze`, never turn off a switch or
  move a `freeze` the user file sets: a cloned repository cannot disarm your guard.
- `finish` warns you when an answer ends by saying something was skipped, is still failing,
  or "should work". It reads English phrases only and never blocks.

The hook runs on every shell command and file edit, whether or not a switch is on: about
40 ms each time on the machine it was tested on.

## What it costs

| | `atlas` | `atlas-code` |
|---|---|---|
| names and descriptions, counted, in every session | 824 | 4,066 |
| rules injected at `low`, counted | 1,408 | 1,686 |
| installed and switched off, as billed | 1,238 | 6,167 |
| first turn at `low`, as billed | 3,356 | 8,666 |
| first turn at `high`, as billed | 3,536 | 8,886 |
| a 40-turn session at `low`, against no plugin | -18% | +8% |
| a 295-turn session at `low` | -33% | -29% |
| a 40-turn session at `high` | -27% | 0% |
| a 295-turn session at `high` | -42% | -38% |

Billed on `claude-opus-5-5` at 0.1.0. The session rows assume this build saves per answer what `atlas` saves; that was not measured on this build. The files behind the commands are about 111,500 tokens, in 160 files, read one or a few at a time.

## Advantages of this build

- Twenty-two more skills for the whole cycle: plan, test, verify, review, fix, ship, audit, and the documents around them.
- Eight more subagents, so code searches, logs and the heavy modes stay outside your conversation.
- A guard hook, off until you switch it on, that asks before a destructive command.
- Each skill is a router: about 111,500 tokens of files behind them, read one or a few at a time.

## Disadvantages of this build

- 6,167 tokens in every chat, even switched off.
- Below about 50 turns it costs more than no plugin: +8% at 40 turns at `low`, 0% at `high`. It pays over long sessions, or when the commands are used.
- The guard hook runs on every shell command and file edit even with its switches off, about 40 ms each.
- Only `review`, `fix` and `secure` were run headless on real projects. The rest was tried in sessions, not measured. No bench measures the quality of the documents.

## Eight subagents

Three read code for any command: `atlas-finder` (where is X), `atlas-diff` (what is wrong with this diff) and `atlas-runner` (run the tests, return the verdict).

The heavy modes of five skills run in a subagent, so what they read never enters the
conversation: `atlas-auditor` (the whole-project audit of `atlas-secure`), `atlas-fixer` (the
fix loop when a build shows more than five errors or takes longer than about twenty seconds),
`atlas-profiler` (the measured attempts of `atlas-perf`), `atlas-documenter` (map, onboarding,
trace and sync of `atlas-docs`), `atlas-tester` (coverage, end to end, a whole module). Each
skill says when it delegates and keeps the small case in the conversation; each subagent reads
the same rule files as its skill, at the absolute paths the skill passes, and returns only the
report. `atlas-review` now delegates to `atlas-diff` above 120 lines of diff instead of 300.
Why: the audit of a 200-file project read fifty files over 285 seconds; in a conversation that
reading is paid again on every later turn. The price is 511 tokens of descriptions in every
session, used or not.

The first three rows are tiktoken counts (`o200k_base`), made the same way as for the other
builds. The 124 files behind these skills are about 96,000 tokens in all and are read a few
at a time.

**The session rows are a model, not a separate measurement.** The bench measured what the
rules add to the first turn and how much each level shortens an answer; those are the same
in this build, because the rules are the same. The rows above put this build's descriptions
into the same formula the README below uses for the others (500-token answers). This build
loads 2,218 more tokens of descriptions in every session: on a short session at `low` that
turns the small saving into a small cost. It pays for itself on long sessions, or when the coding commands are
actually used.

`atlas review` and `atlas fix` ship in every build except `atlas-min`, so they are
described in the README below.

## How far it has been tried

On 2026-10-04, Claude Code 2.1.283, on one small Python project made for the purpose:

| tried | result |
|---|---|
| `atlas review` (in every build) | read its method and the Python and error checklists; six findings in the line format, tiers and `outside` included |
| `atlas fix` (in every build) | read its method and the Python file, ran the suite through `atlas-runner`, fixed two errors, ended with `PASS` and the four counts |
| `atlas verify` | the six-row table and `CANNOT TELL`, because the passing tests did not cover the new code |
| `atlas docs: trace …` | the trace block, every line with a position |
| `atlas secure` | on a small Flask repo with seeded holes (an SQL injection, a hardcoded live key, a `.env` committed then removed, an unauthenticated endpoint, two outdated pins): found all of them at the expected tiers, left every missing scanner `not run` without installing it, quoted no secret, changed nothing, ended `HOLES FOUND` |
| the hook, all three switches | a hard reset stopped with its reason; the first edit turned back once; the closing warning shown |
| one real Codex call with the flags `atlas multi` uses | answered; the answer on standard output |
| WCAG 2.2 figures in `atlas ui` | twenty-four criteria checked against the published text |
| hook unit tests | 24 pass |

Two things the trials showed that you should know:

- **Type the name.** Asked in plain words ("fix the build", "plan this"), Claude did the
  work without loading the skill, three times out of three. Named, the skill loaded four
  times out of four.
- **No pointer commands.** A command and a skill with the same name are one entry to
  Claude Code, and the command wins: the skill's instructions are never loaded. Every
  build ships skills only, apart from the dial command; each is typed as
  `/atlas-code:<name>` or by its plain name.

**Not run at all:** `atlas test`, `atlas plan` by name, `atlas refactor`, `atlas ship`,
`atlas track` (no Jira or Linear account was available), `atlas publish`, `atlas ui`,
`atlas build-ai`,
`atlas multi` as a skill, `atlas context`, the Gemini command line, and every language file
except Python. Of `atlas secure`, the dependency pass with a real scanner and the secret
pass with `gitleaks` were not run. Treat those as written and reviewed, not as tested.

Headless trials on this machine's own projects, with the installed plugins off and the costs as
billed:
 `atlas review` on three C# files (read `review/csharp.md` and
`method.md`, four findings, one of them a real crash path, $1.29) and on two C++ bridges
(`review/cpp.md`, nine findings, $1.69); `atlas fix` on a C# project with three injected
errors (`fix/csharp.md`, `dotnet build`, four errors fixed since the syntax error hid two,
build green, $0.82); `atlas secure` on a 200-file Python daemon (58 routes read, four medium
findings with one root cause, five low, secrets pass over 272 commits, $3.72 in 285 s).
Java and Swift were not tried: the only files in those languages here are framework
boilerplate.

## Where the document commands come from

The lean eight-section spec and the handoff check are our reading of what product teams
publish as PRD templates; the changelog follows Keep a Changelog; the brief's cost rule is
the plugin's own measurement practice. Nothing was copied: every file here was written for
this plugin, and the sources that were studied are listed in the repository's notes.

## Where it comes from

The coding section was written after reading
[ECC](https://github.com/affaan-m/ECC), then named everything-claude-code, by Affaan
Mustafa (MIT licence), at commit `ef648e0`, when it had 293 skills. Which topics matter, and several methods (the
proof a review finding needs, eval-first work on model features, the staged check before
publishing a private project), are that project's. The text is ours: each file was
written from scratch in the form the rest of ATLAS uses, and checked for runs of eight
words shared with the original; what the check still finds are compiler error messages,
two shell commands and a list of file extensions, which have one spelling. Of its 293 skills, 146 were merged into the seventeen
coding skills (fifteen here, two in every build); one more, `atlas-secure`, was written fresh for this build. 142 of ECC's skills were left out, and 5 are kept aside for later work.

## How it compares

`atlas-code` was written after reading the projects below. The text is ours, and each debt is named. The question here is whether the rewrite is better, and the honest answer is: lighter and more measured, narrower, and with its quality on real code not yet proved.

Figures from 2026-11-02. Tokens are names and descriptions counted the same way for everyone, so they are a floor for a project with hooks.

| project | stars | what we took | loaded in every chat | hooks |
|---|---|---|---|---|
| **`atlas-code`** | | | **4,066** | one, off until you switch it on |
| [ECC](https://github.com/affaan-m/ECC) (formerly everything-claude-code), MIT | 295,521 | which topics matter, and several methods. 146 of its skills were merged into ours | 27,066 | 27 entries on 8 events, on by default |
| [agent-skills](https://github.com/addyosmani/agent-skills), MIT | 112,770 | improvements to fifteen rule files | 2,058 | none wired |
| [mattpocock/skills](https://github.com/mattpocock/skills), MIT | 310,073 | the `superseded by` convention, now in `atlas-mem` | 479 | none |
| [security-audit-skill](https://github.com/cloudflare/security-audit-skill), Cloudflare, MIT | 57,247 | verdicts: confirmed, needs validation, rejected | 72 | none |
| [founder-skill](https://github.com/Jakeschincariol/founder-skill), MIT | 2,356 | two rules: check a name is free, state the verdict threshold before the run | 1,414 | none |

**Where `atlas-code` is better**

- **Against ECC, the cost:** 4,066 tokens against 27,066, with hooks off until you ask. That is the point of the rewrite, and it is measured. ECC says it itself: "use a selective/manual profile when context footprint matters".
- **Keeping work out of the chat:** ten subagents, so searches, logs and audits stay out of your conversation. agent-skills ships four persona agents, and we found no finder or runner among them.
- **Windows:** ECC lists open defects on native Windows. `atlas-code` is tested on Windows and Linux at every push.
- **Audits with real scanners:** `atlas secure` runs `npm audit`, `pip-audit`, `osv-scanner` and `gitleaks` over the whole history when they are installed. A search of security-audit-skill found none of those names.

**Where they are better, and it is not close**

- **ECC is far wider:** 314 skills against 28, learned instincts, a scanner for your agent setup, parallel sessions, seven install profiles, and other hosts such as Codex and Cursor. `atlas-code` is Claude Code only.
- **agent-skills proves its routing:** evals run in its CI, with a floor on how often the right skill is picked. `atlas-code` has no eval of that kind. It also has `constraint-driven-development` and a one-pass `/build auto`, which have no match here.
- **mattpocock/skills costs less:** 479 tokens against 4,066. Its grilling interview goes further than `atlas ask`, and it writes a glossary as it goes.
- **Cloudflare's audit is deeper:** a coverage ledger with a validator, a fresh verifier for every candidate, and attack classes for memory safety, LLMs, cloud and more. `atlas-secure` sends only critical and high findings to a second reader, and it has nothing on prompt injection.

**What is not measured:** whether code written with `atlas-code` is better than code written with any of these. No bench here covers that, and most commands were not run headless on real projects. See "How far it has been tried" above.

## Connections

Tools you can attach, each with its advantages and disadvantages, and whether it was tried here: [`connections.md`](connections.md). Nothing is installed for you.

---

Part of [ATLAS](https://github.com/Z0CC0/ATLAS), which holds the bench behind every figure here. MIT licence.
