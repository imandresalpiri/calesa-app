import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  NOMBRE_DE_LA_TABLA,
  TITULO_DE_LA_AYUDA,
  otraPublicacionDeLaTabla,
  publicarConAyudaEnBloques,
} from './soporte/cotizar-ayuda-tabla'
import { crearVehiculoDePrueba, urlDeLaHoja } from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  limpiarGuardado,
  prepararGuardado,
  tipearEnLaHoja,
} from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// La ayuda de una celda armada con bloques en la hoja de cotizar (`docs/UX.md` › «La ayuda»; glosario: «Bloque de la ayuda»): «Ayuda de Con ayuda» abre el panel con el
// título del primer bloque, el texto con su negrita, el enlace y la tabla de la hoja abierta. Un factor es un botón que llena «Pública» y avisa con «Deshacer»; con un
// vehículo, su fila es «Tu vehículo». Quien configura el origen edita la tabla ahí mismo: «Guardar» la publica y la hoja vuelve con la versión nueva y lo tipeado.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let vehiculo = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'ayubloq'))
  publicarConAyudaEnBloques(origen.id, 9191.5)
  vehiculo = crearVehiculoDePrueba(origen.id, `Ayuda en bloques ${proyecto}`, 2019)
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const panel = (page: Page) => page.getByRole('dialog', { name: TITULO_DE_LA_AYUDA })
const botonDeAyuda = (page: Page) => page.getByRole('button', { name: 'Ayuda de Con ayuda' })
const tabla = (ayuda: Locator) => ayuda.getByRole('region', { name: `Tabla ${NOMBRE_DE_LA_TABLA}` })
const enLaUrl = (page: Page, clave: string) => new URL(page.url()).searchParams.get(clave)

async function abrirLaHoja(page: Page, resto = '', vehiculoId?: string): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${urlDeLaHoja(origen.id, lead, vehiculoId)}${resto}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

async function abrirLaAyuda(page: Page): Promise<Locator> {
  await botonDeAyuda(page).click()
  const ayuda = panel(page)
  await expect(tabla(ayuda).getByRole('row')).toHaveCount(4)
  return ayuda
}

test('los bloques se ven en orden con el título del panel; la URL de antes abre lo mismo y pasa a `bloques`', async ({
  page,
}) => {
  await abrirLaHoja(page, '&ayuda=texto&nodo=con_ayuda')
  const ayuda = panel(page)
  await expect(tabla(ayuda).getByRole('row')).toHaveCount(4)
  await expect.poll(() => enLaUrl(page, 'ayuda')).toBe('bloques')
  await expect(ayuda.getByText('la tabla del año', { exact: true })).toHaveJSProperty(
    'tagName',
    'STRONG',
  )
  await expect(ayuda.getByRole('link', { name: /Copart/ })).toHaveAttribute(
    'href',
    'https://www.copart.com/',
  )
  // Sólo las columnas que el bloque nombra, en su orden (quien configura suma «Acciones», la de la edición, al final).
  const columnas = tabla(ayuda).getByRole('columnheader')
  await expect(columnas.nth(0)).toHaveText('Año')
  await expect(columnas.nth(1)).toHaveText('Factor')
  await expect(columnas.filter({ hasText: 'Tipo de vehículo' })).toHaveCount(0)
  // El título va en la cabecera del panel, no se repite en el cuerpo.
  await expect(ayuda.getByText(TITULO_DE_LA_AYUDA, { exact: true })).toHaveCount(1)
})

test('un factor llena «Pública», cierra la ayuda y avisa con «Deshacer», que la deja como estaba', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await tipearEnLaHoja(page, 'pub', '7')
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('7,00')
  const ayuda = await abrirLaAyuda(page)
  // El factor de 2019 dicho como lo diría «Pública» (dólares).
  await ayuda.getByRole('button', { name: /^Usar .*9\.192,00 en Pública$/ }).click()
  await expect(ayuda).toBeHidden()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('9.192,00')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'Pública' })
  await expect(aviso).toBeVisible()
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('7,00')
})

test('con un vehículo, la fila de su año es «Tu vehículo»', async ({ page }) => {
  await abrirLaHoja(page, '', vehiculo)
  const ayuda = await abrirLaAyuda(page)
  const resaltada = ayuda.locator('[data-fila-del-vehiculo]')
  await expect(resaltada).toHaveCount(1)
  await expect(resaltada).toContainText('Tu vehículo')
  await expect(resaltada).toContainText('2019')
})

// @sin-celular: la edición de la tabla desde la ayuda es el mismo código en el drawer de abajo; el celular ya recorre el panel en las pruebas de arriba.
test('quien configura edita un factor y guarda: la tabla se publica y la hoja vuelve con la versión nueva y lo tipeado', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await tipearEnLaHoja(page, 'pub', '3')
  const ayuda = await abrirLaAyuda(page)
  await ayuda.getByRole('button', { name: 'Editar la fila 2' }).click()
  const factor = ayuda.getByLabel('Factor, fila 2')
  await factor.fill('9999,5')
  await ayuda.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(tabla(ayuda).getByRole('cell').filter({ hasText: '9.999,50' })).toBeVisible()
  const version = sql(
    `select version from public.tablas_referencia where origen_id = ${literal(origen.id)}::uuid and clave = 'ch_tabla'`,
  )
  expect(version).toBe('2')
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('3,00')
})

// @sin-celular: el conflicto al publicar la tabla desde la ayuda no depende del ancho; lo pide la tarea aunque la RPC tenga su prueba SQL.
test('si otra persona publicó la tabla entre medio, «Guardar» lo dice con «Recargar» y la fila editada sigue', async ({
  page,
}) => {
  await abrirLaHoja(page)
  const ayuda = await abrirLaAyuda(page)
  await ayuda.getByRole('button', { name: 'Editar la fila 1' }).click()
  const factor = ayuda.getByLabel('Factor, fila 1')
  await factor.fill('1234,5')
  otraPublicacionDeLaTabla(origen.id)
  await ayuda.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(ayuda.getByRole('button', { name: 'Recargar' })).toBeVisible()
  await expect(factor).toHaveValue('1234,5')
})
