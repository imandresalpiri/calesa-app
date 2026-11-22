// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular, y el celular se mira en el recorrido de la IA (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { borrarTonoDePrueba, crearTonoDePrueba } from './soporte/diseno-editor'
import { literal, sql } from './soporte/sql'
import { PREFIJO_DE_COLOR_DE_PRUEBA, borrarColoresDePrueba } from './soporte/tonos'

// «Para todos los orígenes» (docs/UX.md › Pantallas › Orígenes): lo que vale para todas las cotizaciones de la empresa se configura en Configuración › Orígenes, en dos tarjetas
// —Colores y Vigencia— con su modal por `?panel=`. Aquí: las dos tarjetas (tocar la tarjeta y el «⋯»), crear, editar y eliminar un color volviendo a la lista, cambiar la vigencia y su
// conflicto con «Recargar», los permisos (sin `cotizaciones.configurar` no hay bloque; en un solo origen la vigencia se lee y no se cambia), una prueba por cada URL vieja que
// redirige (308) y el buscador de Configuración. La fila de la vigencia es única: se restaura al final (el e2e corre con un solo worker).
test.describe.configure({ mode: 'serial' })

const COLOR = `${PREFIJO_DE_COLOR_DE_PRUEBA} Para todos`
const COLOR_RENOMBRADO = `${PREFIJO_DE_COLOR_DE_PRUEBA} Para todos 2`
const CLAVES_DE_RELLENO = [
  'e2eparatodos1',
  'e2eparatodos2',
  'e2eparatodos3',
  'e2eparatodos4',
  'e2eparatodos5',
]
const ORIGENES = '/configuracion/origenes'

