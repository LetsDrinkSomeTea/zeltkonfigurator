import type { TentType } from '../../types'
import { heringe } from '../heringe'
import { hoheWand, keineWand, normaleWand } from '../walls'

/**
 * Cafélounge: Großjurte und Jurte, an zwei Stellen zusammengeknüpft, dazu eine Kohte, die an
 * einer Stelle mitgeknüpft ist. Groß- und Kleinjurte stehen auf dem Holzgestänge der Cafélounge
 * statt auf Masten, Spinne und Seitenstangen; die Kohte hat normales Gestänge.
 */
export const cafelounge: TentType = {
  id: 'cafelounge',
  name: 'Cafélounge',
  roofs: [
    {
      id: 'grossjurte-jurte-kohte',
      label: 'Großjurtendach + Jurtendach + 4 Kohtenblätter',
      parts: [
        { articleId: 'grossjurtendach', quantity: 1 },
        { articleId: 'jurtendach', quantity: 1 },
        { articleId: 'kohtenblatt', quantity: 4 }
      ]
    }
  ],
  // PLATZHALTER: 16 + 12 Segmente, abzüglich je 2 an den beiden Knüpfstellen
  walls: [keineWand(), normaleWand({ segmente: 24 }), hoheWand({ segmente: 24 })],
  defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' },
  fixed: [
    { articleId: 'grossjurtendaechle', quantity: 1 },
    { articleId: 'jurtendaechle', quantity: 1 },
    { articleId: 'kohtendaechle', quantity: 1 },
    { articleId: 'holzgestaenge-cafelounge', quantity: 2 }, // PLATZHALTER: je eins für Groß- und Kleinjurte
    // Kohte mit normalem Gestänge
    { articleId: 'kohtenkreuz', quantity: 1 },
    { articleId: 'mast-375', quantity: 2 },
    { articleId: 'abspannseil', quantity: 24 }, // PLATZHALTER
    ...heringe({ seitenwand: 24 + 8 }), // PLATZHALTER: Jurten-Seitenwand + Kohte
    { articleId: 'aufzugseil', quantity: 1 } // PLATZHALTER
  ]
}
