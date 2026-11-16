import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hochkohte as hochkohteDach } from '../modules'
import { hoheWand, normaleWand, nurStreifen } from '../walls'

export const hochkohte: TentType = {
  id: 'hochkohte',
  name: 'Hochkohte',
  modules: [hochkohteDach],
  walls: [nurStreifen({ segmente: 8 }), normaleWand({ segmente: 8 }), hoheWand({ segmente: 8 })],
  defaults: { wallId: 'normal' },
  fixed: [
    { articleId: 'seitenstange', quantity: 8 },
    { articleId: 'abspannseil', quantity: 8 }, // PLATZHALTER
    ...heringe({ seitenwand: 8 }) // PLATZHALTER
  ]
}
