import { useAuthStore, useCapabilityStore, useClientService } from '@opencloud-eu/web-pkg'
import type { ChangeListener } from './DataStore'
import { normalizeEtag } from './WebDavDataStore'

/** Ein Server-Ereignis zu einer Datei (Server-Sent Events von OpenCloud). */
export interface FileEvent {
  itemid?: string
  spaceid?: string
  initiatorid?: string
  etag?: string
}

/**
 * Meldet, wenn eine bestimmte Datei woanders geändert wurde. Liefert eine Abmeldefunktion.
 * `fileId` darf unbekannt sein (Datei existiert noch nicht); dann wird er bei Bedarf über
 * `resolveFileId` nachgeschlagen.
 */
export type WatchFile = (
  target: { fileId: () => string | undefined; resolveFileId?: () => Promise<string | undefined> },
  listener: ChangeListener
) => () => void

/** Ereignisse, nach denen der Dateiinhalt neu ist (wie OpenClouds useExternalFileUpdates). */
export const CHANGE_EVENTS = ['file-touched', 'postprocessing-finished'] as const

export function parseFileEvent(data: unknown): FileEvent | null {
  if (typeof data !== 'string') return null
  try {
    const json = JSON.parse(data) as unknown
    return json && typeof json === 'object' ? (json as FileEvent) : null
  } catch {
    return null
  }
}

interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void
}

/**
 * Baut `WatchFile` auf einer Ereignisquelle. `ownInitiator` ist die Kennung dieses Browser-Tabs:
 * Eigene Speicherungen werden nicht gemeldet.
 */
export function createWatchFile(
  source: () => EventSourceLike | null,
  ownInitiator: () => string | undefined
): WatchFile {
  return (target, listener) => {
    const events = source()
    if (!events) return () => {}

    let resolving: Promise<string | undefined> | null = null
    let resolved: string | undefined

    async function idOf(): Promise<string | undefined> {
      const known = target.fileId() ?? resolved
      if (known || !target.resolveFileId) return known
      resolving ??= target
        .resolveFileId()
        .catch((): undefined => undefined)
        .finally(() => (resolving = null))
      resolved = await resolving
      return resolved
    }

    const handler = (message: MessageEvent) => {
      const event = parseFileEvent(message.data)
      if (!event?.itemid) return
      const own = ownInitiator()
      if (own && event.initiatorid === own) return
      void idOf().then((id) => {
        if (id && id === event.itemid) {
          listener({ etag: normalizeEtag(event.etag) })
        }
      })
    }

    for (const type of CHANGE_EVENTS) events.addEventListener(type, handler)
    return () => {
      for (const type of CHANGE_EVENTS) events.removeEventListener(type, handler)
    }
  }
}

/**
 * `WatchFile` für den Betrieb in OpenCloud. Muss in setup() aufgerufen werden. Ohne
 * SSE-Unterstützung (oder über öffentliche Links) meldet es nichts.
 */
export function useWatchFile(): WatchFile {
  const clientService = useClientService()
  const capabilityStore = useCapabilityStore()
  const authStore = useAuthStore()
  return createWatchFile(
    () => {
      if (!capabilityStore.supportSSE || !authStore.accessToken) return null
      try {
        return clientService.sseAuthenticated
      } catch {
        return null
      }
    },
    () => clientService.initiatorId
  )
}
