/**
 * Hält die vom Server gelieferte App-Konfiguration (`applicationConfig` aus setup()),
 * damit createStore() sie später innerhalb einer Komponente lesen kann.
 */
let config: Record<string, unknown> = {}

export function setAppConfig(value: Record<string, unknown> | undefined): void {
  config = value ?? {}
}

export function getAppConfig(): Record<string, unknown> {
  return config
}
