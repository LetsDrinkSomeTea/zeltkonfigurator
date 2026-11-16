import {
  useClientService,
  useSpacesLoading,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import type { SpaceResource } from '@opencloud-eu/web-client'
import { parsePacklistFile, parseStockFile } from '../domain/schema'
import type { PacklistFile, PacklistSummary, StockFile } from '../domain/types'
import { getAppConfig } from './appConfig'
import type { DataStore, Versioned } from './DataStore'
import { readStorageConfig, resolveLocation } from './location'
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
  const { waitForSpaces } = useSpacesLoading()

  let pending: Promise<WebDavDataStore> | undefined

  async function build(): Promise<WebDavDataStore> {
    const config = readStorageConfig(getAppConfig())
    if (!spacesStore.spacesInitialized && !spacesStore.spacesLoading) {
      await spacesStore.loadSpaces({ graphClient: clientService.graphAuthenticated })
    }
    await waitForSpaces()
    const { space, folder } = resolveLocation<SpaceResource>(config, spacesStore.spaces)

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
      folder,
      canWrite,
      parseStockFile,
      parsePacklistFile
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
    saveStock: async (file, etag) => (await store()).saveStock(file, etag),
    listPacklists: async (): Promise<PacklistSummary[]> => (await store()).listPacklists(),
    loadPacklist: async (id): Promise<Versioned<PacklistFile>> => (await store()).loadPacklist(id),
    savePacklist: async (file, etag) => (await store()).savePacklist(file, etag),
    deletePacklist: async (id) => (await store()).deletePacklist(id)
  }
}
