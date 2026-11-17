/**
 * Ruft `callback`, wenn der Browser-Tab wieder sichtbar wird. Fängt Änderungen ab, deren
 * Server-Ereignis verpasst wurde (Verbindung unterbrochen, öffentlicher Link ohne Ereignisse).
 * Liefert die Abmeldung.
 */
export function onVisible(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const handler = () => {
    if (document.visibilityState === 'visible') callback()
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
