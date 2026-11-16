import type { TentTypeData } from '../types'
import { heringe } from './heringe'
import { holzgestaenge } from './modules'

const JURTEN_WAND = ['keine', 'normal', 'hoch'] as const
// Standard der Jurten: hohe Wand aus Superbahnen mit Gaze
const HOCH_SUPER_GAZE = { wallId: 'hoch', buildId: 'super', finish: 'gaze' } as const

/** Jurtenartiges Zelt: Seitenstangen, Abspannseile und Heringe je Wandsegment. */
function jurtenZelt(id: string, name: string, moduleId: string, segments: number): TentTypeData {
  return {
    id,
    name,
    modules: [{ moduleId }],
    wall: { segments, options: [...JURTEN_WAND] },
    defaults: { ...HOCH_SUPER_GAZE },
    fixed: [
      { articleId: 'seitenstange', quantity: segments },
      { articleId: 'abspannseil', quantity: segments },
      ...heringe({ seitenwand: segments })
    ]
  }
}

/** Mitgelieferte Zelttypen. Unsichere Werte sind mit PLATZHALTER markiert. */
export const defaultTentTypes: TentTypeData[] = [
  {
    id: 'kohte',
    name: 'Kohte',
    modules: [{ moduleId: 'kohte' }],
    wall: { segments: 1, options: ['keine', 'erdstreifen'] },
    defaults: { wallId: 'erdstreifen' },
    fixed: [...heringe({ seitenwand: 8 })]
  },
  {
    id: 'hochkohte',
    name: 'Hochkohte',
    modules: [{ moduleId: 'hochkohte' }],
    wall: { segments: 8, options: ['nur-streifen', 'normal', 'hoch'] },
    defaults: { wallId: 'normal' },
    fixed: [
      { articleId: 'seitenstange', quantity: 8 },
      { articleId: 'abspannseil', quantity: 8 }, // PLATZHALTER
      ...heringe({ seitenwand: 8 }) // PLATZHALTER
    ]
  },
  jurtenZelt('jurte', 'Jurte', 'jurte', 12),
  jurtenZelt('grossjurte', 'Großjurte', 'grossjurte', 16),
  jurtenZelt('gigajurte9', 'Gigajurte 9 m', 'gigajurte9', 18), // PLATZHALTER: Abspannung
  jurtenZelt('gigajurte12', 'Gigajurte 12 m', 'gigajurte12', 24), // PLATZHALTER: Abspannung
  jurtenZelt('theaterjurte', 'Theaterjurte', 'theaterjurte', 14),
  {
    // Drei Jurten mit einem Dreiecksdachteil in der Mitte; jedes Dach wird einzeln eingestellt.
    id: 'dreierjurtenburg',
    name: 'Dreierjurtenburg',
    modules: [{ moduleId: 'jurte' }, { moduleId: 'jurte' }, { moduleId: 'jurte' }],
    wall: { segments: 27, options: [...JURTEN_WAND] }, // PLATZHALTER: geometrisch abgeleitet
    defaults: { ...HOCH_SUPER_GAZE },
    fixed: [
      { articleId: 'dreiecksdachteil', quantity: 1 },
      { articleId: 'seitenstange', quantity: 27 }, // PLATZHALTER
      { articleId: 'abspannseil', quantity: 27 }, // PLATZHALTER
      ...heringe({ seitenwand: 27 }) // PLATZHALTER
    ]
  },
  {
    // Großjurte und Jurte, an zwei Stellen zusammengeknüpft, auf dem Holzgestänge der Cafélounge
    // (mit Winkeln); dazu eine mitgeknüpfte Kohte mit normalem Gestänge.
    id: 'cafelounge',
    name: 'Cafélounge',
    modules: [
      { moduleId: 'grossjurte', setups: [holzgestaenge()] },
      { moduleId: 'jurte', setups: [holzgestaenge()] },
      { moduleId: 'kohte' }
    ],
    // PLATZHALTER: 16 + 12 Segmente, abzüglich je 2 an den beiden Knüpfstellen
    wall: { segments: 24, options: [...JURTEN_WAND] },
    defaults: { ...HOCH_SUPER_GAZE },
    fixed: [
      { articleId: 'abspannseil', quantity: 24 }, // PLATZHALTER
      ...heringe({ seitenwand: 24 + 8 }) // PLATZHALTER: Jurten-Seitenwand + Kohte
    ]
  },
  {
    id: 'sudan',
    name: 'Sudan',
    modules: [{ moduleId: 'sudan' }],
    wall: { segments: 0, options: ['keine'] },
    fixed: [
      ...heringe({ seitenwand: 16 }), // PLATZHALTER
      { articleId: 'bodenplane-rund', quantity: 1 } // PLATZHALTER
    ]
  },
  {
    id: 'yellowstone',
    name: 'Yellowstone',
    modules: [{ moduleId: 'yellowstone' }],
    wall: { segments: 0, options: ['keine'] },
    fixed: [
      ...heringe({ seitenwand: 16 }), // PLATZHALTER
      { articleId: 'bodenplane-eckig', quantity: 1 } // PLATZHALTER
    ]
  }
]
