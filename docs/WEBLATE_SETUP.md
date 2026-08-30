# Weblate setup (Extension)

Hosted Weblate project for Just Read extension translations.

## Project (configured)

| Setting | Value |
|---|---|
| Project name | Just Read |
| Project slug (`WEBLATE_PROJECT`) | `just-read` |
| Component name | Extension |
| Component slug (`WEBLATE_COMPONENT`) | `extension` |
| Project URL | https://hosted.weblate.org/projects/just-read/ |
| Component URL | https://hosted.weblate.org/projects/just-read/extension/ |
| Translation license | GPL-3.0-only |
| Repository branch | `main` |
| File format | WebExtension JSON |
| File mask | `_locales/*/messages.json` |
| Monolingual base | `_locales/en/messages.json` |

## Local `.env`

Copy `.env.example` to `.env`:

```bash
WEBLATE_API_URL=https://hosted.weblate.org/api
WEBLATE_API_TOKEN=...          # or WEBLATE_API_KEY
WEBLATE_PROJECT=just-read
WEBLATE_COMPONENT=extension
```

Verify:

```bash
npm run i18n:weblate:verify
npm run i18n:weblate:status
```

## Languages enabled

All 15 launch locales: `ru`, `es`, `pt_BR`, `zh_CN`, `de`, `fr`, `zh_TW`, `ja`, `ko`, `it`, `pt_PT`, `uk`, `sv`, `pl`, `tr`, plus English source.

## Day-to-day workflow

```bash
# After changing English strings in _locales/en/messages.json
npm run i18n:translate          # AI draft (needs OPENAI_API_KEY in .env)
npm run i18n:check              # verify key parity across locales
git push
npm run i18n:weblate:pull       # sync Weblate with git

npm run i18n:weblate:status     # per-locale stats (watch failing% drop after real translations)
# merge Weblate PRs from GitHub
```

### English placeholder locales

If locales were generated with `npm run i18n:translate:copy-en`, Weblate will show **100% translated** but high **failing** checks (text still matches English). Run `npm run i18n:translate` with `OPENAI_API_KEY` set, push, and pull Weblate again for real drafts.

## Cursor MCP

`.cursor/mcp.json` loads `@mmntm/weblate-mcp` using the same `.env` token.
