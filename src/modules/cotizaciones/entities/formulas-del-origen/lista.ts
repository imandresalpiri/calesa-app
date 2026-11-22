// La lista de las fórmulas de un origen (la barra de la fórmula): la forma de cada fila como la lee `infra/formulas-del-origen/`, su orden y su estado. Puro: la
// base vuelve a decidir todo (docs/COTIZADOR.md › «Fórmulas del origen»).
import { z } from 'zod'

const esquemaDeLaPieza = z.object({
  id: z.guid(),
  estado: z.enum(['borrador', 'publicada', 'archivada']),
  version: z.int().nullable(),
  actualizado_en: z.string().min(1),
})

// Una fila de `formulas_del_origen` con sus versiones y su tarjeta de hoy (el borrador y la publicada de cada una; las archivadas no llegan).
export const esquemaDeLaFilaDeLaLista = z.object({
  id: z.guid(),
  nombre: z.string().min(1),
  activa: z.boolean(),
  activada_en: z.string().nullable(),
  archivada_en: z.string().nullable(),
  copiada_de_otro_origen: z.boolean(),
  actualizado_en: z.string().min(1),
  formulas: z.array(esquemaDeLaPieza),
  plantillas_tarjeta: z.array(esquemaDeLaPieza),
})

export type FilaLeidaDeLaLista = z.infer<typeof esquemaDeLaFilaDeLaLista>

// El borrador (con su hora: la esperada de activar) y la publicada (con su id y su versión) de una pieza.
export type PiezasDeHoy = {
  borrador: { id: string; actualizadoEn: string } | null
  publicada: { id: string; version: number } | null
}

export type FormulaDeLaLista = {
  id: string
  nombre: string
  activa: boolean
  // Si estuvo activa alguna vez: entonces se archiva y no se elimina.
  activadaEn: string | null
  archivadaEn: string | null
  copiadaDeOtroOrigen: boolean
  // La versión de la fila, tal cual el texto de la base: la esperada de renombrar, archivar, eliminar y activar.
  actualizadoEn: string
  formula: PiezasDeHoy
  tarjeta: PiezasDeHoy
}

function piezasDe(filas: FilaLeidaDeLaLista['formulas']): PiezasDeHoy {
  const borrador = filas.find((f) => f.estado === 'borrador')
  const publicada = filas.find((f) => f.estado === 'publicada' && f.version !== null)
  return {
    borrador: borrador ? { id: borrador.id, actualizadoEn: borrador.actualizado_en } : null,
    publicada: publicada ? { id: publicada.id, version: publicada.version ?? 0 } : null,
  }
}

export function formulaDeLaLista(fila: FilaLeidaDeLaLista): FormulaDeLaLista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    activa: fila.activa,
    activadaEn: fila.activada_en,
    archivadaEn: fila.archivada_en,
    copiadaDeOtroOrigen: fila.copiada_de_otro_origen,
    actualizadoEn: fila.actualizado_en,
    formula: piezasDe(fila.formulas),
    tarjeta: piezasDe(fila.plantillas_tarjeta),
  }
}

const COMPARAR = new Intl.Collator('es', { sensitivity: 'base', numeric: true }).compare

// La activa primero; las demás por nombre (como se lee en español: sin mayúsculas ni tildes, «Fórmula 2» antes que «Fórmula 10»).
export function ordenDeLaLista<F extends Pick<FormulaDeLaLista, 'activa' | 'nombre' | 'id'>>(
  formulas: readonly F[],
): F[] {
  return [...formulas].sort(
    (a, b) =>
      Number(b.activa) - Number(a.activa) || COMPARAR(a.nombre, b.nombre) || COMPARAR(a.id, b.id),
  )
}

export type EstadoDeLaFormula = {
  // El texto del `<Badge>`: «Activa · v3», «v2 publicada, no activa», «Borrador» o «Archivada».
  etiqueta: string
  tono: 'activa' | 'publicada' | 'borrador' | 'archivada'
  // «Con borrador sin publicar», cuando hay publicada y borrador; nulo si no.
  detalle: string | null
}

export const CON_BORRADOR = 'Con borrador sin publicar'

export function estadoDeLaFormula(
  formula: Pick<FormulaDeLaLista, 'activa' | 'archivadaEn' | 'formula'>,
): EstadoDeLaFormula {
  const { publicada, borrador } = formula.formula
  const detalle = publicada && borrador ? CON_BORRADOR : null
  if (formula.archivadaEn !== null)
    return { etiqueta: 'Archivada', tono: 'archivada', detalle: null }
  if (publicada === null) return { etiqueta: 'Borrador', tono: 'borrador', detalle: null }
  const version = `v${String(publicada.version)}`
  return formula.activa
    ? { etiqueta: `Activa · ${version}`, tono: 'activa', detalle }
    : { etiqueta: `${version} publicada, no activa`, tono: 'publicada', detalle }
}

// Si la fórmula tiene tarjeta (borrador o publicada): sin ella no se activa.
export const tieneTarjeta = (formula: Pick<FormulaDeLaLista, 'tarjeta'>): boolean =>
  formula.tarjeta.borrador !== null || formula.tarjeta.publicada !== null

// Si tiene una versión que se pueda cotizar o publicar.
export const tieneVersion = (formula: Pick<FormulaDeLaLista, 'formula'>): boolean =>
  formula.formula.borrador !== null || formula.formula.publicada !== null
