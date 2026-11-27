// El terreno del e2e de la plantilla de la tarjeta por PostgREST (4.19-3a): un origen con la fórmula «mini» del juego común (`casos-de-plantilla.json`) publicada, la dueña y
// una asesora de la semilla que no configura nada, cada una con su sesión. Sin página: lo que la base entrega y niega a cada persona. Todo lo que crea lleva el prefijo de
// `cotizar-formula` y se borra con `borrarOrigenesDeCotizar()` (las plantillas caen con su origen).
import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlantillaEnCuadricula } from '../../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import type { Plantilla } from '../../src/modules/cotizaciones/entities/plantilla/forma-de-plantilla'
import { CONTRASENA } from './alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './cotizar-formula'
import { sesionDe } from './leads-alta'
import { crearAsesoraDeLaSemilla } from './recorrido'
import { literal, sql } from './sql'

export type TerrenoDePlantilla = {
  origenId: string
  // La fórmula del origen activa (la crea la primera publicada): la que leen y escriben las pruebas.
  formulaDelOrigenId: string
  duena: SupabaseClient
  asesora: SupabaseClient
}

const RUTA_DEL_JUEGO = 'src/modules/cotizaciones/entities/plantilla/casos-de-plantilla.json'

type CasoDelJuego = { nombre: string; formula: string; valida?: boolean; plantilla: unknown }
type FormulaDelJuego = { definicion: unknown; diseno: unknown; visibilidad: unknown }
const juego = (): { formulas: Record<string, FormulaDelJuego>; casos: CasoDelJuego[] } =>
  JSON.parse(readFileSync(RUTA_DEL_JUEGO, 'utf8'))

// La «mini» del juego, la de las carreras del 4.19-1. No se usa la fórmula de prueba de la hoja: esconde cosas por nivel y la tarjeta no puede mostrarlas.
export function publicarLaFormulaMini(origenId: string): void {
  const mini = juego().formulas['mini']
  if (!mini) throw new Error('El juego no trae la fórmula «mini».')
  const json = (v: unknown) => `$e2e$${JSON.stringify(v)}$e2e$::jsonb`
  sql(`
    insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota)
    values (${literal(origenId)}::uuid, 'publicada', 1, ${json(mini.definicion)}, '{}'::jsonb, ${json(mini.diseno)}, ${json(mini.visibilidad)}, 'E2E 4.19-3a')`)
}

export async function prepararTerrenoDePlantilla(
  proyecto: string,
  resto = 'plantilla',
): Promise<TerrenoDePlantilla> {
  await limpiarTerrenoDePlantilla()
  const correoDuena = correoDePrueba(`duena-plantilla-${proyecto}`)
  await crearDuenaDePrueba({
    email: correoDuena,
    contrasena: CONTRASENA,
    nombre: 'Dalia Plantilla',
  })
  const asesora = await crearAsesoraDeLaSemilla(proyecto)
  const origen = await crearOrigenDeCotizar(proyecto, resto, false)
  publicarLaFormulaMini(origen.id)
  return {
    origenId: origen.id,
    formulaDelOrigenId: sql(
      `select id from public.formulas_del_origen where origen_id = ${literal(origen.id)}::uuid and activa`,
    ),
    duena: await sesionDe(correoDuena, CONTRASENA),
    asesora: await sesionDe(asesora.email, CONTRASENA),
  }
}

