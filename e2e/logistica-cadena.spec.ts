import { expect, test } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarCadena,
  CANTIDAD_EN_LA_COLA,
  sembrarCadena,
  type TerrenoDeLaCadena,
} from './soporte/cadena'

// La cadena de `/logistica` (6.03), en escritorio: la gráfica de un origen de tres fases y una jubilada (una línea con una fase por punto, en el orden de la base, con su número y el demorado dicho con
// texto), el clic en una fase que lleva a su lista (filtros en la URL, búsqueda, «Siguientes» en una fase de 51), el clic en un vehículo que lleva a su página (nunca un drawer), «dónde está», las
// pestañas de origen (el vecino sin permiso no está) y la fase que ya no está.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLaCadena

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  if (proyecto !== 'escritorio') return
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-cadena-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Cadena',
  })
  terreno = await sembrarCadena(proyecto)
})

test.afterAll(async () => {
  if (proyecto !== 'escritorio') return
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'escritorio', 'La cadena se recorre en escritorio.')
})

const BUSCAR = 'Buscar por nombre, VIN o lote'

test('E2E la gráfica va en el orden de la base con su número, el demorado lo dice con texto y la jubilada va al final', async ({
  page,
}, info) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  const fases = page.locator('ol a[data-fase]')
  await expect(fases).toHaveCount(5)
  await expect(fases.nth(0)).toHaveAttribute('aria-label', 'Sin fase: 1 vehículo')
  await expect(fases.nth(1)).toHaveAttribute('aria-label', `Puerto ${proyecto}: 1 vehículo`)
  await expect(fases.nth(2)).toHaveAttribute(
    'aria-label',
    `Tránsito ${proyecto}: 2 vehículos, 1 demorado`,
  )
  await expect(fases.nth(3)).toHaveAttribute('aria-label', `Entrega ${proyecto}: 1 vehículo`)
  await expect(fases.nth(4)).toHaveAttribute('aria-label', `Jubilada ${proyecto}: 1 vehículo`)
  // Con texto, nunca sólo color: el demorado y la jubilada se dicen.
  await expect(fases.nth(2)).toContainText('1 demorado')
  await expect(fases.nth(4)).toContainText('Jubilada')
  await capturar(page, info, 'grafica')
  await expect(page.getByText('Todavía no hay vehículos en la cadena de este origen.')).toHaveCount(
    0,
  )
})

test('E2E clic en una fase lleva a su lista, con la búsqueda y los filtros en la URL', async ({
  page,
}, info) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  await page.locator(`a[data-fase="${terreno.fases.transito}"]`).click()
  await expect(page).toHaveURL(
    new RegExp(`/logistica/fase/${terreno.fases.transito}\\?origen=${terreno.a.id}`),
  )
  await expect(page.getByRole('heading', { name: `Tránsito ${proyecto}`, level: 1 })).toBeVisible()
  const filas = page.locator('tbody tr')
  await expect(filas).toHaveCount(2)
  await capturar(page, info, 'lista-de-la-fase')
  // El demorado dice «Demorado» con texto y sólo él; el reciente de su misma fase no.
  await expect(page.getByText('Demorado', { exact: true })).toHaveCount(1)
  await expect(filas.filter({ hasText: terreno.demorado.titulo })).toContainText(
    '3 días en la fase',
  )
  await expect(filas.filter({ hasText: terreno.reciente.titulo })).toContainText('Entró hoy')

  await page.getByRole('searchbox', { name: BUSCAR }).fill(terreno.demorado.vin ?? '')
  await expect(page).toHaveURL(new RegExp(`q=${terreno.demorado.vin ?? ''}`))
  await expect(filas).toHaveCount(1)
  await expect(filas).toContainText(terreno.demorado.titulo)
  await page.reload()
  await expect(filas).toHaveCount(1)
  await expect(page.getByRole('searchbox', { name: BUSCAR })).toHaveValue(
    terreno.demorado.vin ?? '',
  )
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await expect(filas).toHaveCount(2)

  // El contenedor viaja en la URL por su id y se dice con su número en el chip: sólo el de la fase Entrega lo tiene. Uno que no existe (o una URL
  // vieja con el número) dice que ya no está, con «Quitar filtro».
  const entrega = `/logistica/fase/${terreno.fases.entrega}?origen=${terreno.a.id}`
  await page.goto(`${entrega}&contenedor=${terreno.contenedorId}`)
  await expect(filas).toHaveCount(1)
  await expect(filas).toContainText(terreno.conTransporte.titulo)
  await expect(filas).toContainText(`${terreno.contenedor}`)
  await expect(page.getByText(`Contenedor: ${terreno.contenedor}`).first()).toBeVisible()
  for (const otro of ['00000000-0000-4000-8000-000000000000', terreno.contenedor]) {
    await page.goto(`${entrega}&contenedor=${otro}`)
    await expect(page.getByText('Ese contenedor ya no existe o no lo ves.')).toBeVisible()
  }
  await page.getByRole('link', { name: 'Quitar filtro' }).click()
  await expect(page).not.toHaveURL(/contenedor=/)
  await expect(filas).toHaveCount(1)
})

