import { useClientService, useSpacesStore, useUserStore } from '@opencloud-eu/web-pkg'
import type { SpaceResource } from '@opencloud-eu/web-client'
import { parseStockFile } from '../domain/schema'
import type { StockFile } from '../domain/types'
import { getAppConfig } from './appConfig'
import type { DataStore, Versioned } from './DataStore'
import { useWatchFile } from './fileEvents'
import { readStorageConfig, resolveLocation, type ResolvedLocation } from './location'
import { useSpacesReady } from './spaces'
import { createWebDavFiles, WebDavDataStore } from './WebDavDataStore'

/**
 * Liefert eine Funktion, die den konfigurierten Ablageort der Bestandsdatei auflöst (Space und
 * Pfad). Muss in setup() aufgerufen werden.
 */
export function useStockLocation(): () => Promise<ResolvedLocation<SpaceResource>> {
  const spacesStore = useSpacesStore()
  const spacesReady = useSpacesReady()
  return async () => {
    const config = readStorageConfig(getAppConfig())
    await spacesReady()
    return resolveLocation<SpaceResource>(config, spacesStore.spaces)
  }
}

/**
 * Erzeugt den DataStore für den Betrieb in OpenCloud (WebDavDataStore).
 * Muss innerhalb von setup() einer Komponente aufgerufen werden. Der Space wird erst beim
 * ersten Zugriff gesucht (die Spaces sind beim Start der Komponente evtl. noch nicht geladen).
 */
export function createStore(): DataStore {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const userStore = useUserStore()
  const stockLocation = useStockLocation()
  const watchFile = useWatchFile()

  let pending: Promise<WebDavDataStore> | undefined

  async function build(): Promise<WebDavDataStore> {
    const { space, path } = await stockLocation()

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
    saveStock: async (file, etag) => (await store()).saveStock(file, etag),
    watchStock: (listener) => {
      // Die Datei kann noch fehlen; ihre ID wird beim ersten passenden Ereignis nachgeschlagen.
      let fileId: string | undefined
      const resolveFileId = async () => {
        const { space, path } = await stockLocation()
        const info = await clientService.webdav.getFileInfo(space, { path })
        fileId = info.fileId || info.id || undefined
        return fileId
      }
      void resolveFileId().catch((): undefined => undefined)
      return watchFile({ fileId: () => fileId, resolveFileId }, listener)
    }
  }
}
