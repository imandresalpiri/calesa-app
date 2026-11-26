// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { abrirLasVersiones } from './soporte/barra-de-la-formula'
import {
  cerrarLaInformacion,
  informacion,
  seccionDeLaInformacion,
} from './soporte/informacion-de-la-formula'
import { enLaPestana } from './soporte/pestanas-del-origen'
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
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { sembrarVersiones } from './soporte/formula-versiones'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { abrirLaFormula, enElEditor } from './soporte/rutas-de-la-formula'

// La pestaña Planilla de un origen (4.20-2a, `docs/UX.md` › «Cotización: fórmula (estados propios)»): entra quien tiene `cotizaciones.configurar` en algún origen,
// también sin los permisos de los niveles; muestra la publicada, el borrador (atrasado si se publicó otra después) y, en el drawer «Versiones» de la barra, las
// versiones de a 20 por cursor hasta 500, con «Ir a la versión» como camino a lo antiguo. Publicar y revertir: `configuracion-cotizacion-formula-publicar.spec.ts` y `-revertir.spec.ts` (4.20-2b).
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 520 versiones, más un 5 %: los bytes de la primera respuesta de «Ver más» (20 + 1 filas sin lo oculto; 4.20-2a: 4.429 B) y los nodos de la
// lista (4.20-2b, con «Revertir» en cada archivada: 121 y 3.001; antes, 102 y 2.502).
const TOPE_DE_BYTES_DE_VER_MAS = 4_650
const TOPE_DE_NODOS_CON_20 = 127
const TOPE_DE_NODOS_CON_500 = 3_151

let proyecto = ''
let chica = { id: '', nombre: '' }
let grande = { id: '', nombre: '' }
let duena = ''
let configuradora = ''
let asesora = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-formula-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fina Fórmula' })
  chica = await crearOrigenDeCotizar(proyecto, 'vchica', true)
  grande = await crearOrigenDeCotizar(proyecto, 'vgrande', true)
  sembrarVersiones(chica.id, 25, { autor: duena, borradorAtrasado: true })
  sembrarVersiones(grande.id, 520, { autor: duena })
  configuradora = correoDePrueba(`configura-formula-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Configura',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Configura ${proyecto}`, clave: `e2e_configura_${proyecto}` },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: chica.id }],
  })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const versiones = (page: Page) =>
  page.getByRole('list', { name: 'Versiones de la fórmula' }).getByRole('listitem')

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })

async function abrirFormula(page: Page, origenId: string) {
  await abrirLaFormula(page, origenId, 'planilla')
  await enLaPestana(page, 'Planilla')
}

test('quien sólo configura la fórmula de un origen entra por el hub y el menú a «Fórmula» de su origen, sin los otros ni los niveles', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto('/configuracion/inicio')
  await page.getByRole('region').getByRole('link', { name: 'Orígenes', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)
  // En el menú, sólo su origen.
  await expect(menu(page).getByRole('link', { name: grande.nombre, exact: true })).toHaveCount(0)
  await menu(page).getByRole('link', { name: chica.nombre, exact: true }).click()
  // Sin el flujo, la primera pestaña que abre es la Planilla, con la fórmula de trabajo.
  await expect(page).toHaveURL(enElEditor(chica.id, 'planilla'))
  await expect(page.getByRole('heading', { name: chica.nombre, level: 1 })).toBeVisible()
  await enLaPestana(page, 'Planilla')
  await expect(await seccionDeLaInformacion(page, 'Publicada')).toContainText(
    'Publicada: versión 26',
  )
  // Los niveles tampoco se abren escribiendo la URL: la matriz de Roles dice que falta el permiso.
  await page.goto('/configuracion/roles?bloque=cotizaciones')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText('Niveles de acceso', { exact: true })).toHaveCount(0)
  // Un origen que no es suyo no se abre.
  await abrirLaFormula(page, grande.id, 'planilla')
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Publicada: versión 26' })).toHaveCount(0)
})

