'use client'

import { useEffect } from 'react'
import { useLiveEnElServidor } from '@/shared/ui/proveedor-del-live'
import { CLAVE_DEL_SILENCIO_DEL_PUSH, pasoDelSilencio } from '../../../entities/silencio-del-push'

function leerLaMarca(): string | null {
  try {
    return localStorage.getItem(CLAVE_DEL_SILENCIO_DEL_PUSH)
  } catch {
    return null
  }
}

// Del marco (sin dibujar nada): con el Live como lo dibujó el servidor (no cambia al hidratar) mira la marca del dispositivo y, sólo si hay que
// silenciar o reanudar el push, pide el código que lo hace (`silenciar-en-el-live.client.ts`).
export function SilencioDelPushEnElLive(): null {
  const enElLive = useLiveEnElServidor()
  useEffect(() => {
    if (pasoDelSilencio(enElLive, leerLaMarca()) === 'nada') return
    void import('../silenciar-en-el-live.client').then((modulo) =>
      modulo.sincronizarElPushConElLive(enElLive),
    )
  }, [enElLive])
  return null
}
