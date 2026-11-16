import type { TentType } from '../../types'
import { hoheWand, keineWand, normaleWand } from '../walls'

export const jurte: TentType = {
  id: 'jurte',
  name: 'Jurte',
  roofs: [
    { id: 'jurtendach', label: 'Jurtendach', parts: [{ articleId: 'jurtendach', quantity: 1 }] },
    {
      id: 'kohtenblaetter',
      label: '6 Kohtenblätter',
      parts: [{ articleId: 'kohtenblatt', quantity: 6 }]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 12 }), hoheWand({ segmente: 12 })],
  // Standard: hohe Wand aus Superbahnen mit Gaze
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'jurtendaechle', quantity: 1 },
    { articleId: 'jurtenspinne-6', quantity: 1 },
    { articleId: 'mast-375', quantity: 3 },
    { articleId: 'seitenstange', quantity: 12 },
    { articleId: 'abspannseil', quantity: 12 },
    { articleId: 't-profil', quantity: 12 },
    { articleId: 'blockseilrolle', quantity: 1 },
    { articleId: 'aufzugseil', quantity: 1 }
  ]
}
