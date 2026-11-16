import type { TentType } from '../../types'
import { keineWand } from '../walls'

export const yellowstone: TentType = {
  id: 'yellowstone',
  name: 'Yellowstone',
  roofs: [
    {
      id: 'zelthaut',
      label: 'Zelthaut (Pyramidenzelt 410 × 410 cm)',
      parts: [{ articleId: 'zelthaut-yellowstone', quantity: 1 }]
    }
  ],
  walls: [keineWand()],
  fixed: [
    { articleId: 'mittelmast-yellowstone', quantity: 1 }, // PLATZHALTER (O-2)
    { articleId: 'hering', quantity: 16 }, // PLATZHALTER
    { articleId: 'bodenplane-eckig', quantity: 1 } // PLATZHALTER
  ]
}
