import { z } from 'zod'
import { textoDeUso as textoDeUsoDeCatalogo } from '../nucleo/catalogos'

// Los catálogos de transporte (6.08-1): puertos y navieras, propios de un origen o compartidos con todos (`origen_id` nulo). Salen de la base (`puertos`, `navieras`); ningún
// texto fijo los nombra. Se escriben sólo por RPC (`puerto_crear|guardar`, `naviera_crear|guardar`) con la versión de la fila, y no se borran: borrar dejaría nulos los
// transportes y vaciaría la oferta de los flujos, así que se desactivan.
export const LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE = 80
export const LARGO_MAXIMO_DE_PAIS = 60
export const LARGO_MAXIMO_DE_CODIGO = 12
export const ORDEN_MAXIMO_DE_PUERTO = 32767
export const TOPE_DE_CATALOGO_DE_TRANSPORTE = 200

export type PuertoDeCatalogo = {
  id: string
  // Nulo: compartido con todos los orígenes.
  origenId: string | null
  nombre: string
  pais: string | null
  codigo: string | null
  activo: boolean
  orden: number
  // La versión de la fila: la pide `puerto_guardar`.
  actualizadoEn: string
}

export type NavieraDeCatalogo = {
  id: string
  origenId: string | null
  nombre: string
  activo: boolean
  actualizadoEn: string
}

const esquemaDePuerto = z
  .object({
    id: z.guid(),
    origen_id: z.guid().nullable(),
    nombre: z.string(),
    pais: z.string().nullable(),
    codigo: z.string().nullable(),
    activo: z.boolean(),
    orden: z.number(),
    actualizado_en: z.string(),
  })
  .transform(({ origen_id, actualizado_en, ...resto }) => ({
    ...resto,
    origenId: origen_id,
    actualizadoEn: actualizado_en,
  }))

const esquemaDeNaviera = z
  .object({
    id: z.guid(),
    origen_id: z.guid().nullable(),
    nombre: z.string(),
    activo: z.boolean(),
    actualizado_en: z.string(),
  })
  .transform(({ origen_id, actualizado_en, ...resto }) => ({
    ...resto,
    origenId: origen_id,
    actualizadoEn: actualizado_en,
  }))

