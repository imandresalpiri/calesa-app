'use client'

import { useCallback, useMemo } from 'react'
import type { RecalculoInicial } from '../../../entities/apertura'
import { ofreceVerTotalBs, verTotalBsAlAbrir } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { useBorradorDelPar } from './use-borrador-del-par'
import { useHoja, type AccionesDeHoja, type AperturaDeHoja } from './use-hoja'

export type ColumnaDeLaHoja = ReturnType<typeof useHoja>
type DeDos<T> = readonly [T, T]

// Lo que se toca en una celda común, en un atajo, un interruptor, el modo o «Ver total Bs» vale para las dos opciones: las mismas acciones sobre las dos columnas.
function useAccionesDeLasDos(a: AccionesDeHoja, b: AccionesDeHoja): AccionesDeHoja {
  return useMemo<AccionesDeHoja>(
    () => ({
      alConfirmar: (id, valor) => {
        a.alConfirmar(id, valor)
        b.alConfirmar(id, valor)
      },
      alRestablecer: (id) => {
        a.alRestablecer(id)
        b.alRestablecer(id)
      },
      alAlternarBandera: (nodo, encendida) => {
        a.alAlternarBandera(nodo, encendida)
        b.alAlternarBandera(nodo, encendida)
      },
      alElegirVariante: () => {},
      alElegirModo: (clave) => {
        a.alElegirModo(clave)
        b.alElegirModo(clave)
      },
      alElegirAtajo: (nodo, posicion, valor) => {
        a.alElegirAtajo(nodo, posicion, valor)
        b.alElegirAtajo(nodo, posicion, valor)
      },
    }),
    [a, b],
  )
}

// La hoja en par (glosario: «Variante en par»): una columna por opción, cada una con su `useHoja` (sus entradas, su recálculo con su opción o su cotización, uno en
// vuelo por columna) y un solo borrador para las dos. `h` es la primera columna con las acciones de las dos: lo que dibujan la cabecera y las celdas comunes.
export function useHojaEnPar({
  hoja,
  iniciales,
  aperturas,
  vehiculoId,
  alCambiar,
  borrador,
}: {
  hoja: HojaLista
  iniciales: DeDos<RecalculoInicial>
  // De dónde calcula cada columna y con qué abre (estables).
  aperturas: DeDos<AperturaDeHoja>
  vehiculoId: string | null
  alCambiar?: (() => void) | undefined
  borrador?: { clave: string; alDescartar: () => void } | undefined
}) {
  const verTotalBsInicial = aperturas[0].verTotalBsInicial ?? verTotalBsAlAbrir(hoja.cabecera)
  const comun = { hoja, vehiculoId, alCambiar, verTotalBsInicial }
  const a = useHoja({ ...comun, ...aperturas[0], inicial: iniciales[0] })
  const b = useHoja({ ...comun, ...aperturas[1], inicial: iniciales[1] })
  useBorradorDelPar({
    clave: borrador?.clave ?? null,
    a,
    b,
    verTotalBs: a.verTotalBs,
    verTotalBsInicial,
    ofrece: ofreceVerTotalBs(hoja.cabecera),
    alDescartar: borrador?.alDescartar ?? (() => {}),
  })
  const acciones = useAccionesDeLasDos(a.acciones, b.acciones)
  const { alCambiarVerTotalBs: verA } = a
  const { alCambiarVerTotalBs: verB } = b
  const alCambiarVerTotalBs = useCallback(
    (valor: boolean) => {
      verA(valor)
      verB(valor)
    },
    [verA, verB],
  )
  // El aviso de la primera vez es de la hoja: lo enciende lo pisado en cualquiera de las dos y cerrarlo lo cierra en las dos.
  const { cerrarAvisoDePisado: cerrarA } = a
  const { cerrarAvisoDePisado: cerrarB } = b
  const cerrarAvisoDePisado = useCallback(() => {
    cerrarA()
    cerrarB()
  }, [cerrarA, cerrarB])
  const h: ColumnaDeLaHoja = {
    ...a,
    acciones,
    alCambiarVerTotalBs,
    avisoDePisado: a.avisoDePisado || b.avisoDePisado,
    cerrarAvisoDePisado,
  }
  return { h, columnas: [a, b] as const }
}
