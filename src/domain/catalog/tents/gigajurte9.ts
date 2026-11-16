import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { gigajurte9 as gigajurte9Dach } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const gigajurte9: TentType = {
  id: 'gigajurte9',
  name: 'Gigajurte 9 m',
  modules: [gigajurte9Dach],
  walls: [keineWand(), normaleWand({ segmente: 18 }), hoheWand({ segmente: 18 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'seitenstange', quantity: 18 },
    { articleId: 'abspannseil', quantity: 18 }, // PLATZHALTER
    ...heringe({ seitenwand: 18 }) // PLATZHALTER
  ]
}
