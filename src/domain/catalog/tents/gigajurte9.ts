import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const gigajurte9: TentType = {
  id: 'gigajurte9',
  name: 'Gigajurte 9 m',
  roofs: [
    {
      id: 'gigajurtendach',
      label: 'Gigajurtendach',
      parts: [{ articleId: 'gigajurtendach', quantity: 1 }]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 18 }), hoheWand({ segmente: 18 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'gigajurtendaechle', quantity: 1 },
    { articleId: 'jurtenspinne-9', quantity: 1 },
    { articleId: 'mast-500', quantity: 3 }, // PLATZHALTER
    { articleId: 'seitenstange', quantity: 18 },
    { articleId: 'abspannseil', quantity: 18 }, // PLATZHALTER
    ...heringe({ seitenwand: 18, lang: 8 }), // PLATZHALTER
    { articleId: 'blockseilrolle', quantity: 1 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
