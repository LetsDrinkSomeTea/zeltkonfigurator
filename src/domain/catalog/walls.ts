import type { Part, WallBuild, WallOption } from '../types'

const BODENNAEGEL_JE_SEGMENT = 2

const BUILD_SUPER: WallBuild = { id: 'super', label: 'Superbahn', layers: ['superbahn'] }
const BUILD_NORMAL_STREIFEN: WallBuild = {
  id: 'normal+streifen',
  label: 'Normalbahn + Erweiterungsstreifen',
  layers: ['normalbahn', 'erweiterungsstreifen']
}
const BUILD_NORMAL: WallBuild = { id: 'normal', label: 'Normalbahn', layers: ['normalbahn'] }
const BUILD_STREIFEN: WallBuild = {
  id: 'streifen',
  label: 'Erweiterungsstreifen',
  layers: ['erweiterungsstreifen']
}
const BUILD_ERDSTREIFEN: WallBuild = {
  id: 'erdstreifen',
  label: 'Erdstreifen',
  layers: ['erdstreifen']
}

/** Bodennägel für eine echte Seitenwand: 2 je Segment. */
function bodennaegel(segmente: number): Part[] {
  return [{ articleId: 'bodennagel', quantity: BODENNAEGEL_JE_SEGMENT * segmente }]
}

/** Keine Seitenwand. Bei der Kohte heißt die Option „Ohne Erdstreifen“. */
export function keineWand(label = 'Keine Seitenwand'): WallOption {
  return { id: 'keine', label, segments: 0, builds: [], parts: [] }
}

/** Normalhohe Seitenwand aus Normalbahnen. */
export function normaleWand({ segmente }: { segmente: number }): WallOption {
  return {
    id: 'normal',
    label: 'Normal',
    segments: segmente,
    builds: [BUILD_NORMAL],
    parts: bodennaegel(segmente)
  }
}

/** Hohe Seitenwand: Superbahn oder Normalbahn + Erweiterungsstreifen (Vorgabe: Superbahn). */
export function hoheWand({ segmente }: { segmente: number }): WallOption {
  return {
    id: 'hoch',
    label: 'Hoch',
    segments: segmente,
    builds: [BUILD_SUPER, BUILD_NORMAL_STREIFEN],
    parts: bodennaegel(segmente)
  }
}

/** Nur die Erweiterungsstreifen als niedrige Wand (Hochkohte). */
export function nurStreifen({ segmente }: { segmente: number }): WallOption {
  return {
    id: 'nur-streifen',
    label: 'Nur Erweiterungsstreifen',
    segments: segmente,
    builds: [BUILD_STREIFEN],
    parts: bodennaegel(segmente)
  }
}

/** Erdstreifen der Kohte: ein Stück rundherum, daher ein Segment. */
export function erdstreifen(): WallOption {
  return {
    id: 'erdstreifen',
    label: 'Mit Erdstreifen',
    segments: 1, // PLATZHALTER
    builds: [BUILD_ERDSTREIFEN],
    parts: []
  }
}
