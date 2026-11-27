// @sin-celular-archivo: Configuración se usa en escritorio; lo que ve cada permiso no cambia con el ancho de la pantalla
import { expect, test } from './soporte/prueba'
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
import {
  PREFIJO_T570,
  borrarCatalogosT570,
  drawerDe,
  grupoDe,
  origenPorClave,
  urlDelCatalogo,
} from './soporte/catalogos-en-fases'

// Quién ve y cambia los catálogos de logística de la pestaña Fases (T570): con sólo los catálogos de logística en A, entra a Fases de A con el diagrama en
// lectura y cambia los catálogos; en B no abre el origen. Con sólo «Configurar el flujo», los catálogos se ven en lectura con el motivo. El ⚙ de
// Logística lleva a las fases del origen de la cadena y sin permisos no aparece; `/logistica/configuracion` ya no existe.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let catalogos = ''
let configuradora = ''
let soloLogistica = ''
const a = () => origenPorClave('subasta_usa')
const b = () => origenPorClave('planilla_usa')
const MOTIVO = 'Pídele a quien administra los roles el permiso de configurar la logística.'

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarCatalogosT570()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-catalogos-permisos-${proyecto}`)
  catalogos = correoDePrueba(`catalogos-de-a-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-de-a-${proyecto}`)
  soloLogistica = correoDePrueba(`solo-logistica-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dina Dueña' })
  const personas = [
    [
      catalogos,
      'Cata Catálogos',
      'catalogos',
      [{ clave: 'logistica.catalogos.gestionar', origenId: a().id }],
    ],
    [configuradora, 'Fina Flujos', 'flujos', [{ clave: 'flujos.configurar', origenId: a().id }]],
    [soloLogistica, 'Lía Logística', 'ver', ['logistica.ver']],
  ] as const
  for (const [email, nombre, clave, permisos] of personas) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
    await darRolDePrueba({
      email,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}T570 ${clave} ${proyecto}`,
        clave: `e2e_t570_${clave}_${proyecto}`,
      },
      permisos: [...permisos],
    })
  }
})

test.afterAll(async () => {
  borrarCatalogosT570()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E con sólo los catálogos de logística en A: Fases de A en lectura, crea una naviera y no abre B', async ({
  page,
}) => {
  const naviera = `${PREFIJO_T570} Naviera de A ${proyecto}`
  await entrar(page, catalogos, { fresco: true })
  await page.goto(`/configuracion/origenes/${a().id}`)
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${a().id}/fases`))
  await expect(page.getByText('Toca una fase para verla.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva fase' })).toHaveCount(0)

  await page
    .getByRole('group', { name: 'Catálogos' })
    .getByRole('button', { name: 'Navieras' })
    .click()
  const drawer = drawerDe(page, 'Navieras')
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/panel=navieras/)
  await drawer.getByRole('button', { name: 'Nueva naviera' }).click()
  const nueva = page.getByRole('dialog', { name: 'Nueva naviera' })
  await nueva.getByLabel('Nombre').fill(naviera)
  await nueva.getByRole('button', { name: 'Crear naviera' }).click()
  await expect(nueva).toBeHidden()
  await expect(
    grupoDe(page, 'naviera', 'origen').getByRole('button', { name: `Editar ${naviera}` }),
  ).toBeVisible()

  await page.goto(`/configuracion/origenes/${b().id}/fases`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
})

test('E2E con sólo «Configurar el flujo» en A, Puertos se ve en lectura con el motivo', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'puertos'))
  const drawer = drawerDe(page, 'Puertos')
  await expect(drawer.getByRole('button', { name: 'Nuevo puerto' })).toBeDisabled()
  await expect(drawer.getByText(MOTIVO)).toBeVisible()
})

test('E2E el ⚙ de Logística lleva a las fases del origen de la cadena y la ruta vieja no existe', async ({
  page,
}) => {
  const configurar = page.getByRole('link', { name: 'Configurar la logística' })
  await entrar(page, duena, { fresco: true })
  await page.goto(`/logistica?origen=${a().id}`)
  await expect(configurar).toHaveAttribute('href', `/configuracion/origenes/${a().id}/fases`)
  await page.goto('/logistica/configuracion')
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
})

test('E2E sin permisos de configurar, Logística no muestra el ⚙', async ({ page }) => {
  const configurar = page.getByRole('link', { name: 'Configurar la logística' })
  await entrar(page, soloLogistica, { fresco: true })
  await page.goto('/logistica')
  await expect(page.getByRole('navigation', { name: /^Logística de / })).toBeVisible()
  await expect(configurar).toHaveCount(0)
})
