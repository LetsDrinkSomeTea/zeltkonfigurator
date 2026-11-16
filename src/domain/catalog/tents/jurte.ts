import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { jurte as jurteDach } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const jurte: TentType = {
  id: 'jurte',
  name: 'Jurte',
  modules: [jurteDach],
  walls: [keineWand(), normaleWand({ segmente: 12 }), hoheWand({ segmente: 12 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'seitenstange', quantity: 12 },
    { articleId: 'abspannseil', quantity: 12 },
    ...heringe({ seitenwand: 12 })
  ]
}
