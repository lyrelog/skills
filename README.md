<p align="center">
  <a href="https://lyrelog.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://lyrelog.com/readme/skills-dark.png">
      <img alt="Lyrelog agent skills" src="https://lyrelog.com/readme/skills-light.png" width="600">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://docs.lyrelog.com/ai-agents"><b>Documentation</b></a> ·
  <a href="https://docs.lyrelog.com/cli">CLI</a> ·
  <a href="https://lyrelog.com">lyrelog.com</a>
</p>

[Agent skills](https://agentskills.io) that teach a coding agent how to work with
[Lyrelog](https://lyrelog.com): add the SDK to an app, investigate an error with the CLI, get the
right key or token, and set up alerts. They follow the open Agent Skills format, so they work in
Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode and the other agents that read
`SKILL.md`.

| Skill | What the agent learns |
|---|---|
| [`lyrelog-integrate`](skills/lyrelog-integrate/SKILL.md) | Add the SDK to an app or service (Swift, Android, React Native, Flutter, JavaScript, Python, Go, JVM, HTTP), log good events, capture errors, check they arrive |
| [`lyrelog-investigate`](skills/lyrelog-investigate/SKILL.md) | Go from an error to its cause with the `lyrelog` CLI, read only: the error, one occurrence, the session before it, versions, the code |
| [`lyrelog-keys`](skills/lyrelog-keys/SKILL.md) | Which key or token goes where, and getting one into the right place without pasting secrets around |
| [`lyrelog-alerts`](skills/lyrelog-alerts/SKILL.md) | Turn on new-error, spike and failing-version alerts, connect Slack or a signed webhook, verify the signature |

## Install

With [skills.sh](https://skills.sh), for any agent (it asks which ones):

```bash
npx skills add lyrelog/skills
```

`--skill lyrelog-investigate` installs one, `-g` installs for your user instead of the project,
`-a claude-code` picks the agent.

With the [Lyrelog CLI](https://github.com/lyrelog/lyrelog-cli), which gets the newest from here (offline, the copy it carries):

```bash
lyrelog skills install            # for every agent it finds on this computer
lyrelog skills                    # what's installed where, and if it's out of date
lyrelog skills install --project  # into this project (.claude/skills and .agents/skills)
```

As a Claude Code plugin:

```text
/plugin marketplace add lyrelog/skills
/plugin install lyrelog@lyrelog
```

Or copy a folder from [`skills/`](skills) into your agent's skills folder
(`~/.claude/skills/`, `~/.agents/skills/`, `.agents/skills/`...).

## Before you start

- The investigation and alert skills use the [Lyrelog CLI](https://github.com/lyrelog/lyrelog-cli):
  `brew install lyrelog/tap/lyrelog`. A person signs in once with `lyrelog login`; an agent can't
  sign in by itself.
- The skills read the docs as Markdown (`https://docs.lyrelog.com/<page>.md`) instead of relying
  on what an agent remembers. See [Use with AI agents](https://docs.lyrelog.com/ai-agents).

## License

MIT
