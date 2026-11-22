'use client'

import { useMemo, useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import {
  contextoDeLaPagina,
  type ContextoDeLaCotizacion,
  type PaginaDeLaTarjeta,
} from '../../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { RetoquesDeLaTarjeta } from '../../../entities/cuadricula-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { lecturaRetocada } from '../../../entities/tarjeta/retoques/aplicar-retoques'
import { textosConDatosResueltos } from '../../../entities/tarjeta/retoques/para-guardar'
import { tituloDeLaHermana } from '../../../entities/titulo-en-par'
import { useTituloDeLaCotizacion } from '../../hoja/hooks/use-titulo-de-la-cotizacion'
import { useLecturaDeLaTarjeta, type EstadoDeLaLectura } from './use-lectura-de-la-tarjeta'

// Lo que la página sabe de la tarjeta y la hoja no. `titulo`: el de una guardada ya resuelto (el guardado, porque la tarjeta dibuja lo guardado); sin la prop, la
// hoja nueva, que lee el que se está escribiendo.
export type PaginaDelModelo = Omit<PaginaDeLaTarjeta, 'titulo'> & {
  titulo?: string | null
  vencida: boolean
}

type Entrada = {
  formulaId: string
  calculo: CalculoDeLaTarjeta
  monedaBs: string | null
  pagina: PaginaDelModelo
  // Los retoques de una guardada (los guardados, o el borrador del modo «Retocar»); nulos, la tarjeta tal cual la plantilla.
  retoques?: RetoquesDeLaTarjeta | null
  // Falso en el modo «Retocar»: las filas ocultas se dibujan para poder mostrarlas.
  ocultarFilas?: boolean
  // La opción de una tarjeta de la hoja en par: el título que se está escribiendo lleva « · <etiqueta>» (glosario: «Cotizaciones hermanas»).
  opcion?: string | undefined
}

// Lo ahora, una vez por montaje: el modal se monta al abrirse y la fecha de hoy no cambia mientras está abierto.
const SIN_RESUELTOS: ReadonlyMap<string, string> = new Map()

function useHoy(): string {
  const [hoy] = useState(() => new Date().toISOString())
  return hoy
}

// La lectura de la tarjeta, el contexto de la cotización y su geometría (con los retoques que aplican): lo comparten el cuerpo del modal, que la dibuja, y su
// pie, que la copia. `lectura` es la de la base, sin retocar (la plantilla: el modo «Retocar» compara con ella); `noAplican`, cuántos retoques ya no aplican.
// Sin lectura, la geometría es nula.
export function useModeloDeLaTarjeta({
  formulaId,
  calculo,
  monedaBs,
  pagina,
  retoques = null,
  ocultarFilas = true,
  opcion,
}: Entrada): {
  estado: EstadoDeLaLectura
  reintentar: () => void
  lectura: LecturaDeLaTarjeta | null
  contexto: ContextoDeLaCotizacion
  geometria: Geometria | null
  // El texto resuelto de cada texto con datos de la plantilla sin retocar (lo que compara «Retocar»).
  resueltos: ReadonlyMap<string, string>
  noAplican: number
} {
  const { estado, reintentar } = useLecturaDeLaTarjeta(formulaId)
  const { zonaHoraria, locale } = useRegional()
  const hoy = useHoy()
  const mostrado = useTituloDeLaCotizacion()?.mostrado ?? null
  const vivo =
    mostrado !== null && opcion !== undefined ? tituloDeLaHermana(mostrado, opcion) : mostrado
  const titulo = pagina.titulo === undefined ? vivo : pagina.titulo
  const contexto = useMemo(
    () => contextoDeLaPagina({ ...pagina, titulo }, { zona: zonaHoraria, hoy }),
    [pagina, titulo, zonaHoraria, hoy],
  )
  const lectura = estado.tipo === 'lista' ? estado.lectura : null
  const retocada = useMemo(
    () => (lectura === null ? null : lecturaRetocada(lectura, retoques, { ocultarFilas })),
    [lectura, retoques, ocultarFilas],
  )
  const geometria = useMemo(
    () =>
      retocada === null
        ? null
        : geometriaDeLaTarjeta({
            lectura: retocada.lectura,
            calculo,
            contexto,
            monedaBs,
            locale,
          }),
    [retocada, calculo, contexto, monedaBs, locale],
  )
  const resueltos = useMemo(
    () =>
      lectura?.estado === 'lista'
        ? textosConDatosResueltos({ tarjeta: lectura, calculo, contexto, monedaBs, locale })
        : SIN_RESUELTOS,
    [lectura, calculo, contexto, monedaBs, locale],
  )
  return {
    estado,
    reintentar,
    lectura,
    contexto,
    geometria,
    resueltos,
    noAplican: retocada?.noAplican ?? 0,
  }
}