test('la dueña ve la publicada, el borrador atrasado y las versiones de a 20 con quién las publicó', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFormula(page, chica.id)
  await expect(page.getByRole('heading', { name: chica.nombre, level: 1 })).toBeVisible()
  const publicada = await seccionDeLaInformacion(page, 'Publicada')
  await expect(publicada).toContainText('Publicada: versión 26')
  await expect(publicada).toContainText('Publicada E2E')
  await expect(publicada).toContainText('Fina Fórmula')
  const borrador = informacion(page).getByRole('region', { name: 'Borrador' })
  await expect(borrador).toContainText('Borrador de Fina Fórmula · guardado')
  await expect(borrador).toContainText('Empezó sobre la versión 25.')
  await expect(borrador).toContainText(
    'Después de que empezó, se publicó la versión 26: publicarlo dará conflicto.',
  )
  await cerrarLaInformacion(page)
  await abrirLasVersiones(page)
  await expect(versiones(page)).toHaveCount(20)
  await expect(versiones(page).first()).toContainText('Versión 26')
  await expect(versiones(page).first()).toContainText('Publicada')
  await expect(versiones(page).nth(1)).toContainText('Nota E2E 25')
  await expect(versiones(page).nth(1)).toContainText('Fina Fórmula')
  await page.getByRole('button', { name: 'Ver más' }).click()
  await expect(versiones(page)).toHaveCount(26)
  await expect(versiones(page).last()).toContainText('Versión 1')
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
})

test('con 520 versiones, «Ver más» llega hasta 500, avisa el tope e «Ir a la versión» lleva a lo antiguo', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await entrar(page, duena)
  await abrirFormula(page, grande.id)
  await abrirLasVersiones(page)
  await expect(versiones(page)).toHaveCount(20)
  for (let cargadas = 20; cargadas < 500; cargadas += 20) {
    await page.getByRole('button', { name: 'Ver más' }).click()
    await expect(versiones(page)).toHaveCount(cargadas + 20)
  }
  await expect(page.getByText('Mostrando las 500 más recientes.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  await page.getByLabel('Ir a la versión', { exact: true }).fill('abc')
  await page.getByRole('button', { name: 'Ir', exact: true }).click()
  await expect(page.getByText('Escribe un número de versión.')).toBeVisible()
  await page.getByLabel('Ir a la versión', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Ir', exact: true }).click()
  await expect(page.getByText('Desde la versión 10.')).toBeVisible()
  await expect(versiones(page)).toHaveCount(10)
  await expect(versiones(page).first()).toContainText('Versión 10')
  await expect(versiones(page).last()).toContainText('Versión 1')
  await page.getByRole('button', { name: 'Volver a la más nueva' }).click()
  await expect(versiones(page)).toHaveCount(20)
  await expect(versiones(page).first()).toContainText('Versión 521')
})

// @sin-celular: mide bytes y nodos de la lista, que son los mismos en el celular; la conducta de la lista la recorre en los dos la prueba de arriba
test('la lista de versiones pesa lo medido: bytes de «Ver más» y nodos con 20 y con 500', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await entrar(page, duena)
  await abrirFormula(page, grande.id)
  await abrirLasVersiones(page)
  await expect(versiones(page)).toHaveCount(20)
  const nodos = () =>
    page
      .getByRole('list', { name: 'Versiones de la fórmula' })
      .evaluate((lista) => lista.querySelectorAll('*').length + 1)
  const con20 = await nodos()
  // Sólo la página de versiones: la planilla de abajo lee la definición de la versión al abrirse, y esa no se cuenta.
  const respuesta = page.waitForResponse(
    (r) =>
      r.url().includes('/rest/v1/formulas') &&
      !r.url().includes('definicion') &&
      r.request().method() === 'GET',
  )
  await page.getByRole('button', { name: 'Ver más' }).click()
  const bytes = (await (await respuesta).body()).length
  await expect(versiones(page)).toHaveCount(40)
  for (let cargadas = 40; cargadas < 500; cargadas += 20) {
    await page.getByRole('button', { name: 'Ver más' }).click()
    await expect(versiones(page)).toHaveCount(cargadas + 20)
  }
  const con500 = await nodos()
  test.info().annotations.push({
    type: 'medida',
    description: `${bytes} B de «Ver más», ${con20} nodos con 20, ${con500} con 500`,
  })
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_VER_MAS)
  expect(con20).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_20)
  expect(con500).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_500)
})

test('la asesora, sin los niveles ni la fórmula, sigue sin entrar', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await abrirLaFormula(page, chica.id, 'planilla')
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Publicada: versión 26' })).toHaveCount(0)
})
