import type { TentType } from '../../types'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const ovaljurte: TentType = {
  id: 'ovaljurte',
  name: 'Ovaljurte',
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
  fixed: [
    { articleId: 'jurtendaechle', quantity: 1 }, // PLATZHALTER
    { articleId: 'ovaljurtenspinne', quantity: 1 },
    { articleId: 'mast-375', quantity: 2 },
    { articleId: 'seitenstange', quantity: 14 },
    { articleId: 'abspannseil', quantity: 14 },
    { articleId: 'hering', quantity: 14 },
    { articleId: 'blockseilrolle', quantity: 2 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
