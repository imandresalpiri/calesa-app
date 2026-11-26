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
  const envio = useEnvioDePosiciones({
    escribir,
    setPendientes,
    alDescartar: () => {
      pila.current = []
    },
  })
  const rafaga = useRafagaDelTeclado(envio.enviar)

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
    rafaga.cerrar()
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
      rafaga.cerrar()
      aplicar(cambiosAlMover(efectivas, enPantalla, movidas), true)
      envio.enviar()
    },
    // Una tecla: la ráfaga entera es un paso de deshacer y un envío.
    moverConTeclado: (faseId: string, paso: Punto) => {
      const donde = efectivas.get(faseId)
      if (!donde) return
      const movida = { faseId, x: donde.x + paso.x, y: donde.y + paso.y }
      aplicar(cambiosAlMover(efectivas, enPantalla, [movida]), rafaga.tecla())
    },
    ordenarSolo: () => {
      rafaga.cerrar()
      aplicar(posicionesDeOrdenarSolo(auto, rem), true)
      envio.enviar()
      avisarConDeshacer('Fases reacomodadas', deshacer)
    },
    deshacer,
  }
}

// Una ráfaga de teclado: cada tecla reprograma el envío, y `tecla()` dice si abrió la ráfaga (sólo esa apila un paso de deshacer). Un arrastre, «Ordenar
// solo» o deshacer la cierran: la tecla siguiente es otro paso. Al irse con una en curso, se envía lo que esperaba (no se pierde lo que se vio movido).
function useRafagaDelTeclado(enviar: () => void) {
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enviarAlIrse = useRef(enviar)
  useEffect(() => {
    enviarAlIrse.current = enviar
  })
  useEffect(
    () => () => {
      if (reloj.current === null) return
      clearTimeout(reloj.current)
      enviarAlIrse.current()
    },
    [],
  )
  return {
    tecla: () => {
      const primera = reloj.current === null
      if (reloj.current !== null) clearTimeout(reloj.current)
      reloj.current = setTimeout(() => {
        reloj.current = null
        enviar()
      }, ESPERA_DEL_TECLADO_MS)
      return primera
    },
    cerrar: () => {
      if (reloj.current !== null) clearTimeout(reloj.current)
      reloj.current = null
    },
  }
}
