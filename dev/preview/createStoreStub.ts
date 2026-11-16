import type { DataStore } from '../../src/storage/DataStore'

export function createStore(): DataStore {
  throw new Error('Die Vorschau stellt den Store über provideStore bereit.')
}
