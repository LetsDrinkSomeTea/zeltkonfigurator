import {
  DEFAULT_FINISH_ORDER,
  FINISH_ROLES,
  type Article,
  type Finish,
  type Part,
  type Stock,
  type WallBuild,
  type WallRole
} from './types'

/** Eine Bauart in einer Ausführung. Ohne Ausführungs-Lage ist `finish` ohne Bedeutung. */
export interface WallVariant {
  build: WallBuild
  finish: Finish
}

export interface WallPlan {
  /** gedeckte Segmente je Variante, in Reihenfolge der Varianten (nur k > 0) */
  covered: { variant: WallVariant; segments: number }[]
  /** Segmente, die keine Variante decken konnte */
  uncovered: number
  /** aus dem Bestand gebucht */
  taken: Part[]
  /** nicht gedeckt, in der Wunsch-Variante gezählt */
  missing: Part[]
}

export function hasFinishLayer(build: WallBuild): boolean {
  return build.layers.some((r) => FINISH_ROLES.includes(r))
}

/** Ausführung, die für eine Lage tatsächlich gilt. */
function layerFinish(role: WallRole, finish: Finish): Finish {
  return FINISH_ROLES.includes(role) ? finish : 'blanko'
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Lesbare Bezeichnung, z. B. "Superbahn Fenster"; ohne Ausführung bei Bauarten ohne Ausführungs-Lage. */
export function variantLabel(v: WallVariant): string {
  return hasFinishLayer(v.build) ? `${v.build.label} ${capitalize(v.finish)}` : v.build.label
}

/** Geordnete Varianten nach Anforderungen 5.4, ohne Duplikate. */
export function buildVariants(
  builds: WallBuild[],
  preferred: WallBuild,
  finish: Finish,
  finishOrder: Finish[]
): WallVariant[] {
  const others = builds.filter((b) => b.id !== preferred.id)
  const order = [...finishOrder]
  for (const f of DEFAULT_FINISH_ORDER) if (!order.includes(f)) order.push(f)
  const otherFinishes = order.filter((f) => f !== finish)

  const raw: WallVariant[] = [{ build: preferred, finish }]
  for (const build of others) raw.push({ build, finish })
  for (const f of otherFinishes) raw.push({ build: preferred, finish: f })
  for (const f of otherFinishes) for (const build of others) raw.push({ build, finish: f })

  const seen = new Set<string>()
  return raw.filter((v) => {
    const key = `${v.build.id}|${hasFinishLayer(v.build) ? v.finish : ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matching(articles: Article[], role: WallRole, span: 1 | 2, finish: Finish): Article[] {
  return articles.filter(
    (a) => a.wall?.role === role && a.wall.span === span && a.wall.finish === finish
  )
}

function free(articles: Article[], stock: Stock): number {
  return articles.reduce((sum, a) => sum + Math.max(0, stock[a.id] ?? 0), 0)
}

/** Kann eine Lage genau k Segmente decken? Doppelteile zuerst (d maximal). */
function canCover(k: number, doubles: number, singles: number): boolean {
  const d = Math.min(doubles, Math.floor(k / 2))
  return k - 2 * d <= singles
}

/** Bucht `count` Stück aus den Artikeln in Katalogreihenfolge. */
function take(articles: Article[], count: number, stock: Stock, out: Part[]): void {
  let left = count
  for (const a of articles) {
    if (left <= 0) return
    const n = Math.min(left, Math.max(0, stock[a.id] ?? 0))
    if (n <= 0) continue
    stock[a.id] = (stock[a.id] ?? 0) - n
    out.push({ articleId: a.id, quantity: n })
    left -= n
  }
}

/** Fehlteile einer Lage: Doppelteile zuerst, dann ggf. Ausweichen auf andere Spanne/Ausführung. */
function missingForLayer(
  articles: Article[],
  role: WallRole,
  finish: Finish,
  rest: number
): Part[] {
  const find = (span: 1 | 2, fin?: Finish) =>
    articles.find(
      (a) =>
        a.wall?.role === role &&
        a.wall.span === span &&
        (fin === undefined || a.wall.finish === fin)
    )
  let dbl = find(2, finish)
  let sgl = find(1, finish)
  if (!dbl && !sgl) {
    dbl = find(2)
    sgl = find(1)
  }
  let d = Math.floor(rest / 2)
  let s = rest % 2
  if (!dbl) {
    s += 2 * d
    d = 0
  }
  if (!sgl) {
    d += s
    s = 0
  }
  const parts: Part[] = []
  if (d > 0 && dbl) parts.push({ articleId: dbl.id, quantity: d })
  if (s > 0 && sgl) parts.push({ articleId: sgl.id, quantity: s })
  return parts
}

/**
 * Deckt `segments` Wandsegmente. Mutiert `stock` (Arbeitskopie des Bestands).
 */
export function coverWalls(
  segments: number,
  builds: WallBuild[],
  preferred: WallBuild,
  finish: Finish,
  finishOrder: Finish[],
  articles: Article[],
  stock: Stock
): WallPlan {
  const plan: WallPlan = { covered: [], uncovered: segments, taken: [], missing: [] }
  const variants = buildVariants(builds, preferred, finish, finishOrder)

  for (const variant of variants) {
    if (plan.uncovered <= 0) break
    const layers = variant.build.layers.map((role) => {
      const fin = layerFinish(role, variant.finish)
      return {
        doubles: matching(articles, role, 2, fin),
        singles: matching(articles, role, 1, fin)
      }
    })
    // Größtes k, das ALLE Lagen genau decken können (Parität bei reinen Doppelteilen beachten).
    const avail = layers.map((l) => ({ d: free(l.doubles, stock), s: free(l.singles, stock) }))
    let k = plan.uncovered
    while (k > 0 && !avail.every((a) => canCover(k, a.d, a.s))) k--
    if (k <= 0) continue
    for (const l of layers) {
      const d = Math.min(free(l.doubles, stock), Math.floor(k / 2))
      take(l.doubles, d, stock, plan.taken)
      take(l.singles, k - 2 * d, stock, plan.taken)
    }
    plan.covered.push({ variant, segments: k })
    plan.uncovered -= k
  }

  if (plan.uncovered > 0) {
    for (const role of preferred.layers) {
      plan.missing.push(
        ...missingForLayer(articles, role, layerFinish(role, finish), plan.uncovered)
      )
    }
  }
  return plan
}
