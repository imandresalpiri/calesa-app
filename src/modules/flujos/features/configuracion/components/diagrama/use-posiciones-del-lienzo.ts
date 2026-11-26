'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { DisposicionDelDiagrama, Punto } from '../../../../entities/disposicion-del-diagrama'
import { leidaNoAntesDe } from '../../../../entities/edicion-del-lienzo'
import type { FlujoParaConfigurar } from '../../../../entities/flujo'
import {
  apilar,
  cambiosAlMover,
  conPendientes,
  deshacer as sacarDeLaPila,
  enElAcomodo,
  loQueHabia,
  pendientesVigentes,
  posicionesDeOrdenarSolo,
  posicionesEfectivas,
  type CambioDePosicion,
  type PasoDeDeshacer,
  type PosicionPendiente,
} from '../../../../entities/posiciones-del-diagrama'
import { useEnvioDePosiciones } from './use-envio-de-posiciones'
import type { useEscrituraDelLienzo } from './use-escritura-del-lienzo'

// Las ráfagas de teclado se guardan juntas, 600 ms después de la última tecla.
const ESPERA_DEL_TECLADO_MS = 600

type Pedido = {
  flujo: FlujoParaConfigurar
  // El acomodo automático (px), del orden y las salidas.
  auto: DisposicionDelDiagrama
  rem: number
  escribir: ReturnType<typeof useEscrituraDelLienzo>
}

// Dónde está cada fase del lienzo (rem): lo movido en pantalla encima de lo leído, hasta que lo leído lo trae (`useEnvioDePosiciones` lo escribe). Un arrastre,
// una ráfaga de teclado y «Ordenar solo» son un paso de deshacer cada uno; deshacer manda un envío. La pila vive aquí: se vacía al recargar o ante un
// conflicto.
export function usePosicionesDelLienzo({ flujo, auto, rem, escribir }: Pedido) {
  const [pendientes, setPendientes] = useState<ReadonlyMap<string, PosicionPendiente>>(new Map())
  const pila = useRef<PasoDeDeshacer[]>([])
  const rafaga = useRef<ReturnType<typeof setTimeout> | null>(null)
  const envio = useEnvioDePosiciones({
    escribir,
    setPendientes,
    alConflicto: () => {
      pila.current = []
    },
  })
  useEffect(
    () => () => {
      if (rafaga.current) clearTimeout(rafaga.current)
    },
    [],
  )

  const leidas = useMemo(() => new Map(flujo.fases.map((f) => [f.id, f.posicion])), [flujo.fases])
  const vigentes = useMemo(
    () =>
      pendientesVigentes(pendientes, leidas, (guardada) => leidaNoAntesDe(flujo.version, guardada)),
    [pendientes, leidas, flujo.version],
  )
  const enPantalla = useMemo(() => conPendientes(flujo.fases, vigentes), [flujo.fases, vigentes])
  const efectivas = useMemo(
    () => posicionesEfectivas(enPantalla, auto, rem),
    [enPantalla, auto, rem],
  )
  // Lo que había en pantalla, para deshacer (también «sin posición»).
  const guardadas = useMemo(() => new Map(enPantalla.map((f) => [f.id, f.posicion])), [enPantalla])

  function aplicar(cambios: readonly CambioDePosicion[], deshacible: boolean) {
    if (cambios.length === 0) return
    if (deshacible) pila.current = apilar(pila.current, loQueHabia(guardadas, cambios))
    setPendientes((antes) => {
      const despues = new Map(antes)
      for (const c of cambios) despues.set(c.faseId, { cambio: c, guardadaEn: null })
      return despues
    })
    envio.esperar(cambios)
  }

  function deshacer() {
    const sacado = sacarDeLaPila(pila.current)
    if (!sacado) return
    pila.current = sacado.pila
    aplicar(sacado.paso, false)
    envio.enviar()
  }

  return {
    efectivas,
    sinRed: envio.sinRed,
    yaEnElAcomodo: enElAcomodo(efectivas, auto, rem),
    // Un arrastre: se guarda al soltar.
    mover: (movidas: readonly { faseId: string; x: number; y: number }[]) => {
      aplicar(cambiosAlMover(efectivas, enPantalla, movidas), true)
      envio.enviar()
    },
    // Una tecla: la ráfaga entera es un paso de deshacer y un envío.
    moverConTeclado: (faseId: string, paso: Punto) => {
      const donde = efectivas.get(faseId)
      if (!donde) return
      const primera = rafaga.current === null
      if (rafaga.current) clearTimeout(rafaga.current)
      const movida = { faseId, x: donde.x + paso.x, y: donde.y + paso.y }
      aplicar(cambiosAlMover(efectivas, enPantalla, [movida]), primera)
      rafaga.current = setTimeout(() => {
        rafaga.current = null
        envio.enviar()
      }, ESPERA_DEL_TECLADO_MS)
    },
    ordenarSolo: () => {
      aplicar(posicionesDeOrdenarSolo(auto, rem), true)
      envio.enviar()
      avisarConDeshacer('Fases reacomodadas', deshacer)
    },
    deshacer,
  }
}
