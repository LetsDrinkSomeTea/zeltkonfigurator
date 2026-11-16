import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const dreierjurtenburg: TentType = {
  id: 'dreierjurtenburg',
  name: 'Dreierjurtenburg',
  roofs: [
    {
      id: 'jurtendaecher',
      label: '3 Jurtendächer + 1 Dreiecksdachteil',
      parts: [
        { articleId: 'jurtendach', quantity: 3 },
        { articleId: 'dreiecksdachteil', quantity: 1 }
      ]
    },
    {
      id: 'kohtenblaetter',
      label: '18 Kohtenblätter + 1 Dreiecksdachteil',
      parts: [
        { articleId: 'kohtenblatt', quantity: 18 }, // PLATZHALTER
        { articleId: 'dreiecksdachteil', quantity: 1 } // PLATZHALTER
      ]
    }
  ],
  // PLATZHALTER: 27 Wandsegmente (geometrisch abgeleitet)
  walls: [keineWand(), normaleWand({ segmente: 27 }), hoheWand({ segmente: 27 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'jurtendaechle', quantity: 3 }, // PLATZHALTER
    { articleId: 'jurtenspinne-6', quantity: 3 }, // PLATZHALTER
    { articleId: 'mast-375', quantity: 9 }, // PLATZHALTER
    { articleId: 'seitenstange', quantity: 27 }, // PLATZHALTER
    { articleId: 'abspannseil', quantity: 27 }, // PLATZHALTER
    ...heringe({ seitenwand: 27 }), // PLATZHALTER
    { articleId: 'blockseilrolle', quantity: 3 }, // PLATZHALTER
    { articleId: 'aufzugseil', quantity: 3 } // PLATZHALTER
  ]
}
