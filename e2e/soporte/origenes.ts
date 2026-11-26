// Lo que los e2e de Configuración › Orígenes miran y limpian en la base del Supabase LOCAL. Los
// orígenes se crean por la pantalla; acá sólo se comprueba lo que quedó y se borra al terminar.
import { admin } from './base'
import { borrarEmbarquesDe } from './embarques'
import { expect, type Page } from './prueba'

// Todo origen de prueba que crea un e2e a mano (sin pasar por la pantalla) lleva esta clave: es lo
// único, junto con las claves que los tests piden, que la limpieza borra.
export const PREFIJO_CLAVE_E2E = 'e2e_'

export type OrigenEnLaBase = {
  id: string
  clave: string
  nombre: string
  sustantivo: string
  genero: string
  tipo: string
  color: string
  activo: boolean
  apibara_plataformas: string[]
}

export async function origenPorClave(clave: string): Promise<OrigenEnLaBase | null> {
  const { data, error } = await admin()
    .from('origenes')
    .select('id, clave, nombre, sustantivo, genero, tipo, color, activo, apibara_plataformas')
    .eq('clave', clave)
    .maybeSingle<OrigenEnLaBase>()
  if (error) {
    throw new Error(`No se pudo leer el origen ${clave}: ${error.message}`)
  }
  return data
}

export async function origenDeLaBase(clave: string): Promise<OrigenEnLaBase> {
  const origen = await origenPorClave(clave)
  if (!origen) {
    throw new Error(`No existe el origen «${clave}».`)
  }
  return origen
}

// Borra por clave los orígenes que un e2e creó (cae con ellos su flujo, sus campos y categorías). Antes, sus embarques y contenedores: los deja el hueco «Transporte» al tipear un
// booking o un contenedor, y no caen con el origen.
export async function borrarOrigenes(claves: string[]): Promise<void> {
  const cliente = admin()
  // Los mismos que borra abajo: los de `claves` y los huérfanos `e2e_…` (uno con transportes vivos tiene vehículos, y ése tampoco se borraría).
  const { data: deLaPrueba, error: alLeer } = await cliente
    .from('origenes')
    .select('id')
    .or(
      [
        ...(claves.length > 0 ? [`clave.in.(${claves.join(',')})`] : []),
        `clave.like.${PREFIJO_CLAVE_E2E}*`,
      ].join(','),
    )
    .limit(1000)
    .returns<{ id: string }[]>()
  if (alLeer) {
    throw new Error(`No se pudo leer los orígenes de prueba: ${alLeer.message}`)
  }
  await borrarEmbarquesDe(deLaPrueba.map((o) => o.id))
  const { error } = await cliente.from('origenes').delete().in('clave', claves)
  if (error) {
    throw new Error(`No se pudo borrar los orígenes de prueba: ${error.message}`)
  }
  const { error: huerfanos } = await cliente
    .from('origenes')
    .delete()
    .like('clave', `${PREFIJO_CLAVE_E2E}%`)
  if (huerfanos) {
    throw new Error(`No se pudo borrar los orígenes de prueba: ${huerfanos.message}`)
  }
}

// Un origen creado sin pasar por la pantalla (lo que necesita otro e2e para acotar un permiso). Los
// triggers le crean su flujo y sus campos, como a cualquiera.
export async function crearOrigenDePrueba(
  nombre: string,
  clave: string,
  opciones: { tipo?: 'subasta' | 'manual'; plataformas?: string[] } = {},
): Promise<{ id: string; nombre: string }> {
  const { data, error } = await admin()
    .from('origenes')
    .insert({
      clave: `${PREFIJO_CLAVE_E2E}${clave}`,
      nombre,
      ...(opciones.tipo ? { tipo: opciones.tipo } : {}),
      ...(opciones.plataformas ? { apibara_plataformas: opciones.plataformas } : {}),
    })
    .select('id, nombre')
    .single<{ id: string; nombre: string }>()
  if (error) {
    throw new Error(`No se pudo crear el origen ${nombre}: ${error.message}`)
  }
  return data
}

export type CampoEnLaBase = {
  id: string
  clave: string
  etiqueta: string
  tipo: string
  orden: number
  grupo: string | null
  requerido: boolean
  en_tarjeta: boolean
  filtrable: boolean
  publico_web: boolean
  clave_apibara: string | null
  es_sistema: boolean
  activo: boolean
  opciones: { clave: string; etiqueta: string }[]
}

