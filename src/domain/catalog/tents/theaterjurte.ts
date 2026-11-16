import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { theaterjurte as theaterjurteDach } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const theaterjurte: TentType = {
  id: 'theaterjurte',
  name: 'Theaterjurte',
  modules: [theaterjurteDach],
  walls: [keineWand(), normaleWand({ segmente: 14 }), hoheWand({ segmente: 14 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'seitenstange', quantity: 14 },
    { articleId: 'abspannseil', quantity: 14 },
    ...heringe({ seitenwand: 14 })
  ]
}
