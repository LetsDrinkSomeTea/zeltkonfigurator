import { inject, provide, type InjectionKey } from 'vue'
import type { DataStore } from '../storage/DataStore'
import { createStore } from '../storage/createStore'

export const storeKey: InjectionKey<DataStore> = Symbol('zeltkonfigurator-store')

let cached: DataStore | null = null

export function provideStore(store: DataStore): void {
  provide(storeKey, store)
}

/** Liefert den bereitgestellten Store, sonst einmalig den echten (createStore). */
export function useStore(): DataStore {
  const injected = inject(storeKey, null)
  if (injected) {
    return injected
  }
  cached ??= createStore()
  return cached
}

export function resetStoreForTests(): void {
  cached = null
}
