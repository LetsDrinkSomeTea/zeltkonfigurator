import { useClientService, useSpacesStore, useUserStore } from '@opencloud-eu/web-pkg'
import type { SpaceResource } from '@opencloud-eu/web-client'
import { parseStockFile } from '../domain/schema'
import type { StockFile } from '../domain/types'
import { getAppConfig } from './appConfig'
import type { DataStore, Versioned } from './DataStore'
import { readStorageConfig, resolveLocation } from './location'
import { useSpacesReady } from './spaces'
import { createWebDavFiles, WebDavDataStore } from './WebDavDataStore'

/**
 * Erzeugt den DataStore für den Betrieb in OpenCloud (WebDavDataStore).
 * Muss innerhalb von setup() einer Komponente aufgerufen werden. Der Space wird erst beim
 * ersten Zugriff gesucht (die Spaces sind beim Start der Komponente evtl. noch nicht geladen).
 */
export function createStore(): DataStore {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const userStore = useUserStore()
  const spacesReady = useSpacesReady()

  let pending: Promise<WebDavDataStore> | undefined

  async function build(): Promise<WebDavDataStore> {
    const config = readStorageConfig(getAppConfig())
    await spacesReady()
    const { space, path } = resolveLocation<SpaceResource>(config, spacesStore.spaces)

    const canWrite = async (): Promise<boolean> => {
      // Die Berechtigungen eines Space werden erst beim Öffnen geladen.
      await spacesStore.loadGraphPermissions({
        ids: [space.id],
        graphClient: clientService.graphAuthenticated
      })
      const current = spacesStore.getSpace(space.id) ?? space
      return !!current.canUpload?.({ user: userStore.user })
    }

    return new WebDavDataStore({
      files: createWebDavFiles(clientService.webdav, space),
      path,
      canWrite,
      parseStockFile
    })
  }

  function store(): Promise<WebDavDataStore> {
    pending ??= build().catch((e) => {
      pending = undefined // beim nächsten Zugriff erneut versuchen
      throw e
    })
    return pending
  }

  return {
    canWrite: async () => (await store()).canWrite(),
    loadStock: async (): Promise<Versioned<StockFile>> => (await store()).loadStock(),
    saveStock: async (file, etag) => (await store()).saveStock(file, etag)
  }
}
