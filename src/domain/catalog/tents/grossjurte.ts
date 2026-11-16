import type { TentType } from '../../types'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const grossjurte: TentType = {
  id: 'grossjurte',
  name: 'Großjurte',
  roofs: [
    {
      id: 'grossjurtendach',
      label: 'Großjurtendach',
      parts: [{ articleId: 'grossjurtendach', quantity: 1 }]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 16 }), hoheWand({ segmente: 16 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'grossjurtendaechle', quantity: 1 },
    { articleId: 'jurtenspinne-8', quantity: 1 },
    { articleId: 'mast-500', quantity: 3 },
    { articleId: 'seitenstange', quantity: 16 },
    { articleId: 'abspannseil', quantity: 16 },
    { articleId: 't-profil', quantity: 16 },
    { articleId: 'blockseilrolle', quantity: 1 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