let proyecto = ''
let duena = ''
let unOrigen = ''
let sinConfigurar = ''
let antes = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  antes = sql('select vigencia_dias from public.ajustes_empresa')
  borrarColoresDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-para-todos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Paratodos' })
  unOrigen = correoDePrueba(`un-origen-para-todos-${proyecto}`)
  await crearPersona({
    email: unOrigen,
    contrasena: CONTRASENA,
    nombre: 'Uriel Unorigen',
    invitada: true,
  })
  const origenId = sql('select id from public.origenes order by clave limit 1')
  await darRolDePrueba({
    email: unOrigen,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Configura un origen ${proyecto}`,
      clave: `e2e_para_todos_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId }],
  })
  sinConfigurar = correoDePrueba(`sin-configurar-para-todos-${proyecto}`)
  await crearPersona({
    email: sinConfigurar,
    contrasena: CONTRASENA,
    nombre: 'Sandra Sinconfigurar',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinConfigurar,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Configura flujos ${proyecto}`,
      clave: `e2e_para_todos_flujos_${proyecto}`,
    },
    permisos: ['flujos.configurar'],
  })
  for (const clave of CLAVES_DE_RELLENO) crearTonoDePrueba(clave)
})

test.afterAll(async () => {
  if (antes !== '') {
    sql(`update public.ajustes_empresa set vigencia_dias = ${Number(antes)}`)
  }
  for (const clave of CLAVES_DE_RELLENO) borrarTonoDePrueba(clave)
  borrarColoresDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const bloque = (page: Page) =>
  page.getByRole('heading', { name: 'Para todos los orígenes', level: 2 })
const tarjeta = (page: Page, nombre: 'Colores' | 'Vigencia') =>
  page.getByRole('region', { name: nombre, exact: true })
const lista = (page: Page) => page.getByRole('dialog', { name: 'Colores', exact: true })
const vigencia = (page: Page) => page.getByRole('dialog', { name: 'Vigencia', exact: true })
const fila = (page: Page, nombre: string) =>
  lista(page)
    .locator('li[data-color]')
    .filter({ has: page.getByText(nombre, { exact: true }) })

test('las dos tarjetas: Colores muestra los primeros por nombre y «y N más»; Vigencia, sus días', async ({
  page,
}) => {
  sql('update public.ajustes_empresa set vigencia_dias = 15')
  await entrar(page, duena, { fresco: true })
  await page.goto(ORIGENES)
  await expect(bloque(page)).toBeVisible()
  await expect(tarjeta(page, 'Colores').getByRole('listitem')).toHaveCount(6)
  await expect(tarjeta(page, 'Colores').getByText(/^y \d+ más$/)).toBeVisible()
  await expect(tarjeta(page, 'Vigencia').getByText('15 días', { exact: true })).toBeVisible()
  // Sólo el «⋯»: ningún «Editar» suelto, y la tarjeta es un botón con nombre para el teclado.
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar colores', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar vigencia', exact: true })).toBeVisible()
})

test('tocar la tarjeta o elegir «Editar colores…» del «⋯» abre la lista; cerrar la deja en Orígenes', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(ORIGENES)
  await page.getByRole('button', { name: 'Editar colores', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/origenes\?panel=colores$/)
  await expect(lista(page)).toBeVisible()
  await lista(page).getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await expect(lista(page)).toBeHidden()
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)

  await page.getByRole('button', { name: 'Más acciones de Colores', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Editar colores…', exact: true }).click()
  await expect(lista(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lista(page)).toBeHidden()
})

test('crear, editar y eliminar un color desde la lista: cada ventana vuelve a ella', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${ORIGENES}?panel=colores`)
  await expect(lista(page)).toBeVisible()

  await lista(page).getByRole('button', { name: 'Nuevo color', exact: true }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo color' })
  await expect(nuevo).toBeVisible()
  await expect(page).toHaveURL(/panel=nuevo-tono$/)
  await nuevo.getByLabel('Nombre', { exact: true }).fill(COLOR)
  await nuevo.getByLabel('Color', { exact: true }).fill('#31869b')
  await nuevo.getByRole('button', { name: 'Crear color', exact: true }).click()
  await expect(nuevo).toBeHidden()
  await expect(page).toHaveURL(/panel=colores$/)
  await expect(fila(page, COLOR)).toBeVisible()

  // Tocar la fila abre «Editar»; guardar vuelve a la lista con el nombre nuevo.
  await page.getByRole('button', { name: `Editar «${COLOR}»`, exact: true }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar color' })
  await expect(edicion).toBeVisible()
  await edicion.getByLabel('Nombre', { exact: true }).fill(COLOR_RENOMBRADO)
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(edicion).toBeHidden()
  await expect(page).toHaveURL(/panel=colores$/)
  await expect(fila(page, COLOR_RENOMBRADO)).toBeVisible()

  // El «⋯» de la fila: «Eliminar…» pide confirmar y vuelve a la lista sin el color.
  await page
    .getByRole('button', { name: `Más acciones de «${COLOR_RENOMBRADO}»`, exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Eliminar…', exact: true }).click()
  const confirmar = page.getByRole('dialog', { name: `Eliminar el color «${COLOR_RENOMBRADO}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar color', exact: true }).click()
  await expect(confirmar).toBeHidden()
  await expect(lista(page)).toBeVisible()
  await expect(fila(page, COLOR_RENOMBRADO)).toHaveCount(0)
  expect(sql(`select count(*) from public.tonos where nombre = ${literal(COLOR_RENOMBRADO)}`)).toBe(
    '0',
  )
})

test('la dueña cambia la vigencia desde su tarjeta; si otra persona guardó antes, «Recargar» conserva lo tipeado', async ({
  page,
}) => {
  sql('update public.ajustes_empresa set vigencia_dias = 15')
  await entrar(page, duena, { fresco: true })
  await page.goto(ORIGENES)
  await page.getByRole('button', { name: 'Editar vigencia', exact: true }).click()
  await expect(page).toHaveURL(/panel=vigencia$/)
  await expect(vigencia(page)).toBeVisible()
  await expect(page.getByLabel('Vigencia (días)')).toHaveValue('15')

  await page.getByLabel('Vigencia (días)').fill('20')
  sql('update public.ajustes_empresa set vigencia_dias = 44')
  await vigencia(page).getByRole('button', { name: 'Guardar', exact: true }).click()
  const recargar = vigencia(page).getByRole('button', { name: 'Recargar', exact: true })
  await expect(recargar).toBeVisible()
  await recargar.click()
  await expect(recargar).toBeHidden()
  await expect(page.getByLabel('Vigencia (días)')).toHaveValue('20')

  await vigencia(page).getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(vigencia(page)).toBeHidden()
  expect(sql('select vigencia_dias from public.ajustes_empresa')).toBe('20')
  await expect(tarjeta(page, 'Vigencia').getByText('20 días', { exact: true })).toBeVisible()
})

test('sin `cotizaciones.configurar` no hay bloque, y ?panel= no abre nada y se limpia', async ({
  page,
}) => {
  await entrar(page, sinConfigurar, { fresco: true })
  await page.goto(`${ORIGENES}?panel=colores`)
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()
  await expect(bloque(page)).toHaveCount(0)
  await expect(lista(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)
  await page.goto(`${ORIGENES}?panel=vigencia`)
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()
  await expect(vigencia(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)
})

test('con el permiso en un solo origen, Colores se edita y la vigencia se lee: apagada, con su motivo', async ({
  page,
}) => {
  await entrar(page, unOrigen, { fresco: true })
  await page.goto(ORIGENES)
  await expect(bloque(page)).toBeVisible()
  await expect(
    page.getByText('Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.'),
  ).toBeVisible()
  await expect(tarjeta(page, 'Vigencia').getByText(/^\d+ días?$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar vigencia', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Más acciones de Vigencia', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Editar vigencia…' })).toBeDisabled()
  await page.keyboard.press('Escape')

  await page.goto(`${ORIGENES}?panel=vigencia`)
  await expect(bloque(page)).toBeVisible()
  await expect(vigencia(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)

  await page.getByRole('button', { name: 'Editar colores', exact: true }).click()
  await expect(lista(page)).toBeVisible()
})

// Cada URL vieja, con su consulta (308). Las de `route.ts` piden sesión; las de next.config.ts, no, pero se pide igual.
const REDIRECCIONES: [string, string, string][] = [
  [
    'catalogos/colores',
    '/configuracion/catalogos/colores',
    '/configuracion/origenes?panel=colores',
  ],
  [
    'catalogos/colores con su propio panel (manda ése)',
    '/configuracion/catalogos/colores?panel=editar-tono&tono=11111111-1111-4111-8111-111111111111',
    '/configuracion/origenes?panel=editar-tono&tono=11111111-1111-4111-8111-111111111111',
  ],
  [
    'catalogos/vigencia',
    '/configuracion/catalogos/vigencia',
    '/configuracion/origenes?panel=vigencia',
  ],
  [
    'cotizacion/general',
    '/configuracion/cotizacion/general',
    '/configuracion/origenes?panel=colores',
  ],
  [
    'cotizacion/general/colores',
    '/configuracion/cotizacion/general/colores',
    '/configuracion/origenes?panel=colores',
  ],
  [
    'cotizacion/general/vigencia',
    '/configuracion/cotizacion/general/vigencia',
    '/configuracion/origenes?panel=vigencia',
  ],
  [
    'cotizacion ?seccion=tonos',
    '/configuracion/cotizacion?seccion=tonos',
    '/configuracion/origenes?panel=colores',
  ],
  [
    'cotizacion ?seccion=ajustes',
    '/configuracion/cotizacion?seccion=ajustes',
    '/configuracion/origenes?panel=vigencia',
  ],
]

for (const [nombre, de, a] of REDIRECCIONES) {
  test(`308: ${nombre}`, async ({ page }) => {
    await entrar(page, duena)
    const respuesta = await page.request.get(de, { maxRedirects: 0 })
    expect(respuesta.status()).toBe(308)
    const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
    expect(`${destino.pathname}${destino.search}`).toBe(a)
  })
}

test('el buscador de Configuración encuentra «colores» y «vigencia» y lleva a su modal', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const buscador = page.getByRole('searchbox', { name: 'Buscar en Configuración' })
  const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  await buscador.fill('colores')
  await expect(resultados.getByRole('link', { name: 'Orígenes › Colores' })).toHaveAttribute(
    'href',
    '/configuracion/origenes?panel=colores',
  )
  await buscador.fill('vigencia')
  const enlace = resultados.getByRole('link', { name: 'Orígenes › Vigencia' })
  await expect(enlace).toHaveAttribute('href', '/configuracion/origenes?panel=vigencia')
  await enlace.click()
  await expect(page).toHaveURL(/\/configuracion\/origenes\?panel=vigencia$/)
  await expect(vigencia(page)).toBeVisible()
})
