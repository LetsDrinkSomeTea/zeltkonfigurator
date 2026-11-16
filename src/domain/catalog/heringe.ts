import type { Part } from '../types'

/**
 * Heringe eines Zeltes: 30-cm-T-Profile für Seitenwand und Abspannung, 60-cm-T-Profile für die
 * Mittelpfosten (Masten). Auf jedes T-Profil gehört ein PacMan als Abdeckung.
 */
export function heringe({
  seitenwand = 0,
  masten = 0
}: {
  seitenwand?: number
  masten?: number
}): Part[] {
  const parts: Part[] = [
    { articleId: 't-profil-30', quantity: seitenwand },
    { articleId: 't-profil-60', quantity: masten },
    { articleId: 'pacman', quantity: seitenwand + masten }
  ]
  return parts.filter((p) => p.quantity > 0)
}
