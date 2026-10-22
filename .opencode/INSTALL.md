# Installing mob-agent-plugins for OpenCode

Configure the plugin in your global OpenCode configuration at `~/.config/opencode/opencode.json` to make its skills available in every project:

### OpenCode V2

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "git+https://github.com/adjoeio/adjoe-playtime-ai-toolkit.git#main"
  ]
}
```

Replace `main` with the branch, tag, or commit you want to use. Restart OpenCode after changing the configuration.

### OpenCode V1 (1.18.29 or newer)

Use the singular `plugin` field instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "git+https://github.com/adjoeio/adjoe-playtime-ai-toolkit.git#main"
  ]
}
```
