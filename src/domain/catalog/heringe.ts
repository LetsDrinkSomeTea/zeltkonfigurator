import type { Part } from '../types'

/**
 * Heringe eines Zeltes: 30-cm-T-Profile für Seitenwand und Abspannung, 60-cm-T-Profile (`lang`)
 * nur wo nötig, z. B. bei der Gigajurte. Auf jedes T-Profil gehört ein PacMan als Abdeckung.
 */
export function heringe({
  seitenwand = 0,
  lang = 0
}: {
  seitenwand?: number
  lang?: number
}): Part[] {
  const parts: Part[] = [
    { articleId: 't-profil-30', quantity: seitenwand },
    { articleId: 't-profil-60', quantity: lang },
    { articleId: 'pacman', quantity: seitenwand + lang }
  ]
  return parts.filter((p) => p.quantity > 0)
}