export async function limpiarTerrenoDePlantilla(): Promise<void> {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

// La plantilla válida más corta del juego para esa fórmula (sin tonos), con `marca` en la nota para distinguir una definición de otra.
export function plantillaValida(marca: string): Plantilla {
  const caso = juego().casos.find(
    (c) => c.valida === true && c.formula === 'mini' && c.nombre.startsWith('mínima'),
  )
  if (!caso) throw new Error('El juego no trae el caso «mínima».')
  return { ...(caso.plantilla as Plantilla), nota: `Nota ${marca}` }
}

// El correo de la dueña del terreno (para `entrar(page, …)`).
export const correoDeLaDuena = (proyecto: string): string =>
  correoDePrueba(`duena-plantilla-${proyecto}`)

const json = (v: unknown) => `$e2e$${JSON.stringify(v)}$e2e$::jsonb`

// Un borrador de la plantilla del origen; devuelve su `actualizado_en` como texto (con los microsegundos: un `Date` los pierde).
export function sembrarBorradorDePlantilla(origenId: string, definicion: unknown): string {
  const salida = sql(`
    insert into public.plantillas_tarjeta (origen_id, estado, definicion, nota)
    values (${literal(origenId)}::uuid, 'borrador', ${json(definicion)}, 'E2E 4.19-3b')
    returning actualizado_en::text`)
  return salida.split('\n')[0] ?? ''
}

// Una plantilla publicada (versión 1) del origen.
export function publicarPlantillaDeLaMini(origenId: string, definicion: unknown): void {
  sql(`
    insert into public.plantillas_tarjeta (origen_id, estado, version, definicion, nota, publicado_en)
    values (${literal(origenId)}::uuid, 'publicada', 1, ${json(definicion)}, 'E2E v1', now())`)
}

// La visibilidad de la fórmula «mini» publicada del origen con `cambios` encima (`{ fees: { ver: 'costos' } }`): para un rechazo que sólo ve la fórmula.
export function visibilidadDeLaMini(origenId: string, cambios: Record<string, unknown>): void {
  sql(`
    update public.formulas set visibilidad = visibilidad || ${json(cambios)}
    where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`)
}

// Lo que hay guardado como borrador del origen (o nada).
export function borradorGuardado(
  origenId: string,
): { definicion: Plantilla; actualizadoEn: string } | null {
  const fila = sql(`
    select json_build_object('definicion', definicion, 'actualizadoEn', actualizado_en::text)
    from public.plantillas_tarjeta where origen_id = ${literal(origenId)}::uuid and estado = 'borrador'`)
  return fila === '' ? null : (JSON.parse(fila) as { definicion: Plantilla; actualizadoEn: string })
}

// Deja al origen sin plantillas (ni borrador ni publicada): cada prueba parte de lo suyo.
export function borrarLasPlantillasDelOrigen(origenId: string): void {
  sql(`delete from public.plantillas_tarjeta where origen_id = ${literal(origenId)}::uuid`)
}

// Una persona que sólo configura la tarjeta de esos orígenes (`cotizaciones.configurar`), para entrar con `entrar(page, correo)`.
export async function crearConfiguradoraDeTarjeta(
  proyecto: string,
  resto: string,
  origenes: readonly string[],
): Promise<string> {
  const email = correoDePrueba(`configura-${resto}-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre: `Cleo ${resto}`, invitada: true })
  await darRolDePrueba({
    email,
    rol: { nombre: `${PREFIJO_ROL_E2E}${resto} ${proyecto}`, clave: `e2e_${resto}_${proyecto}` },
    permisos: origenes.map((id) => ({ clave: 'cotizaciones.configurar', origenId: id })),
  })
  return email
}

// La plantilla publicada del origen (o nada): su versión, su nota y su definición.
export function plantillaPublicada(
  origenId: string,
): { version: number; nota: string | null; definicion: Plantilla } | null {
  const fila = sql(`
    select json_build_object('version', version, 'nota', nota, 'definicion', definicion)
    from public.plantillas_tarjeta where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`)
  return fila === ''
    ? null
    : (JSON.parse(fila) as { version: number; nota: string | null; definicion: Plantilla })
}

// Una cuadrícula (la forma 2) chica y válida para la fórmula «mini», con `marca` en el título para distinguir una definición de otra: el título combinado en las dos
// columnas, el remate (etiqueta y monto), los fees (su etiqueta, en `c_fees`) y el total. Las filas, por índice: 0 título, 1 remate, 2 fees, 3 total.
export function cuadriculaValida(marca: string): PlantillaEnCuadricula {
  return {
    forma: 2,
    columnas: [
      { id: 'concepto', ancho: 190 },
      { id: 'monto', ancho: 130 },
    ],
    filas: [
      { id: 'f_titulo', alto: 28, ocultar_si: 'nunca' },
      { id: 'f_remate', alto: 24, ocultar_si: 'nunca' },
      { id: 'f_fees', alto: 24, ocultar_si: 'nunca' },
      { id: 'f_total', alto: 28, ocultar_si: 'nunca' },
    ],
    celdas: [
      {
        id: 'c_titulo',
        fila: 'f_titulo',
        columna: 'concepto',
        abarca_columnas: 2,
        contenido: { tipo: 'texto', texto: `Título ${marca}` },
      },
      {
        id: 'c_remate',
        fila: 'f_remate',
        columna: 'concepto',
        contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' },
      },
      {
        id: 'c_remate_monto',
        fila: 'f_remate',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' },
      },
      {
        id: 'c_fees',
        fila: 'f_fees',
        columna: 'concepto',
        contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'etiqueta' },
      },
      {
        id: 'c_total',
        fila: 'f_total',
        columna: 'concepto',
        contenido: { tipo: 'texto', texto: 'TOTAL' },
      },
      {
        id: 'c_total_monto',
        fila: 'f_total',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
      },
    ],
  }
}

// La definición guardada como texto, para buscar una marca sin atarse a una forma.
export const comoTexto = (definicion: unknown): string => JSON.stringify(definicion)

export const lienzoDeLaTarjeta = (page: Page) =>
  page.getByRole('grid', { name: 'Lienzo de la tarjeta' })

// La tarjeta dibujada (la que ve el cliente) en el lienzo.
export const tarjetaDibujada = (page: Page) => page.locator('[data-tarjeta-de-cotizacion]')

// Escribe en el lugar una celda de la tarjeta: elegirla con el puntero (con el foco ya en la grilla), F2, el texto y Enter.
export async function escribirEnLaCelda(
  page: Page,
  celda: ReturnType<Page['locator']>,
  texto: string,
): Promise<void> {
  await celda.click()
  await expect(celda).toHaveAttribute('aria-selected', 'true')
  await expect(lienzoDeLaTarjeta(page)).toBeFocused()
  await page.keyboard.press('F2')
  const campo = page.getByRole('textbox', { name: 'Texto de la celda' })
  await expect(campo).toBeFocused()
  await campo.fill(texto)
  await page.keyboard.press('Enter')
  await expect(campo).toHaveCount(0)
}

// La casilla `f:k` del lienzo.
export const casillaDelLienzo = (page: Page, f: number, k: number) =>
  lienzoDeLaTarjeta(page).locator(`[data-pos="${String(f)}:${String(k)}"]`)

// «Descartar borrador…», que vive en el «⋯» de los botones de la tarjeta.
export async function abrirDescartarLaTarjeta(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Más acciones de la tarjeta' }).click()
  await page.getByRole('menuitem', { name: 'Descartar borrador…' }).click()
}

// La barra única del editor de la tarjeta.
export const barraDelLienzo = (page: Page) =>
  page.getByRole('toolbar', { name: 'Barra del lienzo' })

// El panel de la tarjeta (al costado del lienzo), abierto o no.
export const panelDeLaTarjeta = (page: Page) =>
  page.getByRole('complementary', { name: 'Panel de la tarjeta' })

// Abre un panel con su botón de la barra («Columnas», «Celda» o «Fila») y espera a que dibuje; con el panel ya abierto, lo deja como está.
export async function abrirElPanel(
  page: Page,
  cual: 'Columnas' | 'Celda' | 'Fila' = 'Celda',
): Promise<ReturnType<typeof panelDeLaTarjeta>> {
  const boton = barraDelLienzo(page).getByRole('button', { name: cual, exact: true })
  if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
  const panel = panelDeLaTarjeta(page)
  await expect(panel).toBeVisible()
  return panel
}

// Un grupo o menú de la barra: «Insertar», «Filas y columnas», «Ver»…
export async function abrirElMenuDeLaBarra(page: Page, nombre: string) {
  // Un menú que se está cerrando todavía está en el DOM: se espera a que se vaya para no elegir en él.
  await expect(page.getByRole('menu')).toHaveCount(0)
  await barraDelLienzo(page).getByRole('button', { name: nombre, exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu
}

// Una operación de un menú de la barra: «Insertar» › «Una fila abajo», «Filas y columnas» › «Combinar»…
export async function operacionDeLaBarra(page: Page, menu: string, item: string | RegExp) {
  const abierto = await abrirElMenuDeLaBarra(page, menu)
  await abierto.getByRole('menuitem', { name: item }).click()
}

// Un ítem de opción deja el menú abierto: Esc lo cierra.
export async function cerrarElMenu(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

// «Ver» › la referencia con la que se dibuja el lienzo.
export async function elegirLaReferencia(page: Page, cual: 'cotizacion' | 'ejemplo') {
  const menu = await abrirElMenuDeLaBarra(page, 'Ver')
  await menu
    .getByRole('menuitemradio', { name: cual === 'ejemplo' ? /^Cifras de ejemplo/ : /^(?!Cifras)/ })
    .first()
    .click()
  await cerrarElMenu(page)
}

// «Ver» › «Ajustar» o «100 %».
export async function elegirLaEscala(page: Page, cual: 'Ajustar' | '100 %') {
  const menu = await abrirElMenuDeLaBarra(page, 'Ver')
  await menu.getByRole('menuitemradio', { name: cual, exact: true }).click()
  await cerrarElMenu(page)
}

// El botón ⓘ «Información de la tarjeta» y su modal.
export async function abrirLaInformacionDeLaTarjeta(page: Page) {
  await page.getByRole('button', { name: 'Información de la tarjeta' }).click()
  const modal = page.getByRole('dialog', { name: 'Información de la tarjeta' })
  await expect(modal).toBeVisible()
  return modal
}

// Abre «Información de la tarjeta», deja que `revisar` mire su modal y lo cierra con Esc.
export async function conLaInformacionDeLaTarjeta(
  page: Page,
  revisar: (modal: ReturnType<Page['getByRole']>) => Promise<void>,
): Promise<void> {
  const modal = await abrirLaInformacionDeLaTarjeta(page)
  await revisar(modal)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
}
