'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { CatalogoDelOrigenLeido } from '../../../entities/nucleo/catalogo-del-origen'

export type LecturaDelCatalogo<T> =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; catalogo: CatalogoDelOrigenLeido<T> }

// Lo propio de cada catálogo: cómo se leen sus dos grupos y cómo se activa o desactiva una fila (con su versión; `uso` vuelve al desactivar). Es una
// constante por catálogo (no se arma en cada render).
export type ConfigDelCatalogo<T> = {
  leer: (origenId: string) => Promise<Resultado<CatalogoDelOrigenLeido<T>>>
  mensajeDeLectura: string
  activar: (fila: T, activo: boolean) => Promise<Envio<{ uso: number | null }>>
  avisoActivado: string
  avisoDesactivado: string
  // El aviso al desactivar una fila que se usa.
  avisoDelUso: (fila: T, uso: number) => string
}

// Un catálogo de logística de un origen (puertos, navieras, categorías de gasto): se lee al montar el drawer y otra vez tras cada escritura (la lista
// nunca queda vieja). `activar` escribe por la Server Action del catálogo y avisa; el rechazo de la base se dice con su texto (un compartido pide el
// permiso en cada origen que lo usa) y, tras un conflicto (otra persona la cambió), la lista se relee: el aviso ofrece «Recargar».
export function useCatalogoDelOrigen<T>(config: ConfigDelCatalogo<T>, origenId: string) {
  const [lectura, setLectura] = useState<LecturaDelCatalogo<T>>({ tipo: 'cargando' })
  const { leer: leerCatalogo, mensajeDeLectura } = config

  const leer = useCallback(() => {
    let vigente = true
    void leerCatalogo(origenId)
      .catch(() => fallo('inesperado', mensajeDeLectura))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', catalogo: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [leerCatalogo, mensajeDeLectura, origenId])

  useEffect(() => leer(), [leer])

  return {
    lectura,
    recargar: () => {
      leer()
    },
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      leer()
    },
    activar: async (fila: T, activo: boolean) => {
      const envio = await config.activar(fila, activo)
      if (envio.ok) {
        const { uso } = envio.data
        avisarExito(
          uso
            ? config.avisoDelUso(fila, uso)
            : activo
              ? config.avisoActivado
              : config.avisoDesactivado,
        )
        leer()
        return
      }
      avisarError(envio.error)
      if (envio.error.codigo === 'conflicto') {
        leer()
      }
    },
  }
}
