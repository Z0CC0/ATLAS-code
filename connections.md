# Connections for review, fix and commit

None of these is required, and none is installed for you: a command is shown, and you run it.

| tool | what it adds | cost | tried here |
|---|---|---|---|
| a language server, through `atlas-mem` | references resolved by type rather than by text | `typescript-language-server` or `pyright` to install | yes, on JavaScript and Python |
| your CI's logs, through `gh` | `atlas fix` reads the failure as CI saw it | `gh` logged in | not run |

# Connections for atlas-code

None of these is required, and none is installed for you: a command is shown, and you run it. Each MCP server adds its tool definitions to every chat where it is on. "Tried" means it was run here, and what the test covered.

| tool | what it adds | advantages | disadvantages | tried here |
|---|---|---|---|---|
| [Context7](https://github.com/upstash/context7) | library docs for the right version | one call where a search takes four | its index decides what you get; your query leaves the machine | used through `atlas-research`, not measured |
| Chrome DevTools MCP | pages behind a login, performance traces | sees what a logged-in person sees | drives your browser and your sessions, so a page can try to instruct it | used in sessions, not measured |
| Codex CLI, through `atlas multi` | a second model's review | a reader that did not write the code | the code you show it leaves the machine, and it costs that service's usage | one real call |
| `semgrep`, `gitleaks`, `osv-scanner`, through `atlas secure` | scanners beside the reading | finds what reading misses | to install; missing ones are reported as not run, never as clean | only with the scanners missing: they were reported as not run |
| GitHub, Jira or Linear, through `atlas track` | tickets read and updated | the ticket stays the source | needs a login, and an update is visible to your team, so it asks first | not run |
