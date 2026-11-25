// @sin-celular-archivo: rutas viejas y redirecciones del servidor, sin interfaz nueva que mirar en el celular
import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { origenPorClave } from './soporte/origenes'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'

// Una ruta o un parámetro que se mudó no redirige (`.claude/rules/rutas.md`): la ruta vieja da «Esta página no existe» (404) y el parámetro
// viejo en una ruta viva se ignora (200, la URL no cambia). Sólo redirigen las estructurales de `scripts/guardas/sin-redirecciones.ts`.
// No cambia nada: sólo abre páginas.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let origen = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-rutas-viejas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Rita Rutas' })
  const deSubasta = await origenPorClave('subasta_usa')
  if (!deSubasta) throw new Error('falta el origen subasta_usa de la semilla')
  origen = deSubasta.id
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

test('E2E una ruta vieja da «Esta página no existe»', async ({ page }, info) => {
  await entrar(page)
  for (const ruta of [
    '/configuracion/catalogos/colores',
    `/configuracion/origenes/${origen}/formulas`,
  ]) {
    const respuesta = await page.goto(ruta)
    expect(respuesta?.status(), ruta).toBe(404)
    await expect(page).toHaveURL(ruta)
    await expect(
      page.getByRole('heading', { name: 'Esta página no existe', level: 1 }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  }
  await capturar(page, info, 'no-existe')
})

test('E2E un parámetro viejo en una ruta viva se ignora, sin redirigir', async ({ page }) => {
  await entrar(page)
  const inventario = `/vehiculos?situacion=en_subasta&origen=${origen}`
  const deVehiculos = await page.goto(inventario)
  expect(deVehiculos?.status()).toBe(200)
  await expect(page).toHaveURL(/[?&]situacion=en_subasta/)
  await expect(page.getByRole('heading', { name: 'Vehículos', level: 1 })).toBeAttached()
  await expect(page.getByText(/^Subasta: /)).toHaveCount(0)

  const deConfiguracion = await page.goto('/configuracion/inicio?editar=si')
  expect(deConfiguracion?.status()).toBe(200)
  await expect(page).toHaveURL(/\/configuracion\/inicio\?editar=si$/)
  await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones de Configuración' })).toBeVisible()
})

test('E2E las estructurales siguen llevando a donde está la persona hoy', async ({ page }) => {
  await entrar(page)
  const sinSeguir = { maxRedirects: 0 }
  const destino = (location: string | undefined) => new URL(location ?? '', 'http://x').pathname

  const configuracion = await page.request.get('/configuracion', sinSeguir)
  expect(configuracion.status()).toBe(308)
  expect(destino(configuracion.headers()['location'])).toBe('/configuracion/inicio')

  const repuestos = await page.request.get('/repuestos/configuracion', sinSeguir)
  expect(repuestos.status()).toBe(308)
  expect(destino(repuestos.headers()['location'])).toBe('/repuestos/configuracion/flujo')

  const delOrigen = await page.request.get(`/configuracion/origenes/${origen}`, sinSeguir)
  expect(delOrigen.status()).toBe(308)
  expect(destino(delOrigen.headers()['location'])).toMatch(
    new RegExp(`^/configuracion/origenes/${origen}/[a-z]+$`),
  )
  expect(delOrigen.headers()['cache-control']).toBe('private, no-store')
})
