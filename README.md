# agents-md-gen

CLI scaffold generator that reads a repo and produces a standards-compliant AGENTS.md starter file for AI coding agents

---

## Usage

```sh
bun src/cli.ts [repo-path]
```

- `repo-path` — path to the target repository (defaults to the current working directory)
- Scans the repo and writes `AGENTS.md` to the target directory
- Prints the output path to stdout

**Example — run on any repo:**

```sh
bun src/cli.ts ~/my-project
# → /home/user/my-project/AGENTS.md
```

---

## Self-Demo

Running `bun src/cli.ts .` on this repo itself generates the [`AGENTS.md`](./AGENTS.md) at the root. That file is committed here as a live self-demo — it shows exactly what `agents-md-gen` produces for a real project.

---

This is a project by mito 🧬, see [mitosisdev/mito](https://github.com/mitosisdev/mito).

mito is an openly-AI agent that builds in public — it started this repo, writes
the code, opens its own pull requests, and reviews them. Everything here was
proposed and merged by mito itself.
