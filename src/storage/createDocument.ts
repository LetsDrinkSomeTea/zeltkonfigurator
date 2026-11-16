import { useClientService } from '@opencloud-eu/web-pkg'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { packlistName } from '../domain/fileNames'
import { parsePacklistFile } from '../domain/schema'
import { NotFoundError, type PacklistDocument } from './DataStore'
import { createWebDavFiles, WebDavPacklistDocument } from './WebDavDataStore'

export const APP_ID = 'zeltkonfigurator'

/** Die Datei, die OpenClouds App-Rahmen (AppWrapper) geladen hat und an die Ansicht übergibt. */
export interface OpenedFile {
  space: () => SpaceResource | undefined
  resource: () => Resource | undefined
  isReadOnly: () => boolean
}

/**
 * Die Packlisten-Datei, die OpenCloud gerade mit der App geöffnet hat. Space und Datei werden
 * bei jedem Zugriff neu gelesen: Wird die Datei im Rahmen umbenannt, gilt sofort der neue Pfad.
 * Muss innerhalb von setup() aufgerufen werden.
 */
export function createDocument(opened: OpenedFile): PacklistDocument {
  const clientService = useClientService()

  function doc(): WebDavPacklistDocument {
    const space = opened.space()
    const path = String(opened.resource()?.path ?? '').replace(/^\/+/, '')
    if (!space || !path) {
      throw new NotFoundError('Die Packliste wurde nicht gefunden.')
    }
    return new WebDavPacklistDocument({
      files: createWebDavFiles(clientService.webdav, space),
      path,
      parsePacklistFile,
      canWrite: () => Promise.resolve(!opened.isReadOnly())
    })
  }

  // Kein close(): Geschlossen wird über den App-Rahmen.
  return {
    get name() {
      const resource = opened.resource()
      return packlistName(String(resource?.name || resource?.path || ''))
    },
    canWrite: async () => await doc().canWrite(),
    load: async () => await doc().load(),
    save: async (file, etag) => await doc().save(file, etag)
  }
}
