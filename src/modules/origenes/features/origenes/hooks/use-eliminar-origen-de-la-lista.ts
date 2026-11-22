'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  PANEL_ELIMINAR_ORIGEN,
  motivoParaNoEliminar,
  type OrigenConUso,
} from '../../../entities/origen'
import type { EdicionesDeOrigenes } from './use-origenes'

const CLAVE_DE_ORIGEN = 'origen'

// La confirmación de «Eliminar origen» desde la lista, en la URL (`?panel=eliminar-origen&origen=<id>`): se puede recargar y «atrás» la cierra. Se monta
// una vez en la lista, no una por tarjeta. Un origen que ya no está o que tiene uso no abre (se avisa y la URL se limpia, escrita a mano también); mientras
// se va, el diálogo conserva el último que vio.
export function useEliminarOrigenDeLaLista(
  origenes: readonly OrigenConUso[],
  ediciones: EdicionesDeOrigenes,
) {
  const router = useRouter()
  const [eliminando, setEliminando] = useState(false)
  const url = usePanelPorUrl(PANEL_ELIMINAR_ORIGEN, [CLAVE_DE_ORIGEN])
  const id = url.valor(CLAVE_DE_ORIGEN)
  const origen = origenes.find((uno) => uno.id === id) ?? null
  const apertura = useApertura(url.abierto)
  const motivo =
    origen === null ? 'Ese origen ya no está en la lista.' : motivoParaNoEliminar(origen)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivo : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? origen : null
  const ultimo = useUltimo(vigente)
  const montar = useAbiertoAlgunaVez(vigente !== null)

  async function eliminar() {
    if (ultimo === null) {
      return
    }
    setEliminando(true)
    const resultado = await ediciones.eliminar(ultimo)
    setEliminando(false)
    url.cerrar()
    if (resultado.ok) {
      router.refresh()
    }
  }

  return {
    abierto: vigente !== null,
    montar,
    enCurso: ediciones.enCurso || eliminando,
    eliminar,
    origen: ultimo,
    abrir: (origenId: string) => {
      url.abrir({ [CLAVE_DE_ORIGEN]: origenId })
    },
    cerrar: url.cerrar,
  }
}
