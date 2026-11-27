'use client'

// Modo Live: para mostrarle la pantalla a un cliente. Una clase en <html> oculta los símbolos y los
// códigos de moneda de toda la app; los números se ven (los imprime <Monto>). El estado de la pantalla
// vive en esa clase: la pone `<GuionLive>` antes del primer pintado y la conmuta `ponerElLive()`, que
// además lo deja en `localStorage` (las otras pestañas) y en la cookie `modo-live` (el servidor, que con
// ella encendida no dibuja lo que ocultan los ajustes del Live). Conmutar desde la interfaz es
// `useConmutarElLive()` (`proveedor-del-live.tsx`): navega para que el servidor vuelva a dibujar.
import { useSyncExternalStore } from 'react'
import { CLASE_LIVE, CLAVE_LIVE, cookieDelLive } from '@/shared/lib/modo-live'

const EVENTO = 'modo-live:cambio'

function suscribir(alCambiar: () => void): () => void {
  // `storage` avisa cuando lo cambió otra pestaña: todas quedan iguales.
  function alCambiarEnOtraPestana(evento: StorageEvent) {
    if (evento.key === CLAVE_LIVE) {
      document.documentElement.classList.toggle(CLASE_LIVE, evento.newValue === '1')
      alCambiar()
    }
  }
  window.addEventListener(EVENTO, alCambiar)
  window.addEventListener('storage', alCambiarEnOtraPestana)
  return () => {
    window.removeEventListener(EVENTO, alCambiar)
    window.removeEventListener('storage', alCambiarEnOtraPestana)
  }
}

export function leerElLive(): boolean {
  return document.documentElement.classList.contains(CLASE_LIVE)
}

export function ponerElLive(encendido: boolean): void {
  document.documentElement.classList.toggle(CLASE_LIVE, encendido)
  try {
    localStorage.setItem(CLAVE_LIVE, encendido ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado estricto) el modo vale igual hasta recargar.
  }
  document.cookie = cookieDelLive(encendido, window.location.protocol === 'https:')
  window.dispatchEvent(new Event(EVENTO))
}

function alternar(): void {
  ponerElLive(!leerElLive())
}

export function useLive(): { live: boolean; alternar: () => void } {
  // En el servidor no se sabe: se renderiza apagado y el CSS ya elige la versión sin moneda.
  const live = useSyncExternalStore(suscribir, leerElLive, () => false)
  return { live, alternar }
}
