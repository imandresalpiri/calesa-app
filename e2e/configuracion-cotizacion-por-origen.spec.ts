// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { barraDeLaFormula, selectorDeFormula } from './soporte/barra-de-la-formula'
import { enLaPestana, pestanaDelOrigen } from './soporte/pestanas-del-origen'
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
import { abrirLaFormula, enElEditor } from './soporte/rutas-de-la-formula'

// La cotización de cada origen en su página y lo de toda la empresa en Catálogos y Roles (`docs/UX.md` › «La página del origen» y «Catálogos»): las pestañas
// Planilla · Hoja · Tarjeta, cada una su ruta con la fórmula elegida en `?formula=`, y el drawer «Tablas» de la barra de la fórmula; Niveles y Quién crea y
// quién ve ya viven en Roles; y quién abre qué. Las redirecciones de las rutas de antes y las pestañas apagadas por permiso:
// `configuracion-origen-centro.spec.ts`.
test.describe.configure({ mode: 'serial' })

const ORIGENES = '/configuracion/origenes'
const CATALOGOS = '/configuracion/catalogos'

let proyecto = ''
let conFormula = { id: '', nombre: '' }
let sinFormula = { id: '', nombre: '' }
let duena = ''
let configuradora = ''
let lectora = ''

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-por-origen-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Olga Origen' })
  conFormula = await crearOrigenDeCotizar(proyecto, 'porconf', true)
  sinFormula = await crearOrigenDeCotizar(proyecto, 'porsinf', false)
  configuradora = correoDePrueba(`configura-por-origen-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cora Configura',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}PorOrigen ${proyecto}`, clave: `e2e_por_origen_${proyecto}` },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: sinFormula.id }],
  })
  lectora = correoDePrueba(`lectora-por-origen-${proyecto}`)
  await crearPersona({ email: lectora, contrasena: CONTRASENA, nombre: 'Lía Lee', invitada: true })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}LeeRoles ${proyecto}`, clave: `e2e_lee_roles_${proyecto}` },
    permisos: ['equipo.roles.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })

test('E2E escritorio · la fórmula de un origen en Planilla, Hoja y Tarjeta, y su drawer Tablas', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = conFormula.id
  await page.goto(`${ORIGENES}/${id}/fases`)
  await expect(page.getByRole('heading', { name: conFormula.nombre, level: 1 })).toBeVisible()
  await pestanaDelOrigen(page, 'Planilla').click()
  // Sin `?formula=`, la pestaña dibuja la de trabajo y la escribe en la URL.
  await expect(page).toHaveURL(enElEditor(id, 'planilla'))
  await enLaPestana(page, 'Planilla')
  await expect(selectorDeFormula(page)).toHaveText(/^Fórmula: /)
  const conLaElegida = new URL(page.url()).searchParams.get('formula') ?? ''
  await pestanaDelOrigen(page, 'Hoja').click()
  await expect(page).toHaveURL(enElEditor(id, 'hoja', conLaElegida))
  await enLaPestana(page, 'Hoja')
  await pestanaDelOrigen(page, 'Tarjeta').click()
  await expect(page).toHaveURL(enElEditor(id, 'tarjeta', conLaElegida))
  await enLaPestana(page, 'Tarjeta')
  await barraDeLaFormula(page).getByRole('button', { name: 'Tablas', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${id}/tarjeta\\?.*panel=tablas`))
  const tablas = page.getByRole('dialog', { name: 'Tablas de referencia' })
  // El origen del spec no tiene tablas: el drawer dibuja su vacío (con tablas, la lista; `configuracion-cotizacion-tablas.spec.ts`).
  await expect(tablas.getByText(`${conFormula.nombre} no tiene tablas propias.`)).toBeVisible()
})

test('E2E escritorio · Niveles y Quién crea y quién ve ya no son catálogos: sus rutas de antes llevan a Roles', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto(`${CATALOGOS}/tablas`)
  // Colores y Vigencia viven en Orígenes (`configuracion-origenes-para-todos.spec.ts`); Niveles y Quién crea y quién ve, en el bloque «Cotizaciones» de Roles.
  for (const titulo of ['Niveles', 'Quién crea y quién ve', 'Colores', 'Vigencia']) {
    await expect(menu(page).getByRole('link', { name: titulo, exact: true })).toHaveCount(0)
  }
  for (const vieja of ['niveles', 'quien-crea-y-quien-ve']) {
    await page.goto(`${CATALOGOS}/${vieja}`)
    await expect(page).toHaveURL(/\/configuracion\/roles\?bloque=cotizaciones$/)
    await expect(page.getByText('Niveles de acceso', { exact: true }).first()).toBeVisible()
  }
})

test('E2E escritorio · quien configura un origen no abre uno ajeno ni los niveles de Roles', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirLaFormula(page, conFormula.id, 'hoja')
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver los orígenes' })).toHaveAttribute(
    'href',
    ORIGENES,
  )
  await abrirLaFormula(page, sinFormula.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  await page.goto(`${ORIGENES}/no-es-un-origen/planilla`)
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
  await page.goto(`${CATALOGOS}/niveles`)
  await expect(page).toHaveURL(/\/configuracion\/roles\?bloque=cotizaciones$/)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  // Catálogos ya no abre nada: al inicio. Las tablas compartidas redirigen al drawer del origen que ella configura.
  await page.goto(CATALOGOS)
  await expect(page).toHaveURL('/configuracion/inicio')
  await page.goto(`${CATALOGOS}/tablas`)
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${sinFormula.id}/planilla\\?panel=tablas$`))
})

test('E2E escritorio · quien sólo ve los roles abre los niveles de Roles y ningún origen', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`${CATALOGOS}/niveles`)
  await expect(page).toHaveURL(/\/configuracion\/roles\?bloque=cotizaciones$/)
  await expect(page.getByText('Niveles de acceso', { exact: true }).first()).toBeVisible()
  await page.goto(`${ORIGENES}/${conFormula.id}/planilla`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver los orígenes' })).toHaveCount(0)
})
