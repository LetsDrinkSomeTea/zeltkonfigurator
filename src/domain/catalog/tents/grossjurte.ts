import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { grossjurte as grossjurteDach } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const grossjurte: TentType = {
  id: 'grossjurte',
  name: 'Großjurte',
  modules: [grossjurteDach],
  walls: [keineWand(), normaleWand({ segmente: 16 }), hoheWand({ segmente: 16 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'seitenstange', quantity: 16 },
    { articleId: 'abspannseil', quantity: 16 },
    ...heringe({ seitenwand: 16 })
  ]
}
