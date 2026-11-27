'use client'

import { useEffect } from 'react'
import { CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA, guardarPreferencia } from '@/modules/equipo/client'

// Guarda el «Último origen» (`logistica.ultimo_origen`) cuando la persona eligió uno por URL que no era ya el último. Una escritura chica tras dibujar: no bloquea
// la navegación, y el prefetch no la dispara (no monta componentes). Sin red, nada visible: la próxima vez que elija ese origen se vuelve a intentar.
export function RecordarElOrigen({ origenId }: { origenId: string }) {
  useEffect(() => {
    void guardarPreferencia({ clave: CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA, valor: origenId }).catch(
      () => undefined,
    )
  }, [origenId])
  return null
}
