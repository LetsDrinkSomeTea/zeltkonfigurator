import type { Part, RoofModule, RoofSetup } from '../types'
import { heringe } from './heringe'

/** Normaler Aufbau mit dem Gestänge des Daches. */
export function gestellt(parts: Part[]): RoofSetup {
  return { id: 'gestellt', label: 'Gestellt', parts }
}

/**
 * Dach gehängt: 2 lange Mittelpfosten (Mast 500 cm) statt der normalen Masten, abgespannt mit
 * 4 × T-Profil 60 cm. `parts` sind die Teile, die bleiben (Spinne, Seilrolle, Aufzugseil).
 */
export function gehaengt(parts: Part[]): RoofSetup {
  return {
    id: 'gehaengt',
    label: 'Gehängt',
    parts: [...parts, { articleId: 'mast-500', quantity: 2 }, ...heringe({ lang: 4 })]
  }
}

/** Holzgestänge der Cafélounge (mit Winkeln) statt Masten, Spinne und Seitenstangen. */
export function holzgestaenge(): RoofSetup {
  return {
    id: 'holzgestaenge',
    label: 'Holzgestänge',
    parts: [{ articleId: 'holzgestaenge-cafelounge', quantity: 1 }]
  }
}

const jurtenAufhaengung = (spinne: string, blockseilrollen = 1): Part[] => [
  { articleId: spinne, quantity: 1 },
  { articleId: 'blockseilrolle', quantity: blockseilrollen },
  { articleId: 'aufzugseil', quantity: 1 }
]

export const kohte: RoofModule = {
  id: 'kohte',
  name: 'Kohte',
  roofs: [
    {
      id: 'kohtenblaetter',
      label: '4 Kohtenblätter',
      parts: [{ articleId: 'kohtenblatt', quantity: 4 }]
    }
  ],
  setups: [
    gestellt([
      { articleId: 'kohtenkreuz', quantity: 1 },
      { articleId: 'mast-375', quantity: 2 },
      { articleId: 'aufzugseil', quantity: 1 }
    ])
  ],
  parts: [{ articleId: 'kohtendaechle', quantity: 1 }]
}

export const hochkohte: RoofModule = {
  ...kohte,
  id: 'hochkohte',
  name: 'Hochkohte',
  setups: [
    gestellt([
      { articleId: 'kohtenkreuz', quantity: 1 },
      { articleId: 'mast-500', quantity: 2 }, // PLATZHALTER
      { articleId: 'aufzugseil', quantity: 1 }
    ])
  ]
}

export const jurte: RoofModule = {
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
  setups: [
    gestellt([...jurtenAufhaengung('jurtenspinne-6'), { articleId: 'mast-375', quantity: 3 }]),
    gehaengt(jurtenAufhaengung('jurtenspinne-6')),
    holzgestaenge()
  ],
  parts: [{ articleId: 'jurtendaechle', quantity: 1 }]
}

export const grossjurte: RoofModule = {
  id: 'grossjurte',
  name: 'Großjurte',
  roofs: [
    {
      id: 'grossjurtendach',
      label: 'Großjurtendach',
      parts: [{ articleId: 'grossjurtendach', quantity: 1 }]
    }
  ],
  setups: [
    gestellt([...jurtenAufhaengung('jurtenspinne-8'), { articleId: 'mast-500', quantity: 3 }]),
    gehaengt(jurtenAufhaengung('jurtenspinne-8')),
    holzgestaenge()
  ],
  parts: [{ articleId: 'grossjurtendaechle', quantity: 1 }]
}

const gigaSetups = [
  gestellt([
    ...jurtenAufhaengung('jurtenspinne-9'), // PLATZHALTER: Spinne
    { articleId: 'mast-500', quantity: 3 }, // PLATZHALTER
    ...heringe({ lang: 8 })
  ]),
  gehaengt(jurtenAufhaengung('jurtenspinne-9'))
]

export const gigajurte9: RoofModule = {
  id: 'gigajurte9',
  name: 'Gigajurte 9 m',
  roofs: [
    {
      id: 'gigajurtendach',
      label: 'Gigajurtendach',
      parts: [{ articleId: 'gigajurtendach', quantity: 1 }]
    }
  ],
  setups: gigaSetups,
  parts: [{ articleId: 'gigajurtendaechle', quantity: 1 }]
}

export const gigajurte12: RoofModule = {
  id: 'gigajurte12',
  name: 'Gigajurte 12 m',
  roofs: [
    {
      id: 'gigajurtendach-zwischenteile',
      label: 'Gigajurtendach + 12 Zwischendachteile + 6 Kohtenblätter',
      parts: [
        { articleId: 'gigajurtendach', quantity: 1 },
        { articleId: 'jurten-zwischendachteil', quantity: 12 },
        { articleId: 'kohtenblatt', quantity: 6 }
      ]
    }
  ],
  setups: gigaSetups,
  parts: [{ articleId: 'gigajurtendaechle', quantity: 1 }]
}

export const theaterjurte: RoofModule = {
  id: 'theaterjurte',
  name: 'Theaterjurte',
  roofs: [
    {
      id: 'halbjurtendaecher',
      label: '2 Halbjurtendächer + 2 Zwischendachteile',
      parts: [
        { articleId: 'halbjurtendach', quantity: 2 },
        { articleId: 'jurten-zwischendachteil', quantity: 2 }
      ]
    },
    {
      id: 'kohtenblaetter',
      label: '6 Kohtenblätter + 2 Zwischendachteile',
      parts: [
        { articleId: 'kohtenblatt', quantity: 6 }, // PLATZHALTER
        { articleId: 'jurten-zwischendachteil', quantity: 2 } // PLATZHALTER
      ]
    }
  ],
  setups: [
    gestellt([
      ...jurtenAufhaengung('theaterjurtenspinne', 2),
      { articleId: 'mast-375', quantity: 2 }
    ]),
    gehaengt(jurtenAufhaengung('theaterjurtenspinne', 2))
  ],
  parts: [{ articleId: 'theaterjurtendaechle', quantity: 1 }]
}

export const sudan: RoofModule = {
  id: 'sudan',
  name: 'Sudan',
  roofs: [
    {
      id: 'zelthaut',
      label: 'Zelthaut',
      parts: [{ articleId: 'zelthaut-sudan', quantity: 1 }] // PLATZHALTER
    }
  ],
  setups: [gestellt([{ articleId: 'gestaengesatz-sudan', quantity: 1 }])], // PLATZHALTER
  parts: []
}

export const yellowstone: RoofModule = {
  id: 'yellowstone',
  name: 'Yellowstone',
  roofs: [
    {
      id: 'zelthaut',
      label: 'Zelthaut (Pyramidenzelt 410 × 410 cm)',
      parts: [{ articleId: 'zelthaut-yellowstone', quantity: 1 }]
    }
  ],
  setups: [gestellt([{ articleId: 'mittelmast-yellowstone', quantity: 1 }])], // PLATZHALTER (O-2)
  parts: []
}

/** Mitgelieferte Dach-Bausteine. */
export const defaultModules: RoofModule[] = [
  kohte,
  hochkohte,
  jurte,
  grossjurte,
  gigajurte9,
  gigajurte12,
  theaterjurte,
  sudan,
  yellowstone
]
