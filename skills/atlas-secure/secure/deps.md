# Dependencies — what the project pulls in, and what is known broken

The code the project did not write is most of the code it ships. A known vulnerability in a
dependency is the cheapest way in, and the easiest to miss by reading the project's own files.

## Run the project's own audit

Each ecosystem has a command that checks the installed versions against a public advisory
database. Use the one the project's lock file points to; it reads what is locked, not what is
latest. Through `atlas-runner` when it exists, so the long output stays out of the
conversation; else to a file in the scratch directory, read back only the lines that name a
vulnerability.

| lock file | command | reads |
|---|---|---|
| `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` | `npm audit --omit=dev` (and once with dev); `pnpm audit`; `yarn npm audit` on Yarn 2+, `yarn audit` on Yarn 1 | the lock |
| `requirements.txt` | `pip-audit -r <file>` (or `pip-audit` in the active environment) | the pins |
| `uv.lock`, `poetry.lock`, or any manifest the above do not read | `osv-scanner scan source -r .` (older releases: `osv-scanner -r .`) | the lock |
| `Cargo.lock` | `cargo audit` | the lock |
| `go.sum` | `govulncheck ./...` | the modules actually reached |
| `composer.lock` | `composer audit` | the lock |
| `Gemfile.lock` | `bundle audit check --update` | the lock |
| `*.csproj`, `packages.lock.json` | `dotnet list package --vulnerable --include-transitive` | the graph |

No lock file, or the command not installed: say so in the scope line, and fall back to
`osv-scanner` (see the table for its syntax), which reads many lock and manifest formats, when
that is present. Nothing available: the
dependency pass is `not run`, not guessed. Never install a scanner without a yes.

## Read the result, do not just forward it

An advisory is not yet a finding. For each one that the tool reports:

- **Is the vulnerable path reached?** A hole in a function the project never calls is lower
  than one on its main path. `govulncheck` answers this itself; for the others, search the
  code for the package's used surface. Say which it is.
- **Is it reachable from outside?** A parser vulnerability on data a user can send is
  `critical` or `high`; the same on a build-time dev tool is `low`.
- **Is there a fixed version, and does it cross a major?** It changes the advice, not the
  tier: a fix within the same major is cheap, take it now; one that needs a major upgrade is
  named with that cost.
- **Which level can fix it?** A package the project does not list itself cannot be upgraded
  from its own manifest. Name the direct dependency that pulls it in and the shortest chain
  (`a@1 > b@2 > vuln@3`, from `npm ls <pkg>`, `pnpm why <pkg>`, `pipdeptree -r -p <pkg>` or
  `go mod graph`), then give the fix at that level: a release of the direct dependency that
  carries the fixed version, else the package manager's own override (`overrides`,
  `resolutions`, `pnpm.overrides`), named with the risk that the parent was never tested
  against it. The same advisory in two lock files of one repository is two lines.
  (Transitive fixes: usestrix/strix, Apache-2.0.)

Tiers follow `method.md`, set by reachability, not by the advisory's own label alone.

## Beyond the advisory database

- **A direct dependency that is unmaintained**: last release years old, archived repository,
  a single maintainer. Not a vulnerability today, a `low` worth naming, especially for
  anything parsing untrusted input.
- **A dependency pulled from outside the registry**: a git URL, a tarball URL, a package
  installed from a path. Where it comes from and whether the source is pinned to a commit, not
  a moving branch.
- **Install scripts**: a dependency that runs a `postinstall`/`preinstall` script is code that
  ran on the machine already, before anyone read it. On a project that does not gate them:
  a `medium`, with the fix in three steps: the first install with scripts off (the package
  manager's own flag or setting, from its current documentation, never from memory); the
  scripts of what asked to run one read; the ones needed allowed by name in a policy file
  that is committed, and the install frozen to the lock. An unexpected script on a leaf
  package is its own line, and so is any dependency added since the last audit or the last
  tag that runs one: it has not run anywhere yet, so it is read before the next install.
- **Lock file integrity**: the lock exists and is committed; `npm ci` / `--frozen-lockfile`
  used in CI so the resolved versions are the audited ones.

## CI and release

The pipeline runs with the repository's secrets, so its files are audited like code. Writing
one is `atlas-ship`'s `pipeline.md`; here every workflow and release script is read for:

- **Outside text in a run step.** A pull request title, a branch name, an issue or comment
  body, a commit message expanded straight into a shell line (`${{ github.event.* }}` inside
  `run:`, or the same in another CI's syntax): the text becomes part of the command. The fix
  passes it through an environment variable, quoted.
- **A privileged trigger on outside code.** A workflow on a pull request from a fork with
  secrets in reach, or one that checks out the pull request's own ref under
  `pull_request_target` or `workflow_run`.
- **A third-party action pinned to a tag or a branch** in a job that has secrets or a write
  token: whoever moves the tag runs in that job. Pin to the full commit. The same in a job
  with neither is `low`.
- **A cache crossing trust.** A cache that a pull-request job can write and a release job
  restores.
- **A token wider than the job.** Write permissions in a job that only reads.
- **A private name a public registry can answer.** An internal package with no scope, or a
  scope with no registry pinned for it, or a second index added beside the public one
  (`--extra-index-url`): the installer may take a public package of the same name. Whether
  that name is taken publicly is a fact outside the source, so the line is
  `needs_validation` with that lookup for the owner.

Each is `high` when outside text or code reaches it (a public repository, issues, forks),
`medium` otherwise, unless the line above says less. (The section:
cloudflare/security-audit-skill, MIT.)

## Report

Findings in the line format of `method.md`, the package and version in place of a file:

```
lodash@4.17.11  high  prototype pollution (CVE-…), reached via the merge in src/config.ts:40 on user-supplied JSON → arbitrary property set. Upgrade to 4.17.21, same major.
qs@<v> via express@<v> > body-parser@<v>  high  prototype pollution (CVE-…) in query parsing, reached on every request → property set on parsed objects. Upgrade express to a release that carries a fixed qs; else force qs with `overrides`.
tar@4.4.1  medium  path traversal on archive extract; the project only extracts its own release tarballs, not user input. Upgrade when convenient.
left-pad@1.0.0  low  unmaintained since 2016, one maintainer; trivial to inline.
```

The scope line names the command run, the number of dependencies checked, whether dev
dependencies were included, and the date of the advisory data the tool read: data a month
old misses a month of advisories.