// El layout de un origen, en su orden; `grupo` es el nombre de su grupo de campos.
export async function camposDelOrigen(origenId: string): Promise<CampoEnLaBase[]> {
  const { data, error } = await admin()
    .from('origenes_campos')
    .select(
      'id, clave, etiqueta, tipo, orden, requerido, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema, activo, opciones, grupo:origenes_campos_grupos!origenes_campos_grupo_fkey(nombre)',
    )
    .eq('origen_id', origenId)
    .order('orden')
    .returns<(Omit<CampoEnLaBase, 'grupo'> & { grupo: { nombre: string } | null })[]>()
  if (error) {
    throw new Error(`No se pudo leer el layout: ${error.message}`)
  }
  return data.map((campo) => ({ ...campo, grupo: campo.grupo?.nombre ?? null }))
}

export async function campoDelOrigen(origenId: string, clave: string): Promise<CampoEnLaBase> {
  const campo = (await camposDelOrigen(origenId)).find((otro) => otro.clave === clave)
  if (!campo) {
    throw new Error(`El origen no tiene el campo «${clave}».`)
  }
  return campo
}

// El flujo que nació con el origen y las reglas que trae encendidas.
export async function flujoDelOrigen(
  origenId: string,
): Promise<{ nombre: string; fases: number; reglas: string[] }> {
  const cliente = admin()
  const { data: flujo, error } = await cliente
    .from('flujos')
    .select('id, nombre')
    .eq('origen_id', origenId)
    .single<{ id: string; nombre: string }>()
  if (error) {
    throw new Error(`El origen no tiene su flujo: ${error.message}`)
  }
  const { data: reglas } = await cliente
    .from('flujos_reglas')
    .select('regla')
    .eq('flujo_id', flujo.id)
    .eq('activa', true)
    .returns<{ regla: string }[]>()
  const { count } = await cliente
    .from('fases')
    .select('id', { count: 'exact', head: true })
    .eq('flujo_id', flujo.id)
  return {
    nombre: flujo.nombre,
    fases: count ?? 0,
    reglas: (reglas ?? []).map((fila) => fila.regla).sort(),
  }
}

// --- La pantalla --------------------------------------------------------------------------------------

// Cada parte de un origen es su sub-ruta y una pestaña de su página: se salta entre ellas por las pestañas. Una pestaña de la página del origen por su título: con algo pendiente su nombre sigue con «. <lo que falta>» (el ⚠).
export async function irAParte(page: Page, parte: string) {
  const pestana = page.getByRole('tab', { name: new RegExp(`^${parte}(\\.|$)`) })
  await pestana.click()
  await expect(pestana).toHaveAttribute('aria-selected', 'true')
}

// La tarjeta de un origen en `/configuracion/origenes` (lleva la insignia de su tipo), no el sub-ítem del menú, que lleva sólo el nombre.
export function tarjetaDelOrigen(page: Page, nombre: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: new RegExp(`^Abrir .*${nombre}`) }) })
    .filter({ has: page.getByText(/^(Subasta|Manual)$/) })
}

// Abre un origen desde la lista (su tarjeta lleva a `/configuracion/origenes/<id>`, que entra a la última pestaña que la persona abrió ahí o a la primera
// que abre) y, si se pide, otra de sus partes.
export async function irADetalle(page: Page, nombre: string, seccion?: string) {
  await page.goto('/configuracion/origenes')
  await tarjetaDelOrigen(page, nombre).click()
  await expect(page).toHaveURL(
    /\/configuracion\/origenes\/[0-9a-f-]{36}\/(fases|planilla|hoja|tarjeta|campos|categorias)(\?|$)/,
  )
  await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible()
  if (seccion) {
    await irAParte(page, seccion)
  }
}

// Los datos del origen abierto en su drawer («Datos» de la cabecera, desde 768 px; en el celular va primero en el «⋯»).
export async function abrirLosDatos(page: Page) {
  await page.getByRole('button', { name: 'Datos', exact: true }).click()
  const datos = page.getByRole('dialog', { name: 'Datos del origen' })
  await expect(datos).toBeVisible()
  return datos
}

// Recién creado, el origen sigue en el paso Campos de su puesta en marcha: de ahí a su página (la pestaña Campos, que abre todo el que abre el origen).
export async function delAltaASuPagina(page: Page) {
  await expect(page).toHaveURL(
    /\/configuracion\/origenes\/[0-9a-f-]{36}\/puesta-en-marcha\/campos$/,
  )
  await page.goto(page.url().replace(/\/puesta-en-marcha\/campos$/, '/campos'))
}
