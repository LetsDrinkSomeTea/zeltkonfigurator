import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const theaterjurte: TentType = {
  id: 'theaterjurte',
  name: 'Theaterjurte',
  roofs: [
    {
      id: 'halbjurtendaecher',
      label: '2 Halbjurtendächer + 2 Zwischendachteile',
      parts: [
        { articleId: 'halbjurtendach', quantity: 2 },
        { articleId: 'jurten-zwischendachteil', quantity: 2 }
      ]
    },
    {
      id: 'kohtenblaetter',
      label: '6 Kohtenblätter + 2 Zwischendachteile',
      parts: [
        { articleId: 'kohtenblatt', quantity: 6 }, // PLATZHALTER
        { articleId: 'jurten-zwischendachteil', quantity: 2 } // PLATZHALTER
      ]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 14 }), hoheWand({ segmente: 14 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'theaterjurtendaechle', quantity: 1 },
    { articleId: 'theaterjurtenspinne', quantity: 1 },
    { articleId: 'mast-375', quantity: 2 },
    { articleId: 'seitenstange', quantity: 14 },
    { articleId: 'abspannseil', quantity: 14 },
    ...heringe({ seitenwand: 14, masten: 2 }),
    { articleId: 'blockseilrolle', quantity: 2 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
