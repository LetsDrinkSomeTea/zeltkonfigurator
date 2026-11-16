import type { StockFile } from '../../src/domain/types'

const q = (quantity: number, note?: string) => ({ quantity, ...(note ? { note } : {}) })

/** Erfundener Beispielbestand für die Vorschau. */
export const sampleStock: StockFile = {
  schemaVersion: 1,
  stock: {
    kohtenblatt: q(24),
    jurtendach: q(2),
    grossjurtendach: q(1),
    kohtendaechle: q(4),
    jurtendaechle: q(2),
    grossjurtendaechle: q(1),
    kohtenkreuz: q(4),
    'jurtenspinne-6': q(2),
    'jurtenspinne-8': q(1),
    blockseilrolle: q(3),
    aufzugseil: q(6),
    't-profil': q(80, 'Kiste 3'),
    abspannseil: q(40),
    bodennagel: q(120),
    seitenstange: q(20),
    'mast-375': q(4),
    'normalbahn-einzel': q(6),
    'normalbahn-doppel': q(10),
    'superbahn-doppel-blanko': q(4),
    'superbahn-doppel-fenster': q(3),
    'superbahn-einzel-gaze': q(2),
    'erweiterungsstreifen-einzel-gaze': q(8),
    'erweiterungsstreifen-doppel-blanko': q(4),
    'erdstreifen-kohte': q(2),
    'alte-plane-1998': q(1, 'steht nicht mehr im Katalog')
  }
}
