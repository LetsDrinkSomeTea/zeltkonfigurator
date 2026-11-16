import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { grossjurte, holzgestaenge, jurte, kohte, mitAufbau } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

/**
 * Cafélounge: Großjurte und Jurte, an zwei Stellen zusammengeknüpft, dazu eine Kohte, die an
 * einer Stelle mitgeknüpft ist. Groß- und Kleinjurte stehen auf dem Holzgestänge der Cafélounge
 * (mit Winkeln) statt auf Masten, Spinne und Seitenstangen; die Kohte hat normales Gestänge.
 */
export const cafelounge: TentType = {
  id: 'cafelounge',
  name: 'Cafélounge',
  modules: [mitAufbau(grossjurte, holzgestaenge()), mitAufbau(jurte, holzgestaenge()), kohte],
  // PLATZHALTER: 16 + 12 Segmente, abzüglich je 2 an den beiden Knüpfstellen
  walls: [keineWand(), normaleWand({ segmente: 24 }), hoheWand({ segmente: 24 })],
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'abspannseil', quantity: 24 }, // PLATZHALTER
    ...heringe({ seitenwand: 24 + 8 }) // PLATZHALTER: Jurten-Seitenwand + Kohte
  ]
}
