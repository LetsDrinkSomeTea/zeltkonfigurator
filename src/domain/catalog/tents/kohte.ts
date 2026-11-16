import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { erdstreifen, keineWand } from '../walls'

export const kohte: TentType = {
  id: 'kohte',
  name: 'Kohte',
  roofs: [
    {
      id: 'kohtenblaetter',
      label: '4 Kohtenblätter',
      parts: [{ articleId: 'kohtenblatt', quantity: 4 }]
    }
  ],
  walls: [keineWand('Ohne Erdstreifen'), erdstreifen()],
  defaults: { wallId: 'erdstreifen' },
  fixed: [
    { articleId: 'kohtendaechle', quantity: 1 },
    { articleId: 'kohtenkreuz', quantity: 1 },
    { articleId: 'mast-375', quantity: 2 },
    ...heringe({ seitenwand: 8, masten: 2 }),
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
