import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const gigajurte12: TentType = {
  id: 'gigajurte12',
  name: 'Gigajurte 12 m',
  roofs: [
    {
      id: 'gigajurtendach-zwischenteile',
      label: 'Gigajurtendach + 12 Zwischendachteile + 6 Kohtenblätter',
      parts: [
        { articleId: 'gigajurtendach', quantity: 1 },
        { articleId: 'jurten-zwischendachteil', quantity: 12 },
        { articleId: 'kohtenblatt', quantity: 6 }
      ]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 24 }), hoheWand({ segmente: 24 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'gigajurtendaechle', quantity: 1 },
    { articleId: 'jurtenspinne-9', quantity: 1 }, // PLATZHALTER
    { articleId: 'mast-500', quantity: 3 }, // PLATZHALTER
    { articleId: 'seitenstange', quantity: 24 },
    { articleId: 'abspannseil', quantity: 24 }, // PLATZHALTER
    ...heringe({ seitenwand: 24, lang: 8 }), // PLATZHALTER
    { articleId: 'blockseilrolle', quantity: 1 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
