'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import type { ColorCreado } from '../../../entities/nuevo-color'
import {
  leerTonosDelCatalogo,
  type TonoDelCatalogo,
} from '../../../areas/formula/composicion.client'

export type EstadoDeLosTonos =
  | { tipo: 'leyendo' }
  | { tipo: 'error' }
  | { tipo: 'listo'; tonos: readonly TonoDelCatalogo[]; claves: ReadonlySet<string> }

// Un color recién creado entra en su lugar por nombre (como lo ordena la lectura); si ya estaba (el pedido se repitió), nada cambia.
function conElColor(estado: EstadoDeLosTonos, color: ColorCreado): EstadoDeLosTonos {
  if (estado.tipo !== 'listo' || estado.claves.has(color.clave)) return estado
  const nombre = color.nombre.toLocaleLowerCase('es')
  const i = estado.tonos.findIndex((t) => t.nombre.toLocaleLowerCase('es') > nombre)
  const tonos = [...estado.tonos]
  tonos.splice(i === -1 ? tonos.length : i, 0, color)
  return { tipo: 'listo', tonos, claves: new Set([...estado.claves, color.clave]) }
}

// El catálogo de tonos de la sección «Grupos» del editor (4.21-3c, C3): una lectura al montarse y otra con «Reintentar». Sólo la respuesta del último pedido cambia el
// estado: la de uno anterior, o la que llega con la sección ya desmontada, se descarta. Un color creado al vuelo («+ Nuevo color») se suma sin releer.
export function useTonos() {
  const [estado, setEstado] = useState<EstadoDeLosTonos>({ tipo: 'leyendo' })
  const ultimo = useRef(0)

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerTonosDelCatalogo()
      .catch((): Resultado<TonoDelCatalogo[]> => fallo('inesperado', 'Sin colores.'))
      .then((r) => {
        if (pedido !== ultimo.current) return
        setEstado(
          r.ok
            ? { tipo: 'listo', tonos: r.data, claves: new Set(r.data.map((t) => t.clave)) }
            : { tipo: 'error' },
        )
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    pedir()
    return () => {
      ultimo.current += 1
    }
  }, [pedir])

  return {
    estado,
    sumar: (color: ColorCreado) => {
      setEstado((antes) => conElColor(antes, color))
    },
    reintentar: () => {
      setEstado({ tipo: 'leyendo' })
      pedir()
    },
  }
}
