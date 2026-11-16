import { useClientService, useSpacesLoading, useSpacesStore } from '@opencloud-eu/web-pkg'

/**
 * Liefert eine Funktion, die wartet, bis die Spaces geladen sind (und das Laden anstößt, falls
 * es noch niemand getan hat). Muss in setup() aufgerufen werden.
 */
export function useSpacesReady(): () => Promise<void> {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const { waitForSpaces } = useSpacesLoading()

  return async () => {
    if (!spacesStore.spacesInitialized && !spacesStore.spacesLoading) {
      await spacesStore.loadSpaces({ graphClient: clientService.graphAuthenticated })
    }
    await waitForSpaces()
  }
}
