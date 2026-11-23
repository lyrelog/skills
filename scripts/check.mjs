// Checks the skills before they're published (CI runs it on every push):
// - each skills/<name>/SKILL.md has the Agent Skills frontmatter (agentskills.io/specification):
//   a name that matches its folder (1-64 lowercase letters, digits and single hyphens) and a
//   description of 1 to 1,024 characters; the body stays under 500 lines;
// - the Claude Code plugin and marketplace manifests agree on the plugin's name;
// - nothing public names a real person or his apps (only SHA-256 digests are written here);
// - with --links, every docs page a skill points to answers 200.
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const problems = []
const fail = (msg) => problems.push(msg)

const PRIVATE_WORDS = new Set([
  "4859d1729b697a9ccc9bf17b6a3c676bc935834e5640d203a7cfa489bd45d619",
  "976c617a20d12e4261e40bd8e4ce88493578ec463d082af3b2784b642b82ef0d",
  "b9e5b115929357704655d70d95b79daf630c3cea6e084adec79b4bcb7e0cd7b1",
  "34eb8131c759d8ea0bdf432f943e6e78d8bd2e1d9ad50f2bf166fad074edcea8",
  "7e421181fc7b52ab66f2c22bd396acce92c3cdd9a29122dde0f1b7ddc0eb4435",
])

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return null
  const fields = {}
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/)
    if (kv) fields[kv[1]] = kv[2].trim()
  }
  return { fields, body: text.slice(m[0].length) }
}

const links = new Set()
const skillsDir = path.join(root, "skills")
const names = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory())
if (names.length === 0) fail("no skills in skills/")
for (const dir of names) {
  const file = path.join(skillsDir, dir, "SKILL.md")
  if (!fs.existsSync(file)) { fail(`${dir}: no SKILL.md`); continue }
  const text = fs.readFileSync(file, "utf8")
  const fm = frontmatter(text)
  if (!fm) { fail(`${dir}: SKILL.md has no frontmatter`); continue }
  const { name = "", description = "" } = fm.fields
  if (name !== dir) fail(`${dir}: name "${name}" doesn't match its folder`)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) fail(`${dir}: name must be 1-64 lowercase letters, digits and single hyphens`)
  if (/anthropic|claude/.test(name)) fail(`${dir}: name uses a reserved word`)
  if (description.length < 1 || description.length > 1024) fail(`${dir}: description is ${description.length} characters (1 to 1,024)`)
  if (/^(I |You |Use this)/.test(description)) fail(`${dir}: description should be in the third person ("Adds...", "Investigates...")`)
  if (!/\bUse when\b/.test(description)) fail(`${dir}: description should say when to use it ("Use when ...")`)
  const lines = fm.body.split("\n").length
  if (lines >= 500) fail(`${dir}: body is ${lines} lines (under 500)`)
  for (const m of text.matchAll(/https:\/\/docs\.lyrelog\.com\/[a-z0-9/_-]+\.md/g)) links.add(m[0])
}

const plugin = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"))
const market = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/marketplace.json"), "utf8"))
if (!market.owner?.name) fail("marketplace.json: owner.name is required")
const entry = market.plugins?.find((p) => p.source === "./")
if (!entry) fail('marketplace.json: no plugin with source "./"')
else if (entry.name !== plugin.name) fail(`marketplace.json names the plugin "${entry.name}", plugin.json "${plugin.name}"`)

// Everything that's published: the README, the licence, the manifests and every skill's files.
const publicFiles = ["README.md", "LICENSE", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]
const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : publicFiles.push(path.relative(root, p)) } }
walk(skillsDir)
for (const file of publicFiles) {
  const words = fs.readFileSync(path.join(root, file), "utf8").toLowerCase().split(/[^\p{L}\p{N}]+/u)
  if (words.some((w) => w && PRIVATE_WORDS.has(createHash("sha256").update(w).digest("hex")))) fail(`${file}: names someone it mustn't`)
}
if (!fs.readFileSync(path.join(root, "LICENSE"), "utf8").includes("Copyright (c) 2026 Lyrelog\n")) fail("LICENSE: not Lyrelog's")

if (process.argv.includes("--links")) {
  for (const url of links) {
    const res = await fetch(url, { method: "GET", redirect: "follow" }).catch((e) => ({ ok: false, status: e.message }))
    if (!res.ok) fail(`${url}: ${res.status}`)
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`)
  process.exit(1)
}
console.log(`${names.length} skills ok${process.argv.includes("--links") ? `, ${links.size} docs links answer` : ""}`)
