import type { RoofModule } from '../types'

/**
 * Namen der Dächer eines Zeltes für die Anzeige: leer bei nur einem Dach; sonst der Name des
 * Bausteins, nummeriert nur, wenn er mehrfach vorkommt („Jurte 1“, „Jurte 2“ … bzw. „Kohte“).
 */
export function roofNames(modules: Pick<RoofModule, 'name'>[]): string[] {
  if (modules.length <= 1) return modules.map(() => '')
  const total = new Map<string, number>()
  for (const m of modules) total.set(m.name, (total.get(m.name) ?? 0) + 1)
  const seen = new Map<string, number>()
  return modules.map((m) => {
    const n = (seen.get(m.name) ?? 0) + 1
    seen.set(m.name, n)
    return (total.get(m.name) ?? 0) > 1 ? `${m.name} ${n}` : m.name
  })
}
