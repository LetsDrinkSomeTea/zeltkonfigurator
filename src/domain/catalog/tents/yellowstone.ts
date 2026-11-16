import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { yellowstone as yellowstoneDach } from '../modules'
import { keineWand } from '../walls'

export const yellowstone: TentType = {
  id: 'yellowstone',
  name: 'Yellowstone',
  modules: [yellowstoneDach],
  walls: [keineWand()],
  fixed: [
    ...heringe({ seitenwand: 16 }), // PLATZHALTER
    { articleId: 'bodenplane-eckig', quantity: 1 } // PLATZHALTER
  ]
}
