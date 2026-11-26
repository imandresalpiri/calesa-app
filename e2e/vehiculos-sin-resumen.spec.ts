import { expect, test } from './soporte/prueba'
import { aLaVista, entrar, menuDeVehiculo } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import {
  TITULO,
  abrirLaFicha,
  alInventario,
  enlaceDe,
  filaDe,
  limpiarLista,
  prepararLista,
  sembrarFotos,
  type TerrenoDeLaLista,
} from './soporte/vehiculos-lista'

// La lista de vehículos abre la ficha (T335, `docs/UX.md` › «Vehículos»): la fila y la tarjeta son un enlace a `/vehiculos/<id>` (el nombre es
// el `<a>`; el resto navega igual), Ctrl o el botón del medio abren otra pestaña, y lo que el ítem tiene adentro (la casilla, el «⋯», «Publicar»,
// la foto) no navega. No hay resumen: `?vehiculo=` en la lista no hace nada. «Cotizar vehículo» del
// «⋯», en `vehiculos-cotizar-desde-la-lista.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/t335`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaLista

test.beforeAll(async ({}, info) => {
  // La dueña de prueba publica y envía a la papelera: su fila tiene la casilla, «Publicar» y el «⋯». La lectora, nada de eso.
  t = await prepararLista(`${info.project.name}_sinres`, [
    'vehiculos.vitrina',
    'vehiculos.eliminar',
  ])
  await sembrarFotos(t.id, 3)
})

test.afterAll(async () => {
  await limpiarLista(t.id)
})

test('E2E un toque en la fila (tabla) o en la tarjeta (celular) abre la ficha del vehículo', async ({
  page,
}, info) => {
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  // El nombre es un enlace de verdad a la ficha, con el nombre del vehículo (sin «Abrir» delante).
  await expect(enlaceDe(page, TITULO)).toHaveAttribute('href', `/vehiculos/${t.id}`)
  await capturar(page, info, 'lista')
  await abrirLaFicha(page, TITULO, t.id)
  await capturar(page, info, 'ficha-desde-la-lista')
  // Enter sobre el nombre también: es un enlace.
  await page.goBack()
  await enlaceDe(page, TITULO).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${t.id}$`))
})

// @sin-celular: el clic con Ctrl y el botón del medio del ratón no existen en una pantalla táctil
test('E2E Ctrl+clic en la fila y el botón del medio en el nombre abren la ficha en otra pestaña', async ({
  page,
  context,
}) => {
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  const conCtrl = context.waitForEvent('page')
  await filaDe(page, TITULO).click({ position: { x: 6, y: 6 }, modifiers: ['ControlOrMeta'] })
  const otra = await conCtrl
  await expect(otra).toHaveURL(new RegExp(`/vehiculos/${t.id}$`))
  await otra.close()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)

  const conElMedio = context.waitForEvent('page')
  await enlaceDe(page, TITULO).click({ button: 'middle' })
  const tercera = await conElMedio
  await expect(tercera).toHaveURL(new RegExp(`/vehiculos/${t.id}$`))
  await tercera.close()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)
})

test('E2E la casilla, el «⋯», «Publicar» y la foto no navegan', async ({ page }, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const fila = filaDe(page, TITULO)

  await fila.getByRole('checkbox', { name: `Seleccionar ${TITULO}` }).click()
  await expect(fila.getByRole('checkbox', { name: `Seleccionar ${TITULO}` })).toBeChecked()
  await expect(page.getByRole('region', { name: 'Selección' })).toBeVisible()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)

  await menuDeVehiculo(page, TITULO).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await capturar(page, info, 'menu-de-la-fila')
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)

  // La foto abre el visor sobre la lista.
  await aLaVista(
    fila.getByRole('button', { name: new RegExp(`^Ver las? fotos? de ${TITULO}`) }),
  ).click()
  await expect(page.locator('[data-visor-de-imagenes]')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/vehiculos\\?.*visor=${t.id}`))
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-visor-de-imagenes]')).toBeHidden()

  // «Publicar» de la fila publica en el lugar (o pide el precio en un panel sobre la lista): no va a la ficha.
  await fila.getByRole('button', { name: `Publicar «${TITULO}» en la web` }).click()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)
})
