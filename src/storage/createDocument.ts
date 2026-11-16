import { unref } from 'vue'
import { useAppDefaults, useClientService } from '@opencloud-eu/web-pkg'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import { packlistName } from '../domain/fileNames'
import { parsePacklistFile } from '../domain/schema'
import { NotFoundError, type PacklistDocument } from './DataStore'
import { useSpacesReady } from './spaces'
import { createWebDavFiles, WebDavPacklistDocument } from './WebDavDataStore'

export const APP_ID = 'zeltkonfigurator'

/**
 * Die Packlisten-Datei, die OpenCloud gerade mit der App geöffnet hat (Space und Pfad stehen
 * in der Adresse). Muss innerhalb von setup() aufgerufen werden.
 */
export function createDocument(): PacklistDocument {
  const clientService = useClientService()
  const spacesReady = useSpacesReady()
  const { currentFileContext, getFileInfo, closeApp } = useAppDefaults({ applicationId: APP_ID })

  let pending: Promise<WebDavPacklistDocument> | undefined

  async function build(): Promise<WebDavPacklistDocument> {
    // Der Space zur Adresse lässt sich erst auflösen, wenn die Spaces geladen sind.
    await spacesReady()
    const context = unref(currentFileContext)
    const space = unref(context.space)
    const path = String(unref(context.item) ?? '').replace(/^\/+/, '')
    if (!space || !path) {
      throw new NotFoundError('Die Packliste wurde nicht gefunden.')
    }
    return new WebDavPacklistDocument({
      files: createWebDavFiles(clientService.webdav, space),
      path,
      parsePacklistFile,
      canWrite: async () => {
        const resource = await getFileInfo(currentFileContext)
        const permissions = resource.permissions ?? ''
        return [DavPermission.Updateable, DavPermission.FileUpdateable].some((p) =>
          permissions.includes(p)
        )
      }
    })
  }

  function doc(): Promise<WebDavPacklistDocument> {
    pending ??= build().catch((e) => {
      pending = undefined // beim nächsten Zugriff erneut versuchen
      throw e
    })
    return pending
  }

  return {
    get name() {
      const context = unref(currentFileContext)
      return packlistName(String(unref(context.fileName) || unref(context.path) || ''))
    },
    canWrite: async () => (await doc()).canWrite(),
    load: async () => (await doc()).load(),
    save: async (file, etag) => (await doc()).save(file, etag),
    close: () => closeApp()
  }
}
