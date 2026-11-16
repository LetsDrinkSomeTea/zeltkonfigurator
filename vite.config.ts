import { defineConfig } from '@opencloud-eu/extension-sdk'

export default defineConfig({
  name: 'zeltkonfigurator',
  test: {
    // Agenten-Worktrees unter .claude/ gehören nicht zu den Projekt-Tests (Standard-Excludes des SDK bleiben).
    exclude: ['**/.claude/**']
  }
})
