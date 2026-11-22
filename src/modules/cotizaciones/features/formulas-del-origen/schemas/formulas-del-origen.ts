// Lo que mandan «Nueva fórmula», «Renombrar», «Archivar», «Eliminar» y «Activar» de la barra de la fórmula (docs/COTIZADOR.md › «Fórmulas del origen»). La forma
// va aquí; las reglas (nombre repetido, el tope, la fórmula en uso, la tarjeta que no sirve) las dice la base con su mensaje y su campo.
import { z } from 'zod'
import { LARGO_DEL_NOMBRE } from '../../../entities/formula-del-origen'

// La versión como el texto de la base, con sus microsegundos (un `Date` los pierde).
const esquemaDeHora = z.iso.datetime({ offset: true })

// El nombre cuenta letras como la base (`char_length`: un emoji es una), no unidades UTF-16 como `.max()`.
const esquemaDelNombre = z
  .string()
  .trim()
  .min(1)
  .refine((texto) => [...texto].length <= LARGO_DEL_NOMBRE)

export const LARGO_DE_LA_NOTA = 2000

export const esquemaDeCrearFormula = z.object({
  // El id del intento: uno por apertura del modal.
  id: z.guid(),
  origenId: z.guid(),
  nombre: esquemaDelNombre,
  copiaDe: z.guid().nullable(),
  pieza: z.enum(['publicada', 'borrador']),
  // El origen de la fórmula que se copia (el abierto u otro): la action pide también ahí el permiso.
  origenDeLaCopia: z.guid().nullable(),
})
export type EntradaDeCrearFormula = z.infer<typeof esquemaDeCrearFormula>

const conVersion = { id: z.guid(), origenId: z.guid(), esperada: esquemaDeHora }

export const esquemaDeRenombrarFormula = z.object({ ...conVersion, nombre: esquemaDelNombre })
export type EntradaDeRenombrarFormula = z.infer<typeof esquemaDeRenombrarFormula>

export const esquemaDeArchivarFormula = z.object(conVersion)
export type EntradaDeArchivarFormula = z.infer<typeof esquemaDeArchivarFormula>

export const esquemaDeEliminarFormula = z.object(conVersion)
export type EntradaDeEliminarFormula = z.infer<typeof esquemaDeEliminarFormula>

export const esquemaDeActivarFormula = z.object({
  ...conVersion,
  activaEsperada: z.guid().nullable(),
  borradorEsperado: esquemaDeHora.nullable(),
  publicadaEsperada: z.guid().nullable(),
  plantillaBorradorEsperado: esquemaDeHora.nullable(),
  plantillaPublicadaEsperada: z.guid().nullable(),
  nota: z.string().trim().min(1).max(LARGO_DE_LA_NOTA),
})
export type EntradaDeActivarFormula = z.infer<typeof esquemaDeActivarFormula>
