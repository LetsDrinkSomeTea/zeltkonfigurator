import type {
  Article,
  Catalog,
  Finish,
  Stock,
  TentConfig,
  TentType,
  WallBuild,
  WallOption
} from '../../../src/domain/types'

const FINISHES: Finish[] = ['blanko', 'fenster', 'gaze']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const wallArticles: Article[] = [
  ...[1, 2].flatMap((span) => [
    {
      id: `nb-${span}`,
      name: `Normalbahn ${span === 1 ? 'einzel' : 'doppel'}`,
      category: 'wand' as const,
      wall: { role: 'normalbahn' as const, span: span as 1 | 2, finish: 'blanko' as const }
    }
  ]),
  ...(['superbahn', 'erweiterungsstreifen'] as const).flatMap((role) => {
    const prefix = role === 'superbahn' ? 'sb' : 'es'
    const label = role === 'superbahn' ? 'Superbahn' : 'Erweiterungsstreifen'
    return ([1, 2] as const).flatMap((span) =>
      FINISHES.map((finish) => ({
        id: `${prefix}-${span}-${finish}`,
        name: `${label} ${span === 1 ? 'einzel' : 'doppel'} ${cap(finish)}`,
        category: 'wand' as const,
        wall: { role, span, finish }
      }))
    )
  })
]

export const articles: Article[] = [
  { id: 'dach-jurte', name: 'Jurtendach', category: 'dach' },
  { id: 'kohtenblatt', name: 'Kohtenblatt', category: 'dach' },
  { id: 'mast', name: 'Mast', category: 'stange' },
  { id: 'seitenstange', name: 'Seitenstange', category: 'stange' },
  { id: 'daechle', name: 'Dächle', category: 'kleinteil' },
  { id: 'nagel', name: 'Bodennagel', category: 'kleinteil' },
  ...wallArticles
]

export const superBuild: WallBuild = { id: 'super', label: 'Superbahn', layers: ['superbahn'] }
export const streifenBuild: WallBuild = {
  id: 'normal+streifen',
  label: 'Normalbahn + Erweiterungsstreifen',
  layers: ['normalbahn', 'erweiterungsstreifen']
}
export const normalBuild: WallBuild = {
  id: 'normal',
  label: 'Normalbahn',
  layers: ['normalbahn']
}

function wall(id: string, segments: number, builds: WallBuild[]): WallOption {
  return {
    id,
    label: id,
    segments,
    builds,
    parts: segments > 0 ? [{ articleId: 'nagel', quantity: segments }] : []
  }
}

export const jurte: TentType = {
  id: 'jurte',
  name: 'Jurte',
  roofs: [
    { id: 'jurtendach', label: 'Jurtendach', parts: [{ articleId: 'dach-jurte', quantity: 1 }] },
    { id: 'kohten', label: '6 Kohtenblätter', parts: [{ articleId: 'kohtenblatt', quantity: 6 }] }
  ],
  walls: [
    wall('keine', 0, []),
    wall('normal', 4, [normalBuild]),
    wall('hoch', 4, [superBuild, streifenBuild]),
    wall('hoch5', 5, [superBuild, streifenBuild])
  ],
  fixed: [
    { articleId: 'daechle', quantity: 1 },
    { articleId: 'mast', quantity: 3 },
    { articleId: 'seitenstange', quantity: 2 }
  ]
}

export const catalog: Catalog = { articles, tentTypes: [jurte] }

/** Bestand mit allem Nicht-Wandmaterial reichlich, Wand nach Angabe. */
export function stockOf(extra: Stock = {}, base = true): Stock {
  return {
    ...(base
      ? { 'dach-jurte': 10, kohtenblatt: 20, mast: 20, seitenstange: 20, daechle: 10, nagel: 100 }
      : {}),
    ...extra
  }
}

export function tent(id: string, over: Partial<TentConfig> = {}): TentConfig {
  return {
    id,
    typeId: 'jurte',
    roofId: 'jurtendach',
    wallId: 'hoch',
    buildId: 'super',
    finish: 'fenster',
    ...over
  }
}

export const DEFAULT_ORDER: Finish[] = ['gaze', 'fenster', 'blanko']
