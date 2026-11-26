import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { limpiarGuardado } from './soporte/cotizar-guardar'
import { esMovil } from './soporte/inventario'
import { esDelMarco } from './soporte/pedidos-del-marco'
import {
  TITULO_UNO,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/listado-de-cotizaciones'
import { literal, sql } from './soporte/sql'

// El resumen `?cotizacion=` del listado `/cotizaciones` (paso 4.16-4b): un clic en la fila o la tarjeta lo abre sin pedir nada, con el teclado y su vuelta del foco, la cotización que no
// está en la página la lee el servidor, y una que no existe o que quien mira no ve dice lo mismo. El terreno es el del listado (`soporte/listado-de-cotizaciones.ts`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

// Lo que esta persona abrió en el origen de la prueba: se borra al terminar (y antes de la prueba de lo visto, que parte de cero).
const borrarVistos = (): string =>
  sql(
    `delete from public.vistos where modulo = 'cotizaciones' and referencia_id in (select id from public.cotizaciones where origen_id = ${literal(t.origen.id)}::uuid)`,
  )

test.afterAll(async () => {
  borrarVistos()
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const filas = (page: Page): Locator =>
  page.locator('tbody tr, li article').filter({ visible: true })
// La lista de siempre (tabla, sin agrupar: T319): el resumen se abre desde cada cotización como una fila.
const enElOrigen = (): string => `/cotizaciones?origen=${t.origen.id}&vista=tabla&agrupar=no`
const vieja = (columna: 'id' | 'numero'): string =>
  sql(
    `select ${columna} from public.cotizaciones where origen_id = ${literal(t.origen.id)}::uuid and creado_en < now() - interval '5 days'`,
  )
const resumen = (page: Page): Locator => page.getByRole('dialog')
// La más nueva sobre el vehículo «uno», por su número (la tarjeta de la lista no repite el vehículo).
const delUno = (page: Page): Locator =>
  filas(page).filter({
    hasText: `N.º ${sql(`select numero from public.cotizaciones where vehiculo_id = ${literal(t.vehiculos.uno)}::uuid order by creado_en desc, id desc limit 1`)}`,
  })

async function irAlListado(page: Page, correo: string, consulta = ''): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`${enElOrigen()}${consulta}`)
  await expect(filas(page).first()).toBeVisible()
}

// Un clic en una parte de la fila que no es el botón del número: la celda del cliente en la tabla, el texto del cliente en la tarjeta.
async function abrirConUnClic(page: Page, fila: Locator): Promise<void> {
  if (esMovil(page)) {
    // La línea del autor de la tarjeta de la lista: texto (el título puede ser el enlace al vehículo y el cliente va enlazado a su ficha).
    await fila.locator('[data-autor-de-la-cotizacion]').click()
  } else {
    await fila.getByRole('cell').nth(2).click()
  }
}

test('R1 un clic en la fila o la tarjeta abre el resumen sin pedirle nada a la página (sólo lee «Todo» y «De este vehículo»), y «Abrir cotización» lleva a la página', async ({
  page,
}) => {
  await irAlListado(page, t.duena, '&por=10')
  const pedidos: string[] = []
  // Lo que costaría abrir: un pedido a la página del listado (un `router.refresh()`) o a la base que no sea la lectura de «Todo» (comentarios, revisiones y adjuntos) o la
  // de «De este vehículo» (si la cotización tiene vehículo). Los `<Link>` prefetchan sus rutas (el menú, «Abrir cotización»): eso no es abrir.
  page.on('request', (pedido) => {
    const esDeLaPagina = new URL(pedido.url()).pathname === '/cotizaciones'
    const esDeTodo =
      /\/rest\/v1\/(rpc\/cotizacion_comentarios|rpc\/cotizacion_revisiones|cotizaciones_adjuntos|rpc\/cotizaciones_de_este_vehiculo)/.test(
        pedido.url(),
      )
    if (
      (pedido.url().includes('/rest/v1/') && !esDelMarco(pedido.url()) && !esDeTodo) ||
      (esDeLaPagina && pedido.url().includes('_rsc='))
    ) {
      pedidos.push(pedido.url())
    }
  })
  const fila = delUno(page)
  await abrirConUnClic(page, fila)
  await expect(page).toHaveURL(/cotizacion=[0-9a-f-]{36}/)
  await expect(fila).toHaveAttribute('data-state', 'selected')
  await expect(resumen(page)).toBeVisible()
  await expect(
    resumen(page)
      .getByText(/^Cotización n\.º \d+$/)
      .first(),
  ).toBeVisible()
  await expect(resumen(page)).toContainText(t.origen.nombre)
  await expect(resumen(page)).toContainText('Preventa')
  await expect(resumen(page)).toContainText('Vale hasta el')
  await expect(resumen(page)).toContainText(t.nombreDelLeadDeLaDuena)
  await expect(resumen(page)).toContainText(TITULO_UNO)
  await expect(resumen(page)).toContainText('Gala Guarda')
  await page.waitForLoadState('networkidle')
  expect(pedidos).toEqual([])

  await resumen(page).getByRole('link', { name: 'Abrir cotización' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
})

test('R2 con el teclado: Enter en «Abrir N.º n» lo abre, Esc lo cierra y el foco vuelve ahí; «atrás» lo cierra y recargar lo abre', async ({
  page,
}) => {
  await irAlListado(page, t.duena)
  const boton = filas(page)
    .first()
    .getByRole('button', { name: /^Abrir N\.º \d+$/ })
  await boton.focus()
  await page.keyboard.press('Enter')
  await expect(resumen(page)).toBeVisible()
  await expect(page).toHaveURL(/cotizacion=/)

  await page.keyboard.press('Escape')
  await expect(resumen(page)).toBeHidden()
  await expect(page).not.toHaveURL(/cotizacion=/)
  await expect(boton).toBeFocused()

  // Abrir suma al historial: «atrás» lo cierra.
  // Con la clave ya escrita: nuqs dibuja el resumen antes de escribirla, y un «atrás» que sale antes de esa escritura vuelve una entrada de más.
  await boton.click()
  await expect(resumen(page)).toBeVisible()
  await expect(page).toHaveURL(/cotizacion=/)
  await page.goBack()
  await expect(resumen(page)).toBeHidden()
  await expect(page).not.toHaveURL(/cotizacion=/)

  // Recargar con la clave lo abre (la fila está en la página). nuqs dibuja el resumen antes de escribir la URL (la escribe en su cola, después):
  // recargar sin esperar la clave recarga la URL de antes (el rojo de movil del CI del 4.24-2b).
  await boton.click()
  await expect(resumen(page)).toBeVisible()
  await expect(page).toHaveURL(/cotizacion=/)
  await page.reload()
  await expect(resumen(page)).toBeVisible()
  await expect(resumen(page).getByRole('link', { name: 'Abrir cotización' })).toBeVisible()
})

test('R3 una fuera de la página la lee el servidor (con «Vencida» y su cliente) y «Siguiente» con el resumen abierto lo conserva', async ({
  page,
}) => {
  await irAlListado(page, t.duena, `&por=10&cotizacion=${vieja('id')}`)
  await expect(resumen(page)).toBeVisible()
  await expect(resumen(page)).toContainText(`Cotización n.º ${vieja('numero')}`)
  await expect(resumen(page)).toContainText('Vencida')
  await expect(resumen(page)).toContainText(t.nombreDelLeadDeLaDuena)
  await expect(resumen(page).getByRole('link', { name: 'Abrir cotización' })).toBeVisible()

  // Con el resumen abierto la página de atrás es inerte: el enlace «Siguiente» lleva la clave (la copia entera de la URL) y, al seguirlo, la misma cotización se abre.
  await page.goto(`${enElOrigen()}&por=10&cotizacion=${vieja('id')}`)
  const siguiente = page.getByRole('link', { name: 'Siguiente', includeHidden: true }).first()
  const destino = await siguiente.getAttribute('href')
  expect(destino).toContain('cotizacion=')
  await page.goto(destino ?? '')
  await expect(resumen(page)).toBeVisible()
  await expect(resumen(page)).toContainText(`Cotización n.º ${vieja('numero')}`)
})

const TEXTO = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'

test('R4 un id que no existe o que no es un guid dice que no está disponible', async ({ page }) => {
  await irAlListado(page, t.duena, '&cotizacion=00000000-0000-4000-8000-00000000dead')
  await expect(resumen(page)).toContainText('Cotización no disponible')
  await expect(resumen(page).getByRole('status')).toHaveText(TEXTO)

  await page.goto(`${enElOrigen()}&cotizacion=abc`)
  await expect(resumen(page).getByRole('status')).toHaveText(TEXTO)
})

test('R4b una que quien mira no ve dice lo mismo, sin su número ni su cliente', async ({
  page,
}) => {
  // Ana ve «propios»: la de la dueña, sobre un lead que no es suyo, no existe para ella.
  await irAlListado(page, t.ana, `&cotizacion=${vieja('id')}`)
  await expect(resumen(page).getByRole('status')).toHaveText(TEXTO)
  await expect(page.getByText(t.nombreDelLeadDeLaDuena)).toHaveCount(0)
  await expect(page.getByText(`N.º ${vieja('numero')}`)).toHaveCount(0)
})

test('R5 quien sólo ve cotizaciones abre una fuera de la página con el cliente en «—» y sin su nombre en el documento', async ({
  page,
}) => {
  await irAlListado(page, t.soloVer, `&por=10&cotizacion=${vieja('id')}`)
  await expect(resumen(page)).toContainText(`Cotización n.º ${vieja('numero')}`)
  await expect(
    resumen(page).getByText('Cliente').locator('xpath=following-sibling::*[1]'),
  ).toHaveText('—')
  await expect(page.getByText(t.nombreDelLeadDeLaDuena)).toHaveCount(0)
})

test('R6 abrir el resumen marca la fila como el último visto, y se recuerda al recargar', async ({
  page,
}) => {
  borrarVistos()
  await irAlListado(page, t.duena)
  const primera = filas(page).first()
  await expect(primera).toHaveAttribute('data-visto', 'nuevo')
  await expect(primera.getByTitle('Último visto', { exact: true })).toHaveCount(0)
  await abrirConUnClic(page, primera)
  await expect(resumen(page)).toBeVisible()
  // La marca la pone la URL del resumen: se espera su clave antes de cerrar y de recargar.
  await expect(page).toHaveURL(/[?&]cotizacion=/)
  await page.keyboard.press('Escape')
  await expect(resumen(page)).toHaveCount(0)
  await expect(primera).toHaveAttribute('data-visto', 'ultimo')
  await expect(primera.getByTitle('Último visto', { exact: true })).toBeVisible()
  // Al recargar la trae la base: hay que esperar a que el registro llegue.
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.vistos where modulo = 'cotizaciones' and tipo = 'cotizacion' and referencia_id in (select id from public.cotizaciones where origen_id = ${literal(t.origen.id)}::uuid)`,
      ),
    )
    .toBe('1')
  await page.reload()
  await expect(filas(page).first()).toHaveAttribute('data-visto', 'ultimo')
})
