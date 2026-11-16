import type { AllocationResult, Catalog, Finish, Stock, TentConfig } from './types'

/** Berechnet Bedarf und Zuteilung aller Zelte gegen den Bestand. Umsetzung: AP 2. */
export function allocate(
  tents: TentConfig[],
  finishOrder: Finish[],
  catalog: Catalog,
  stock: Stock
): AllocationResult {
  void [tents, finishOrder, catalog, stock]
  throw new Error('not implemented')
}
