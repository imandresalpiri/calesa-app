'use client'

// El Modo Live para el marco: si quien mira puede encenderlo, si el servidor dibujó con él encendido y cómo conmutarlo. Encender o apagar
// escribe la cookie y navega (`router.refresh()`): el servidor vuelve a dibujar con los ajustes. Al navegador viajan sólo esos dos booleanos.
import { useRouter } from 'next/navigation'
import { createContext, use, useEffect, useMemo, type ReactNode } from 'react'
import { CLAVE_LIVE, valorDeLaCookie } from '@/shared/lib/modo-live'
import { leerElLive, ponerElLive, useLive } from './live'
import { avisar, avisarHastaCerrar, terminarProgreso } from './toasts'

type ContextoDelLive = { puedeEncender: boolean; enElServidor: boolean }

const Contexto = createContext<ContextoDelLive>({ puedeEncender: false, enElServidor: false })

export const AVISO_SIN_PERMISO_DEL_LIVE = 'Tu rol ya no puede usar el Modo Live: se apagó.'
export const AVISO_DEL_LIVE_CAMBIADO = 'El Modo Live cambió.'
const ID_DEL_AVISO = 'live-cambio'

function leerLocal(): string | null {
  try {
    return localStorage.getItem(CLAVE_LIVE)
  } catch {
    return null
  }
}

// Al montar: quien ya no puede encenderlo lo encuentra apagado (con su aviso), y lo guardado antes de la cookie se pasa a la cookie. Otra
// pestaña que lo cambia deja un aviso con «Recargar» mientras lo dibujado no coincide.
function useSincronizarElLive(puedeEncender: boolean, enElServidor: boolean): void {
  const router = useRouter()
  const { live } = useLive()

  useEffect(() => {
    const cookie = valorDeLaCookie(document.cookie)
    if (!puedeEncender) {
      if (leerElLive() || cookie === '1') {
        ponerElLive(false)
        avisar(AVISO_SIN_PERMISO_DEL_LIVE)
      }
      return
    }
    if (cookie === undefined && leerLocal() === '1') {
      ponerElLive(true)
      router.refresh()
    }
  }, [puedeEncender, router])

  useEffect(() => {
    function alCambiarEnOtraPestana(evento: StorageEvent) {
      if (evento.key !== CLAVE_LIVE) {
        return
      }
      if ((evento.newValue === '1') === enElServidor) {
        terminarProgreso(ID_DEL_AVISO)
        return
      }
      avisarHastaCerrar(ID_DEL_AVISO, AVISO_DEL_LIVE_CAMBIADO, {
        etiqueta: 'Recargar',
        alHacer: () => {
          router.refresh()
        },
      })
    }
    window.addEventListener('storage', alCambiarEnOtraPestana)
    return () => {
      window.removeEventListener('storage', alCambiarEnOtraPestana)
    }
  }, [enElServidor, router])

  // Lo que dibujó el servidor ya coincide con la pantalla: el aviso sobra.
  useEffect(() => {
    if (live === enElServidor) {
      terminarProgreso(ID_DEL_AVISO)
    }
  }, [live, enElServidor])
}

export function ProveedorDelLive({
  puedeEncender,
  enElServidor,
  children,
}: ContextoDelLive & { children: ReactNode }) {
  useSincronizarElLive(puedeEncender, enElServidor)
  const valor = useMemo(() => ({ puedeEncender, enElServidor }), [puedeEncender, enElServidor])
  return <Contexto value={valor}>{children}</Contexto>
}

// Si el servidor dibujó esta pantalla con el Live encendido.
export function useLiveEnElServidor(): boolean {
  return use(Contexto).enElServidor
}

export function useConmutarElLive(): {
  live: boolean
  puedeEncender: boolean
  alternar: () => void
  salir: () => void
} {
  const router = useRouter()
  const { live } = useLive()
  const { puedeEncender } = use(Contexto)
  return {
    live,
    puedeEncender,
    alternar: () => {
      ponerElLive(!leerElLive())
      router.refresh()
    },
    salir: () => {
      ponerElLive(false)
      router.refresh()
    },
  }
}
