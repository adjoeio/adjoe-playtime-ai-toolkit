import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "../..")
const pluginsRoot = path.join(packageRoot, "plugins")

function availablePlugins() {
  if (!fs.existsSync(pluginsRoot)) {
    throw new Error(`mob-agent-plugins: plugins directory not found at ${pluginsRoot}`)
  }
  return fs
    .readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort()
}

function selectPlugins(options, available) {
  const include = options?.include
  const exclude = options?.exclude
  if (Array.isArray(include) && include.length > 0) {
    for (const name of include) {
      if (!available.includes(name)) console.warn(`mob-agent-plugins: include lists unknown plugin "${name}"`)
    }
    return available.filter((name) => include.includes(name))
  }
  if (Array.isArray(exclude) && exclude.length > 0) {
    for (const name of exclude) {
      if (!available.includes(name)) console.warn(`mob-agent-plugins: exclude lists unknown plugin "${name}"`)
    }
    return available.filter((name) => !exclude.includes(name))
  }
  return available
}

function parseMarkdownFile(file) {
  const raw = fs.readFileSync(file, "utf8")
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: raw }

  const frontmatter = {}
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":")
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "")
    frontmatter[key] = value
  }
  return { frontmatter, body: match[2].replace(/^\n/, "") }
}

function loadSkills(pluginName) {
  const skillsDir = path.join(pluginsRoot, pluginName, "skills")
  if (!fs.existsSync(skillsDir)) return []

  return fs
    .readdirSync(skillsDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "SKILL.md")
    .map((entry) => {
      const file = path.join(entry.parentPath, entry.name)
      const { frontmatter, body } = parseMarkdownFile(file)
      const id = path.basename(path.dirname(file))
      return {
        id,
        name: frontmatter.name || id,
        description: frontmatter.description,
        autoinvoke: frontmatter["metadata.opencode/autoinvoke"] !== "false",
        path: file,
        content: body,
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))
}

export default {
  id: "adjoe.mob-agent-plugins",
  async server(_ctx, options = {}) {
    const selected = selectPlugins(options, availablePlugins())
    const skillPaths = selected
      .map((name) => path.join(pluginsRoot, name, "skills"))
      .filter((directory) => fs.existsSync(directory))

    return {
      async config(config) {
        config.skills ??= {}
        config.skills.paths = [...new Set([...(config.skills.paths ?? []), ...skillPaths])]
      },
    }
  },
  async setup(ctx) {
    const selected = selectPlugins(ctx.options, availablePlugins())
    const skills = selected.flatMap(loadSkills)

    await ctx.skill.transform((editor) => {
      for (const skill of skills) editor.add(skill)
    })
  },
}
