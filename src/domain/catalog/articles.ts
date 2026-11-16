import type { Article, Finish, WallRole } from '../types'

const FINISH_NAME: Record<Finish, string> = {
  blanko: 'Blanko',
  fenster: 'Fenster',
  gaze: 'Gaze'
}

const SPAN_NAME = { 1: 'einzel', 2: 'doppel' } as const
const WIDTH = { 1: 165, 2: 323 } as const

/** Ein Wandmaterial-Artikel; Id und Name ergeben sich aus Rolle, Spannweite und Ausführung. */
function wandArtikel(
  role: WallRole,
  span: 1 | 2,
  finish: Finish,
  baseName: string,
  height: number
): Article {
  const idFinish = role === 'normalbahn' ? '' : `-${finish}`
  const nameFinish = role === 'normalbahn' ? '' : `, ${FINISH_NAME[finish]}`
  return {
    id: `${role}-${SPAN_NAME[span]}${idFinish}`,
    name: `${baseName} ${SPAN_NAME[span]}${nameFinish} (${WIDTH[span]} × ${height} cm)`,
    category: 'wand',
    wall: { role, span, finish }
  }
}

const FINISHES: Finish[] = ['blanko', 'fenster', 'gaze']
const SPANS: (1 | 2)[] = [1, 2]

const wand: Article[] = [
  // Normalbahn: nur blanko (Viereckzeltbahn 165 × 165, Doppelzeltbahn 323 × 165)
  ...SPANS.map((span) => wandArtikel('normalbahn', span, 'blanko', 'Normalbahn', 165)),
  // Superbahn: Viereckzeltbahn XL 165 × 209, Doppelzeltbahn XL 323 × 209
  ...SPANS.flatMap((span) =>
    FINISHES.map((finish) => wandArtikel('superbahn', span, finish, 'Superbahn', 209))
  ),
  // Erweiterungsstreifen 165 × 51 bzw. 323 × 51
  ...SPANS.flatMap((span) =>
    FINISHES.map((finish) =>
      wandArtikel('erweiterungsstreifen', span, finish, 'Erweiterungsstreifen', 51)
    )
  ),
  // Kohten-Seitenwand 45 cm; ein Stück reicht einmal um die ganze Kohte
  {
    id: 'erdstreifen-kohte',
    name: 'Erdstreifen Kohte (Kohten-Seitenwand, 45 cm)',
    category: 'wand',
    wall: { role: 'erdstreifen', span: 1, finish: 'blanko' }
  }
]

export const articles: Article[] = [
  // Dach und Planen
  { id: 'kohtenblatt', name: 'Kohtenblatt', category: 'dach' },
  { id: 'jurtendach', name: 'Jurtendach', category: 'dach' },
  { id: 'halbjurtendach', name: 'Halbjurtendach', category: 'dach' },
  { id: 'grossjurtendach', name: 'Großjurtendach', category: 'dach' },
  { id: 'gigajurtendach', name: 'Gigajurtendach', category: 'dach' },
  { id: 'jurten-zwischendachteil', name: 'Jurten-Zwischendachteil', category: 'dach' },
  { id: 'dreiecksdachteil', name: 'Dreiecksdachteil', category: 'dach' },
  { id: 'kohtendaechle', name: 'Kohtendächle', category: 'dach' },
  { id: 'jurtendaechle', name: 'Jurtendächle', category: 'dach' },
  { id: 'grossjurtendaechle', name: 'Großjurtendächle', category: 'dach' },
  { id: 'gigajurtendaechle', name: 'Gigajurtendächle', category: 'dach' },
  { id: 'zelthaut-sudan', name: 'Zelthaut Sudan', category: 'dach' },
  { id: 'zelthaut-yellowstone', name: 'Zelthaut Yellowstone', category: 'dach' },

  // Seitenwand
  ...wand,

  // Stangen und Gestänge
  { id: 'mast-375', name: 'Kohtenstange / Mast 375 cm', category: 'stange', cuttable: true },
  { id: 'mast-500', name: 'Mast 500 cm', category: 'stange', cuttable: true },
  { id: 'seitenstange', name: 'Seitenstange (verstellbar)', category: 'stange', cuttable: true },
  { id: 'gestaengesatz-sudan', name: 'Gestängesatz Sudan', category: 'stange' },
  { id: 'mittelmast-yellowstone', name: 'Mittelmast Yellowstone', category: 'stange' },

  // Heringe und Abspannung
  { id: 'abspannseil', name: 'Abspannseil', category: 'abspannung' },
  { id: 'hering', name: 'Hering (T-Eisen)', category: 'abspannung' },
  { id: 'bodennagel', name: 'Bodennagel', category: 'abspannung' },
  { id: 'aufzugseil', name: 'Aufzugseil', category: 'abspannung' },

  // Kleinteile
  { id: 'kohtenkreuz', name: 'Kohtenkreuz', category: 'kleinteil' },
  { id: 'jurtenspinne-6', name: 'Jurtenspinne 6er', category: 'kleinteil' },
  { id: 'jurtenspinne-8', name: 'Jurtenspinne 8er', category: 'kleinteil' },
  { id: 'jurtenspinne-9', name: 'Jurtenspinne 9er', category: 'kleinteil' },
  { id: 'ovaljurtenspinne', name: 'Ovaljurtenspinne', category: 'kleinteil' },
  { id: 'blockseilrolle', name: 'Blockseilrolle', category: 'kleinteil' },

  // Bodenplanen
  { id: 'bodenplane-rund', name: 'Bodenplane rund (Sudan)', category: 'boden' },
  { id: 'bodenplane-eckig', name: 'Bodenplane eckig (Yellowstone)', category: 'boden' }
]