test('E2E una fase de 51 trae 50 y «Siguiente» trae el que falta, sin total', async ({
  page,
}, info) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.b.id}`)
  // La cifra no es un total exacto: la fase de 51 dice «51» porque cabe en el tope, y la lista pagina de a 50.
  await expect(page.locator('ol a[data-fase]').first()).toHaveAttribute(
    'aria-label',
    `Cola ${proyecto}: 51 vehículos`,
  )
  await page.locator('ol a[data-fase]').first().click()
  const filas = page.locator('tbody tr')
  await expect(filas).toHaveCount(50)
  await capturar(page, info, 'lista-de-50')
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas).toHaveCount(CANTIDAD_EN_LA_COLA - 50)
  await expect(page.getByRole('link', { name: 'Volver al principio' })).toBeVisible()
  await page.getByRole('link', { name: 'Volver al principio' }).click()
  await expect(filas).toHaveCount(50)
})

test('E2E clic en un vehículo de la lista lleva a su página, no a un drawer', async ({ page }) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica/fase/${terreno.fases.transito}?origen=${terreno.a.id}`)
  await page.getByRole('link', { name: terreno.demorado.titulo }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${terreno.demorado.id}$`))
  await expect(page.getByRole('heading', { name: terreno.demorado.titulo })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Un clic en el resto de la fila también va ahí.
  await page.goBack()
  await page
    .locator('tbody tr')
    .filter({ hasText: terreno.reciente.titulo })
    .getByText('Entró hoy')
    .click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${terreno.reciente.id}$`))
})

test('E2E «dónde está» dice en qué fase está y lleva a la página del vehículo', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  await page.getByRole('searchbox', { name: BUSCAR }).fill(terreno.demorado.vin ?? '')
  await page.getByRole('searchbox', { name: BUSCAR }).press('Enter')
  await expect(page).toHaveURL(new RegExp(`q=${terreno.demorado.vin ?? ''}`))
  const franja = page.getByRole('region', { name: 'Resultado de dónde está' })
  await expect(franja).toContainText(`en «Tránsito ${proyecto}» hace 3 días`)
  await page.reload()
  await expect(franja).toContainText(`en «Tránsito ${proyecto}»`)
  await expect(page.getByRole('searchbox', { name: BUSCAR })).toHaveValue(
    terreno.demorado.vin ?? '',
  )
  await franja.getByRole('link', { name: terreno.demorado.titulo }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${terreno.demorado.id}$`))
})

test('E2E las pestañas de origen: el vecino sin permiso no está y cambiar de origen cambia la gráfica', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: terreno.a.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(pestanas.getByRole('link', { name: terreno.c.nombre })).toHaveCount(0)
  await pestanas.getByRole('link', { name: terreno.b.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${terreno.b.id}`))
  await expect(page.locator('ol a[data-fase]')).toHaveCount(1)
  // Un origen que la persona no ve no se muestra: ni la gráfica ni la lista de una fase suya.
  await page.goto(`/logistica/fase/sin_fase?origen=${terreno.c.id}`)
  await expect(page.getByText('No tienes permiso', { exact: false })).toBeVisible()
})

test('E2E una fase que ya no está lo dice, con el camino a la cadena', async ({ page }) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica/fase/abc?origen=${terreno.a.id}`)
  await expect(page.getByText('Esta fase ya no está en la cadena de este origen.')).toBeVisible()
  await page.getByRole('link', { name: 'Ver la cadena' }).click()
  await expect(page.locator('ol a[data-fase]')).toHaveCount(5)
})
