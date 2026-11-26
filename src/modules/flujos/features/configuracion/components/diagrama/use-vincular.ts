'use client'

import type { FinalConnectionState } from '@xyflow/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Punto } from '../../../../entities/disposicion-del-diagrama'
import type { FlujoParaConfigurar } from '../../../../entities/flujo'
import { motivoParaNoVincular } from '../../../../entities/salida-al-soltar'
import { useSalidasDelDiagrama } from '../../hooks/use-salidas-del-diagrama'
import type { useEscrituraDelLienzo } from './use-escritura-del-lienzo'

const DURACION_DEL_AVISO_MS = 5000

type Pedido = {
  flujo: FlujoParaConfigurar
  contenedor: RefObject<HTMLElement | null>
  escribir: ReturnType<typeof useEscrituraDelLienzo>
}

const puntoDel = (evento: MouseEvent | TouchEvent): Punto | null => {
  if ('changedTouches' in evento) {
    const toque = evento.changedTouches[0]
    return toque ? { x: toque.clientX, y: toque.clientY } : null
  }
  return { x: evento.clientX, y: evento.clientY }
}

// Vincular dos fases arrastrando el asa: al soltar sobre otra caja, si el espejo de la base (`motivoParaNoVincular`) da un motivo, se dice junto al punto
// donde se soltó; si no, la salida se crea por la cola del lienzo (el id nace una vez por gesto) y se abre en el inspector de su fase de origen. Soltar en el
// vacío no hace nada; el rechazo de la base lo dice quien escribe.
export function useVincular({ flujo, contenedor, escribir }: Pedido) {
  const salidas = useSalidasDelDiagrama()
  const [aviso, setAviso] = useState<{ texto: string; en: Punto } | null>(null)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (reloj.current) clearTimeout(reloj.current)
    },
    [],
  )

  function avisar(texto: string, evento: MouseEvent | TouchEvent) {
    const punto = puntoDel(evento)
    const caja = contenedor.current?.getBoundingClientRect()
    if (!punto || !caja) return
    if (reloj.current) clearTimeout(reloj.current)
    setAviso({ texto, en: { x: punto.x - caja.left, y: punto.y - caja.top } })
    reloj.current = setTimeout(() => {
      setAviso(null)
    }, DURACION_DEL_AVISO_MS)
  }

  return {
    aviso,
    alSoltar: (evento: MouseEvent | TouchEvent, estado: FinalConnectionState) => {
      const de = estado.fromNode?.id
      const a = estado.toNode?.id
      if (!salidas || !de || !a) return
      const motivo = motivoParaNoVincular(flujo, de, a)
      if (motivo !== null) {
        avisar(motivo, evento)
        return
      }
      const salidaId = crypto.randomUUID()
      void escribir((version) => salidas.crear({ salidaId, de, a }, version)).then((resultado) => {
        if (resultado.ok) salidas.abrir(salidaId, de)
      })
    },
  }
}
