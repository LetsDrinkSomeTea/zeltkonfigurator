import { inject, provide, type InjectionKey } from 'vue'
import { createDocument } from '../storage/createDocument'
import type { DataStore, PacklistDocument } from '../storage/DataStore'
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

/** Liefert die gerade geöffnete Packlisten-Datei; wird in setup() aufgerufen. */
export type DocumentFactory = () => PacklistDocument

export const documentKey: InjectionKey<DocumentFactory> = Symbol('zeltkonfigurator-document')

/** Die geöffnete Packlisten-Datei: die bereitgestellte (Tests, Vorschau), sonst die aus OpenCloud. */
export function usePacklistDocument(): PacklistDocument {
  const factory = inject(documentKey, null)
  return factory ? factory() : createDocument()
}
