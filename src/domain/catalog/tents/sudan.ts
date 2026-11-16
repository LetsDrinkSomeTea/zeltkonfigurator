import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { sudan as sudanDach } from '../modules'
import { keineWand } from '../walls'

export const sudan: TentType = {
  id: 'sudan',
  name: 'Sudan',
  modules: [sudanDach],
  walls: [keineWand()],
  fixed: [
    ...heringe({ seitenwand: 16 }), // PLATZHALTER
    { articleId: 'bodenplane-rund', quantity: 1 } // PLATZHALTER
  ]
}
