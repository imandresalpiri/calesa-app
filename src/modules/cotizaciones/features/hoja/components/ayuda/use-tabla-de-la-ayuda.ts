'use client'

import { useLecturaAlMontar, type LecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import type { DeDondeCalcula } from '../../../../entities/pedido-de-recalculo'
import type { TablaDeAyuda } from '../../../../entities/tabla-de-ayuda'
import { claveDeLaTabla, memoriaDeLaTabla } from '../../hooks/memoria-de-tablas'

// La tabla de un bloque, de donde calcula esta hoja (su hoja abierta, nunca la publicada de hoy, o su cotización). Cada bloque lee la suya al montarse, así las tablas de una
// ayuda llegan en paralelo; lo que la memoria aún recuerda se dibuja de una vez, sin esqueleto.
export function useTablaDeLaAyuda(tabla: string, de: DeDondeCalcula) {
  const memoria = memoriaDeLaTabla(de, tabla)
  const recordada = memoria.vigente()
  const leer = useLecturaAlMontar(() => memoria.leer(), claveDeLaTabla(de, tabla))
  const lectura: LecturaAlMontar<TablaDeAyuda> =
    recordada !== null && leer.lectura.estado === 'leyendo'
      ? { estado: 'leido', dato: recordada }
      : leer.lectura
  return { lectura, reintentar: leer.reintentar }
}
