import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { kohte as kohteDach } from '../modules'
import { erdstreifen, keineWand } from '../walls'

export const kohte: TentType = {
  id: 'kohte',
  name: 'Kohte',
  modules: [kohteDach],
  walls: [keineWand('Ohne Erdstreifen'), erdstreifen()],
  defaults: { wallId: 'erdstreifen' },
  fixed: [...heringe({ seitenwand: 8 })]
}
