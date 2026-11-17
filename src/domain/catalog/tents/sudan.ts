import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { keineWand } from '../walls'

export const sudan: TentType = {
  id: 'sudan',
  name: 'Sudan',
  roofs: [
    {
      id: 'zelthaut',
      label: 'Zelthaut',
      parts: [{ articleId: 'zelthaut-sudan', quantity: 1 }] // PLATZHALTER
    }
  ],
  walls: [keineWand()],
  fixed: [
    { articleId: 'gestaengesatz-sudan', quantity: 1 }, // PLATZHALTER
    ...heringe({ seitenwand: 16 }), // PLATZHALTER
    { articleId: 'bodenplane-rund', quantity: 1 } // PLATZHALTER
  ]
}
