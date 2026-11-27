// Lo del navegador para los avisos push: soporte, permiso, service worker y suscripción. Sólo corre en el cliente y
// no importa nada del servidor. Quien guarda o quita la fila de la base es la action; esto es la mitad del navegador.
import { bytesDeClavePublica, textoDeClavePublica } from '../entities/clave-publica'

export type EstadoDelNavegador = {
  soporte: boolean
  permiso: NotificationPermission
  // El endpoint de la suscripción viva de este navegador, si la hay.
  endpoint: string | null
}

export function soportaPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Sin pedir permiso ni registrar nada: `getRegistration()` (no `ready`, que se cuelga si no hay registro).
export async function leerElNavegador(): Promise<EstadoDelNavegador> {
  if (!soportaPush()) {
    return { soporte: false, permiso: 'default', endpoint: null }
  }
  const registro = await navigator.serviceWorker.getRegistration('/')
  const suscripcion = (await registro?.pushManager.getSubscription()) ?? null
  return {
    soporte: true,
    permiso: Notification.permission,
    endpoint: suscripcion?.endpoint ?? null,
  }
}

export type SuscripcionDelNavegador = {
  endpoint: string
  claves: { p256dh: string; auth: string }
  userAgent: string | null
}

export type ResultadoDeEncender =
  | { ok: true; suscripcion: SuscripcionDelNavegador }
  | { ok: false; motivo: 'negado' | 'sin_clave' | 'fallo' }

// Pide el permiso si falta, registra el service worker (idempotente) y suscribe. No toca la base.
export async function suscribirEnElNavegador(clavePublica: string): Promise<ResultadoDeEncender> {
  const clave = bytesDeClavePublica(clavePublica)
  if (clave === null) {
    return { ok: false, motivo: 'sin_clave' }
  }
  try {
    const permiso =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    if (permiso !== 'granted') {
      return { ok: false, motivo: 'negado' }
    }
    const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: clave,
    })
    const { endpoint, keys } = suscripcion.toJSON()
    if (endpoint === undefined || keys?.['p256dh'] === undefined || keys['auth'] === undefined) {
      await suscripcion.unsubscribe()
      return { ok: false, motivo: 'fallo' }
    }
    return {
      ok: true,
      suscripcion: {
        endpoint,
        claves: { p256dh: keys['p256dh'], auth: keys['auth'] },
        userAgent: navigator.userAgent === '' ? null : navigator.userAgent,
      },
    }
  } catch {
    return { ok: false, motivo: 'fallo' }
  }
}

// Da de baja la suscripción local (si la hay). Sirve tanto para apagar como para deshacer un alta que la base rechazó.
export async function desuscribirEnElNavegador(): Promise<void> {
  if (!soportaPush()) return
  try {
    const registro = await navigator.serviceWorker.getRegistration('/')
    const suscripcion = await registro?.pushManager.getSubscription()
    await suscripcion?.unsubscribe()
  } catch {
    // Sin suscripción local no hay nada que deshacer: la fila de la base ya es lo que manda.
  }
}

export type BajaDelNavegador = { endpoint: string; clavePublica: string | null }

// Da de baja la suscripción local y dice cuál era y con qué clave pública se hizo (para volver a suscribir sin pedirla al servidor); nula si no
// había ninguna o no se pudo leer. El push silenciado por el Modo Live.
export async function darDeBajaEnElNavegador(): Promise<BajaDelNavegador | null> {
  if (!soportaPush()) return null
  try {
    const registro = await navigator.serviceWorker.getRegistration('/')
    const suscripcion = await registro?.pushManager.getSubscription()
    if (!suscripcion) return null
    const clave = suscripcion.options.applicationServerKey
    const baja = {
      endpoint: suscripcion.endpoint,
      clavePublica: clave === null ? null : textoDeClavePublica(clave),
    }
    await suscripcion.unsubscribe()
    return baja
  } catch {
    return null
  }
}
