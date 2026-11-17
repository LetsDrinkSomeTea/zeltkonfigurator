import type { Deviation } from '../types'

export type Translate = (msgid: string, params?: Record<string, string | number>) => string

/** Lesbare Zeile für eine Abweichung (F-26/F-27). */
export function describeDeviation(d: Deviation, $gettext: Translate): string {
  if (d.kind === 'dach') {
    const roof = d.roof ?? $gettext('Dach')
    return d.got === null
      ? $gettext('%{roof} unvollständig: %{wanted}', { roof, wanted: d.wanted })
      : $gettext('%{roof}: %{got} statt %{wanted}', { roof, got: d.got, wanted: d.wanted })
  }
  const n = d.segments ?? 0
  if (d.got === null) {
    return n === 1
      ? $gettext('1 Segment fehlt: %{wanted}', { wanted: d.wanted })
      : $gettext('%{n} Segmente fehlen: %{wanted}', { n, wanted: d.wanted })
  }
  return n === 1
    ? $gettext('1 Segment: %{got} statt %{wanted}', { got: d.got, wanted: d.wanted })
    : $gettext('%{n} Segmente: %{got} statt %{wanted}', { n, got: d.got, wanted: d.wanted })
}
