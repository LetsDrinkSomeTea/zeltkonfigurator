import { computed, getCurrentInstance, type ComputedRef } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

/**
 * Router und aktuelle Route der umgebenden Anwendung.
 *
 * `useRouter()`/`useRoute()` aus dem eigenen vue-router-Paket liefern in OpenCloud `undefined`,
 * weil die App eine eigene Kopie von vue-router bündelt und deren Injection-Keys nicht zu dem
 * Router passen, den OpenCloud Web installiert hat. Die globalen `$router`/`$route` gehören
 * dagegen immer zum tatsächlich installierten Router.
 */
export function useAppRouter(): {
  router: Router
  route: ComputedRef<RouteLocationNormalizedLoaded>
} {
  const globals = getCurrentInstance()?.appContext.config.globalProperties
  if (!globals) {
    throw new Error('useAppRouter() muss in setup() aufgerufen werden.')
  }
  return {
    router: globals.$router,
    route: computed(() => globals.$route)
  }
}
