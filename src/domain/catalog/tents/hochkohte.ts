import type { TentType } from '../../types'
import { hoheWand, normaleWand, nurStreifen } from '../walls'

export const hochkohte: TentType = {
  id: 'hochkohte',
  name: 'Hochkohte',
  roofs: [
    {
      id: 'kohtenblaetter',
      label: '4 Kohtenblätter',
      parts: [{ articleId: 'kohtenblatt', quantity: 4 }]
    }
  ],
  walls: [nurStreifen({ segmente: 8 }), normaleWand({ segmente: 8 }), hoheWand({ segmente: 8 })],
  // Standard: normale Wand aus Normalbahnen (gibt es nur blanko)
  defaults: { wallId: 'normal' },
  fixed: [
    { articleId: 'kohtendaechle', quantity: 1 },
    { articleId: 'kohtenkreuz', quantity: 1 },
    { articleId: 'mast-500', quantity: 2 }, // PLATZHALTER
    { articleId: 'seitenstange', quantity: 8 },
    { articleId: 'abspannseil', quantity: 8 }, // PLATZHALTER
    { articleId: 't-profil', quantity: 8 }, // PLATZHALTER
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
