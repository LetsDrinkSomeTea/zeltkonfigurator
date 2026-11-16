import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { jurte } from '../modules'
import { hoheWand, keineWand, normaleWand } from '../walls'

/** Drei Jurten mit einem Dreiecksdachteil in der Mitte; jedes Jurtendach wird einzeln eingestellt. */
export const dreierjurtenburg: TentType = {
  id: 'dreierjurtenburg',
  name: 'Dreierjurtenburg',
  modules: [jurte, jurte, jurte],
  // PLATZHALTER: 27 Wandsegmente (geometrisch abgeleitet)
  walls: [keineWand(), normaleWand({ segmente: 27 }), hoheWand({ segmente: 27 })],
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'dreiecksdachteil', quantity: 1 },
    { articleId: 'seitenstange', quantity: 27 }, // PLATZHALTER
    { articleId: 'abspannseil', quantity: 27 }, // PLATZHALTER
    ...heringe({ seitenwand: 27 }) // PLATZHALTER
  ]
}