/** Las filas de `puertos` (con `origen_id` y `actualizado_en`); nulo si alguna no tiene la forma esperada. */
export function puertosDesde(datos: unknown): PuertoDeCatalogo[] | null {
  const leido = z.array(esquemaDePuerto).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Las filas de `navieras` (con `origen_id` y `actualizado_en`); nulo si alguna no tiene la forma esperada. */
export function navierasDesde(datos: unknown): NavieraDeCatalogo[] | null {
  const leido = z.array(esquemaDeNaviera).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Los puertos en el orden de la lista: `orden`, luego nombre. */
export function ordenarPuertos(puertos: readonly PuertoDeCatalogo[]): PuertoDeCatalogo[] {
  return [...puertos].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}

/** Las navieras en el orden de la lista: por nombre. */
export function ordenarNavieras(navieras: readonly NavieraDeCatalogo[]): NavieraDeCatalogo[] {
  return [...navieras].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export const SIN_PAIS = 'Sin país'

/** Lo que se muestra en la columna de uso de un puerto: «Chile · CLSAI», sólo lo que tenga; «Sin país» si no hay ninguno de los dos. */
export function usoDelPuerto(puerto: Pick<PuertoDeCatalogo, 'pais' | 'codigo'>): string {
  const partes = [puerto.pais, puerto.codigo].filter((p): p is string => p !== null && p !== '')
  return partes.length === 0 ? SIN_PAIS : partes.join(' · ')
}

/** Lo que escribe la persona en el formulario de un puerto, tal cual (el orden como texto; país y código vacíos = sin dato). */
export type BorradorDePuerto = {
  nombre: string
  pais: string
  codigo: string
  orden: string
  activo: boolean
}

export type DatosDePuerto = {
  nombre: string
  pais: string | null
  codigo: string | null
  activo: boolean
  orden: number
}

export type BorradorDeNaviera = { nombre: string; activo: boolean }
export type DatosDeNaviera = { nombre: string; activo: boolean }

export type ValidacionDeCatalogo<T> =
  { ok: true; datos: T } | { ok: false; errores: Record<string, string> }

export const BORRADOR_NUEVO_DE_PUERTO: BorradorDePuerto = {
  nombre: '',
  pais: '',
  codigo: '',
  orden: '0',
  activo: true,
}

export const BORRADOR_NUEVO_DE_NAVIERA: BorradorDeNaviera = { nombre: '', activo: true }

export function borradorDePuerto(p: PuertoDeCatalogo): BorradorDePuerto {
  return {
    nombre: p.nombre,
    pais: p.pais ?? '',
    codigo: p.codigo ?? '',
    orden: String(p.orden),
    activo: p.activo,
  }
}

export function borradorDeNaviera(n: NavieraDeCatalogo): BorradorDeNaviera {
  return { nombre: n.nombre, activo: n.activo }
}

/** Recorta y colapsa los espacios de un texto. */
export function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ')
}

/** El código de un puerto se guarda en mayúsculas y sin espacios. */
export function normalizarCodigo(codigo: string): string {
  return codigo.replace(/\s+/g, '').toUpperCase()
}

function errorDeNombre(nombre: string): string | null {
  if (nombre === '') {
    return 'Escribe el nombre.'
  }
  return nombre.length > LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE
    ? `El nombre admite hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE)} letras.`
    : null
}

/** Valida el formulario de una naviera. El error de cada campo va por su clave del borrador. */
export function validarNaviera(b: BorradorDeNaviera): ValidacionDeCatalogo<DatosDeNaviera> {
  const nombre = normalizarTexto(b.nombre)
  const error = errorDeNombre(nombre)
  return error === null
    ? { ok: true, datos: { nombre, activo: b.activo } }
    : { ok: false, errores: { nombre: error } }
}

/** Valida el formulario de un puerto con las reglas de la base (nombre, orden `smallint`) y los largos de la interfaz. */
export function validarPuerto(b: BorradorDePuerto): ValidacionDeCatalogo<DatosDePuerto> {
  const errores: Record<string, string> = {}
  const nombre = normalizarTexto(b.nombre)
  const errorNombre = errorDeNombre(nombre)
  if (errorNombre !== null) {
    errores['nombre'] = errorNombre
  }
  const pais = normalizarTexto(b.pais)
  if (pais.length > LARGO_MAXIMO_DE_PAIS) {
    errores['pais'] = `El país admite hasta ${String(LARGO_MAXIMO_DE_PAIS)} letras.`
  }
  const codigo = normalizarCodigo(b.codigo)
  if (codigo.length > LARGO_MAXIMO_DE_CODIGO) {
    errores['codigo'] = `El código admite hasta ${String(LARGO_MAXIMO_DE_CODIGO)} caracteres.`
  }
  const textoDelOrden = b.orden.trim()
  const orden =
    textoDelOrden === '' ? 0 : /^\d+$/.test(textoDelOrden) ? Number(textoDelOrden) : Number.NaN
  if (!(orden >= 0 && orden <= ORDEN_MAXIMO_DE_PUERTO)) {
    errores['orden'] = `El orden es un número entero de 0 a ${String(ORDEN_MAXIMO_DE_PUERTO)}.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      nombre,
      pais: pais === '' ? null : pais,
      codigo: codigo === '' ? null : codigo,
      activo: b.activo,
      orden,
    },
  }
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDePuerto(
  original: PuertoDeCatalogo,
  nuevo: DatosDePuerto,
): Partial<DatosDePuerto> | null {
  const cambios: Partial<DatosDePuerto> = {}
  if (nuevo.nombre !== original.nombre) {
    cambios.nombre = nuevo.nombre
  }
  if (nuevo.pais !== original.pais) {
    cambios.pais = nuevo.pais
  }
  if (nuevo.codigo !== original.codigo) {
    cambios.codigo = nuevo.codigo
  }
  if (nuevo.activo !== original.activo) {
    cambios.activo = nuevo.activo
  }
  if (nuevo.orden !== original.orden) {
    cambios.orden = nuevo.orden
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDeNaviera(
  original: NavieraDeCatalogo,
  nuevo: DatosDeNaviera,
): Partial<DatosDeNaviera> | null {
  const cambios: Partial<DatosDeNaviera> = {}
  if (nuevo.nombre !== original.nombre) {
    cambios.nombre = nuevo.nombre
  }
  if (nuevo.activo !== original.activo) {
    cambios.activo = nuevo.activo
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

// Lo que dice una action antes de escribir si quien pide no tiene `logistica.catalogos.gestionar` en ningún origen (o en el del propio que crea).
export const SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE =
  'No tienes permiso para cambiar los catálogos de transporte.'

// Lo que usa un puerto o una naviera (`_puerto_uso()`, `_naviera_uso()`): los transportes que lo tienen y la oferta de los flujos.
const USADO_POR = ['transporte u oferta', 'transportes u ofertas'] as const

/** El aviso al desactivar un puerto (`femenino: false`) o una naviera (`true`) que se usa: «Desactivaste «X»: lo usan 12 transportes u ofertas; siguen mostrándolo.». */
export function textoDeUso(nombre: string, uso: number, femenino: boolean): string {
  return textoDeUsoDeCatalogo({ nombre, uso, femenino, usadoPor: USADO_POR })
}

// Los modales de «Puertos» y «Navieras» dentro de su drawer (`?panel=puertos|navieras`): `?accion=nuevo-puerto&de=origen|compartido`,
// `?accion=editar-puerto&puerto=<id>`, `?accion=nueva-naviera&de=…` y `?accion=editar-naviera&naviera=<id>`.
export const ACCION_NUEVO_PUERTO = 'nuevo-puerto'
export const ACCION_EDITAR_PUERTO = 'editar-puerto'
export const CLAVE_DE_PUERTO = 'puerto'
export const ACCION_NUEVA_NAVIERA = 'nueva-naviera'
export const ACCION_EDITAR_NAVIERA = 'editar-naviera'
export const CLAVE_DE_NAVIERA = 'naviera'
export const MENSAJE_PUERTO_YA_NO_ESTA = 'Ese puerto ya no está.'
export const MENSAJE_NAVIERA_YA_NO_ESTA = 'Esa naviera ya no está.'
