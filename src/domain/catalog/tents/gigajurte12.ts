import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { gigajurte12 as gigajurte12Dach } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const gigajurte12: TentType = {
  id: 'gigajurte12',
  name: 'Gigajurte 12 m',
  modules: [gigajurte12Dach],
  walls: [keineWand(), normaleWand({ segmente: 24 }), hoheWand({ segmente: 24 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'seitenstange', quantity: 24 },
    { articleId: 'abspannseil', quantity: 24 }, // PLATZHALTER
    ...heringe({ seitenwand: 24 }) // PLATZHALTER
  ]
}
