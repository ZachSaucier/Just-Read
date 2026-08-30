# Weblate setup (Extension)

One-time steps to connect Hosted Weblate to the public `Just-Read` repository.

## Prerequisites

1. Copy `.env.example` to `.env` and set `WEBLATE_API_TOKEN`.
2. Run `npm run i18n:weblate:verify` — must print authenticated user.

## Hosted Weblate project

1. Apply for [Libre hosting](https://hosted.weblate.org/) (open-source license on Just-Read).
2. Connect GitHub and install the [Hosted Weblate GitHub App](https://github.com/apps/hosted-weblate) on `ZachSaucier/Just-Read`.
3. Create project **Just Read** (note the URL slug → `WEBLATE_PROJECT` in `.env`).
4. Add **Extension** component:

| Setting | Value |
|---|---|
| File format | WebExtension JSON file |
| Monolingual base language file | `_locales/en/messages.json` |
| File mask | `_locales/*/messages.json` |
| Version control | GitHub |
| Push branch | `weblate` |
| Merge type | Pull request |

5. Enable launch languages: `ru`, `es`, `pt_BR`, `zh_CN`, `de`, `fr`, `zh_TW`, `ja`, `ko`, `it`, `pt_PT`, `uk`, `sv`, `pl`, `tr`.
6. Set `WEBLATE_COMPONENT=extension` (or the actual component slug) in `.env`.
7. Run `npm run i18n:weblate:status` to confirm the component is reachable.

## Day-to-day workflow

```bash
# After changing English strings in _locales/en/messages.json
npm run i18n:translate          # AI draft for all 15 locales (needs OPENAI_API_KEY)
npm run i18n:check              # verify key parity
git push
npm run i18n:weblate:pull       # sync Weblate with git

# Review community corrections
npm run i18n:weblate:status
# merge Weblate PRs from GitHub
```

## Cursor MCP

`.cursor/mcp.json` loads `@mmntm/weblate-mcp` using the same `.env` token for agent tooling.
