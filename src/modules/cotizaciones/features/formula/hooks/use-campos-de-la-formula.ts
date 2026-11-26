'use client'

import { useMemo } from 'react'
import { ok } from '@/shared/lib/errores'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerCamposDelOrigen } from '../../../areas/formula/composicion.client'
import { camposQueFaltan, nombraCamposPropios } from '../../../entities/campos-que-faltan'
import { datosQueNoSonNumero, type CampoDelOrigen } from '../../../entities/decimales-de-celda'
import type { Nodo } from '../../../entities/nodos'

const NINGUNO: ReadonlyMap<string, string> = new Map()

export type CamposDeLaFormula = {
  // Las filas cuyo dato del vehículo no existe en este origen (la copia de una fórmula de otro): id del nodo → clave del campo.
  faltan: ReadonlyMap<string, string>
  // Las filas cuyo dato del vehículo no es un número: no ofrecen «Decimales» (`datosQueNoSonNumero()`).
  noSonNumero: ReadonlySet<string>
}

// Los datos del vehículo que nombra la fórmula frente a los campos del origen. Las filas que faltan quedan marcadas siempre, no sólo con los avisos de la copia.
// Lee los campos del origen una vez, y sólo si la fórmula nombra un dato que no es común; si la lectura falla, no marca nada (la base igual no deja publicar ni
// activar así) y sólo las columnas comunes de texto quedan sin «Decimales».
export function useCamposDeLaFormula(origenId: string, nodos: readonly Nodo[]): CamposDeLaFormula {
  const definicion = useMemo(() => ({ nodos }), [nodos])
  const hayPropios = nombraCamposPropios(definicion)
  const { lectura } = useLecturaAlMontar(
    () => (hayPropios ? leerCamposDelOrigen(origenId) : Promise.resolve(ok<CampoDelOrigen[]>([]))),
    `${origenId}:${String(hayPropios)}`,
  )
  const campos = lectura.estado === 'leido' ? lectura.dato : null
  const faltan = useMemo(() => {
    if (!hayPropios || campos === null) return NINGUNO
    const claves = new Set(campos.map((c) => c.clave))
    return new Map(camposQueFaltan(definicion, claves).map(({ nodo, campo }) => [nodo, campo]))
  }, [hayPropios, campos, definicion])
  const noSonNumero = useMemo(() => datosQueNoSonNumero(nodos, campos), [nodos, campos])
  return useMemo(() => ({ faltan, noSonNumero }), [faltan, noSonNumero])
}
