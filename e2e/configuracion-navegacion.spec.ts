// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el selector del celular se mira en el recorrido de la IA
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './soporte/origenes'

// La navegación de Configuración: el menú son los grupos Empresa y equipo, Ventas y Web (Operación y Catálogos ya no tienen nada: lo de cada área vive donde se usa) sin Cotización, Flujos ni Logística; desde cada
// sección (salvo la página de un origen, que tiene sus migas) se vuelve al inicio con «‹ Configuración»; el menú (también en el inicio) marca la sección actual y salta a otra; quien sólo configura los
// leads ve sólo «Ventas › Leads»; y el inicio dice en Orígenes lo que le falta a cada origen, con su enlace a la pestaña.

let duena = ''
let soloLeads = ''
let cotizadora = ''
let proyecto = ''
let origen = { id: '', nombre: '' }
const claveDelOrigen = () => `navegacion_${proyecto}`

async function borrarLoMio() {
  await admin().from('origenes').delete().eq('clave', `${PREFIJO_CLAVE_E2E}${claveDelOrigen()}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-navegacion-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Nina Navega' })
  soloLeads = correoDePrueba(`leads-navegacion-${proyecto}`)
  await crearPersona({
    email: soloLeads,
    contrasena: CONTRASENA,
    nombre: 'Lola Leads',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloLeads,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sólo leads ${proyecto}`,
      clave: `e2e_solo_leads_${proyecto}`,
    },
    permisos: ['leads.configurar'],
  })
  // Nace sin fórmula publicada. Quien configura el cotizador sólo en él ve sólo su falta: las de los orígenes de otros specs, no.
  origen = await crearOrigenDePrueba(`E2E Navega ${proyecto}`, claveDelOrigen(), { tipo: 'manual' })
  cotizadora = correoDePrueba(`cotiza-navegacion-${proyecto}`)
  await crearPersona({
    email: cotizadora,
    contrasena: CONTRASENA,
    nombre: 'Coti Navega',
    invitada: true,
  })
  await darRolDePrueba({
    email: cotizadora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Cotiza uno ${proyecto}`,
      clave: `e2e_cotiza_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: origen.id }],
  })
})

test.afterAll(async () => {
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })
const volver = (page: Page) =>
  page.getByRole('main').getByRole('link', { name: 'Configuración', exact: true })
const tituloDelInicio = (page: Page) =>
  page.getByRole('heading', { name: 'Configuración', level: 1 })

test('E2E desde cada sección del menú se vuelve al inicio de Configuración', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa')
  await expect(menu(page)).toBeVisible()
  // La página de un origen no lleva «‹ Configuración»: su camino de vuelta son las migas.
  const rutas = (
    await menu(page)
      .getByRole('link')
      .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href') ?? ''))
  ).filter((ruta) => !/^\/configuracion\/origenes\/(?!nuevo)[^/]+/.test(ruta))
  expect(rutas.length).toBeGreaterThanOrEqual(9)
  // Cotización, Flujos y Logística ya no son secciones: lo de cada origen vive en su página y Catálogos ya no es una sección.
  for (const [grupo, secciones] of [
    ['Empresa y equipo', ['Empresa', 'Equipo', 'Roles y permisos']],
    ['Ventas', ['Leads', 'Orígenes']],
  ] as const) {
    await expect(
      menu(page).getByRole('list', { name: grupo, exact: true }).locator(':scope > li > a'),
    ).toHaveText([...secciones])
  }
  for (const vieja of ['Cotización', 'Flujos', 'Logística']) {
    await expect(menu(page).getByRole('link', { name: vieja, exact: true })).toHaveCount(0)
  }
  for (const ruta of rutas) {
    await page.goto(ruta)
    await expect(volver(page), ruta).toBeVisible()
    await volver(page).click()
    await expect(page).toHaveURL('/configuracion/inicio')
    await expect(tituloDelInicio(page)).toBeVisible()
    // En el inicio el menú sigue a la vista; la vuelta no va: ya estás en el inicio.
    await expect(menu(page)).toBeVisible()
    await expect(volver(page)).toHaveCount(0)
  }
})

test('E2E el menú marca la sección actual y salta a otra', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  // Leads es una página de tarjetas y «Campos» su única sub-sección: en la página, Leads es la página; en «Campos», la rama.
  await page.goto('/configuracion/leads')
  await expect(page).toHaveURL('/configuracion/leads')
  const leads = menu(page).getByRole('link', { name: 'Leads', exact: true })
  await expect(leads).toHaveAttribute('aria-current', 'page')
  await menu(page).getByRole('link', { name: 'Campos', exact: true }).click()
  await expect(page).toHaveURL('/configuracion/leads/campos')
  await expect(leads).toHaveAttribute('aria-current', 'true')
  await expect(menu(page).getByRole('link', { name: 'Campos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  // Catálogos ya no está en el menú: sus tablas, en el drawer de cada origen; los de logística, arriba del diagrama de su pestaña Fases.
  await expect(menu(page).getByRole('link', { name: 'Catálogos', exact: true })).toHaveCount(0)
  await expect(
    menu(page).getByRole('link', { name: 'Tablas compartidas', exact: true }),
  ).toHaveCount(0)
  await expect(menu(page).getByRole('link', { name: 'Puertos', exact: true })).toHaveCount(0)
})

test('E2E con sólo configurar los leads se ve sólo «Ventas › Leads»', async ({ page }) => {
  await page.context().clearCookies()
  await entrar(page, soloLeads, { fresco: true })
  await page.goto('/configuracion/leads')
  await expect(page).toHaveURL('/configuracion/leads')
  // Un solo grupo: las demás listas del menú son las sub-secciones de Leads, sin nombre.
  await expect(menu(page).getByRole('list', { name: /./ })).toHaveCount(1)
  await expect(menu(page).getByRole('list', { name: 'Ventas' })).toBeVisible()
  // «Campos» pide otro permiso: va apagada, sin enlace.
  await expect(menu(page).getByRole('link')).toHaveText(['Leads'])

  await volver(page).click()
  await expect(tituloDelInicio(page)).toBeVisible()
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Ventas'])
  await expect(main.getByRole('region', { name: 'Ventas' }).getByRole('link')).toHaveText(['Leads'])
})

test('E2E el inicio dice en Orígenes qué le falta a un origen nuevo, con su enlace a la pestaña', async ({
  page,
}) => {
  await page.context().clearCookies()
  await entrar(page, cotizadora, { fresco: true })
  await page.goto('/configuracion/inicio')
  const ventas = page.getByRole('main').getByRole('region', { name: 'Ventas' })
  // Configura sólo el cotizador en ese origen: el flujo (sin fases) no se le dice; la fórmula y la tarjeta sí, en una línea.
  const falta = ventas.getByRole('link', {
    name: `${origen.nombre}: falta activar una fórmula y publicar la tarjeta`,
    exact: true,
  })
  await expect(falta).toHaveAttribute('href', `/configuracion/origenes/${origen.id}/planilla`)
  await falta.click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${origen.id}/planilla(\\?|$)`))
  await expect(page.getByRole('heading', { name: origen.nombre, level: 1 })).toBeVisible()
})
