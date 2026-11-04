# Agent skills installed in this workspace

This project installs the 14 skills currently published by
[antfu/skills](https://github.com/antfu/skills) into `.agents/skills/` for
GitHub Copilot and other agents that support the shared workspace skill
directory. They are copied into the repository, not installed globally.

The source repository is MIT-licensed and describes its generated skills as a
proof of concept. Review changes before using or merging updates. Vue, Nuxt,
Vite, pnpm, and UnoCSS skills are stack-specific references; their presence does
not mean this Next.js/npm application should be migrated to those tools.

## Installed skills

| Skill | Focus |
| --- | --- |
| `antfu` | Opinionated app/library practices, linting, testing, Vue, and project setup. |
| `antfu-create-pr` | Prepare reviewable GitHub pull requests. |
| `antfu-issue-triage` | Triage repository issues and pull requests. |
| `antfu-query` | Clarify plans through structured questioning. |
| `antfu-simplify` | Simplify current changes while preserving proven behavior. |
| `nitro` | Nitro server framework. |
| `nuxt` | Nuxt framework and SSR. |
| `pinia` | Pinia state management. |
| `pnpm` | pnpm package manager and workspaces. |
| `unocss` | UnoCSS atomic styling. |
| `vite` | Vite configuration, plugins, and SSR. |
| `vitepress` | VitePress documentation sites. |
| `vitest` | Vitest testing framework. |
| `vue` | Vue core and Composition API. |

Installed source revision is recorded in
[`../.agents/skills/antfu-source.json`](../.agents/skills/antfu-source.json).

## Refresh workflow

- Update installed skills locally:
  `npx --yes skills@1.7.6 update antfu antfu-create-pr antfu-issue-triage antfu-query antfu-simplify nitro nuxt pinia pnpm unocss vite vitepress vitest vue --project --yes`
- Install newly added skills from upstream:
  `npx --yes skills@1.7.6 add antfu/skills --skill "*" --agent github-copilot --copy --yes`
- A weekly GitHub Actions workflow upgrades the tracked collection and opens or refreshes a
  PR. It can also be started manually from the Actions tab. Updates are **not
  auto-merged**; inspect skill instructions and references before merging.
- The scheduled workflow upgrades the 14 tracked skills. If upstream adds a new
  skill, add it to the manifest and workflow after checking for a name conflict
  with other project skills.

The updater is pinned to a known CLI release and GitHub Action revisions. It
only targets the installed Anthony Fu skill names; it does not rewrite
application dependencies or update unrelated project skills.
