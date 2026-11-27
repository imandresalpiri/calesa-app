import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { borrarMover, sembrarMover, type TerrenoDeMover } from './soporte/mover'
import { capturar } from './soporte/recorrido'
import { sql } from './soporte/sql'
import { sinDesplazarLaPagina } from './soporte/unidad'

// La página de la unidad (`/logistica/vehiculo/<id>`, `docs/UX.md` › «Logística: estados propios»): la cabecera baja que abre la ficha, la cadena de fases que elige qué mira «Qué
// falta» (`?fase_vista=`) y las tarjetas que abren sus huecos en un drawer (`?hueco=<tarjeta>`), con el Historial filtrado en la base (`?historial_fase=`, `?historial_quien=`).
// En escritorio la página no se desplaza y nada salta; en el celular, una columna con la barra «Mover». El terreno es el de mover (A → B → C, C pide el BL): la unidad en B pasó
// por A (dos cambios sembrados), la de A no tiene pasadas.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeMover
let duena = ''

const NOTA_DE_LA_PASADA = 'Zarpó el lunes'
const TABLAS_DE_LAS_TARJETAS =
  /\/rest\/v1\/(documentos|gastos|pagos|notas|declaraciones_vehiculos|rpc\/transporte_leer)\b/

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-cadena-tarjetas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Cadena' })
  terreno = await sembrarMover(proyecto)
  // Las pasadas de la unidad en B: entró a A sin persona (el alta) y pasó a B con la primera, con su nota.
  const quien = `(select id from auth.users where email = '${terreno.primera.correo}')`
  sql(`
    insert into historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, usuario_id, nota, creado_en)
    select f.flujo_id, '${terreno.enB.id}'::uuid, null::uuid, '${terreno.a.id}'::uuid, null::uuid, null::text, now() - interval '5 days'
      from fases f where f.id = '${terreno.a.id}'
    union all
    select f.flujo_id, '${terreno.enB.id}'::uuid, '${terreno.a.id}'::uuid, '${terreno.b.id}'::uuid, ${quien}, '${NOTA_DE_LA_PASADA}', now() - interval '2 days'
      from fases f where f.id = '${terreno.b.id}'
  `)
})

test.afterAll(async () => {
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const nodo = (page: Page, fase: { nombre: string }, tipo: string) =>
  page
    .getByRole('navigation', { name: 'Cadena de la unidad' })
    .getByRole('button', { name: `${fase.nombre}, ${tipo}` })
const queFalta = (page: Page) => page.locator('section[aria-labelledby="titulo-de-que-falta"]')
const tarjeta = (page: Page, clave: string) => page.locator(`[data-tarjeta="${clave}"]`)
const tarjetas = (page: Page) => page.locator('[data-slot="tarjetas-de-la-unidad"]')

// Las cajas que no deben moverse al elegir una fase, abrir un drawer o llegar los avisos.
async function cajas(page: Page) {
  const medir = async (l: Locator) => {
    const caja = await l.boundingBox()
    return caja === null ? null : { x: caja.x, y: caja.y, ancho: caja.width, alto: caja.height }
  }
  return {
    cadena: await medir(page.getByRole('navigation', { name: 'Cadena de la unidad' })),
    tarjetas: await medir(tarjetas(page)),
    queFalta: await medir(queFalta(page)),
  }
}

async function abrirLaUnidad(page: Page, id: string, query = '') {
  await page.goto(`/logistica/vehiculo/${id}${query}`)
  // El resumen de la última tarjeta ya llegó del servidor (su «⋯» viene con él).
  await expect(
    tarjeta(page, 'historial').getByRole('button', { name: 'Más acciones de Historial' }),
  ).toBeVisible()
}

test('E2E escritorio · la página entra sin desplazarse, la cadena elige qué mira «Qué falta» y nada salta', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'Escritorio: la página sin desplazamiento y las dos columnas.')
  const pedidos: string[] = []
  page.on('request', (r) => {
    if (TABLAS_DE_LAS_TARJETAS.test(r.url())) pedidos.push(r.url())
  })
  await entrar(page, duena, { fresco: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await abrirLaUnidad(page, terreno.enB.id)
  // Ninguna tarjeta lee en el navegador al cargar: sus resúmenes llegan del servidor.
  expect(pedidos, 'las tarjetas no leen desde el navegador').toEqual([])
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1440')
  const antes = await cajas(page)

  // La cadena: A pasada, B actual, C por venir.
  await expect(nodo(page, terreno.a, 'pasada')).toBeVisible()
  await expect(nodo(page, terreno.b, 'actual')).toHaveAttribute('aria-current', 'step')
  await expect(nodo(page, terreno.c, 'por venir')).toBeVisible()

  // Con el teclado: → lleva el foco a C sin elegirla; Enter la elige.
  await nodo(page, terreno.b, 'actual').focus()
  await page.keyboard.press('ArrowRight')
  await expect(nodo(page, terreno.c, 'por venir')).toBeFocused()
  await expect(page).not.toHaveURL(/fase_vista=/)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/[?&]fase_vista=/)
  // C es destino de B: sus requisitos, con el BL que falta, y con qué mover.
  await expect(queFalta(page).getByText(`Viendo «${terreno.c.nombre}»`)).toBeVisible()
  await expect(queFalta(page).getByText('Falta', { exact: true }).first()).toBeVisible()
  await capturar(page, info, 'escritorio-1440-fase-vista')
  expect(await cajas(page), 'elegir una fase no mueve nada').toEqual(antes)

  // La pasada A: entró, salió, quién y la nota. Recargar la conserva.
  await nodo(page, terreno.a, 'pasada').click()
  const pasada = queFalta(page).locator('[data-estado="pasada"]')
  await expect(pasada.getByText('Entró')).toBeVisible()
  await expect(pasada.getByText('Salió')).toBeVisible()
  await expect(pasada.getByText(terreno.primera.nombre)).toBeVisible()
  await expect(pasada.getByText(NOTA_DE_LA_PASADA)).toBeVisible()
  await page.reload()
  await expect(queFalta(page).locator('[data-estado="pasada"]')).toBeVisible()
  await queFalta(page).getByRole('button', { name: 'Volver a la actual' }).click()
  await expect(page).not.toHaveURL(/fase_vista=/)
  await expect(nodo(page, terreno.b, 'actual')).toHaveAttribute('aria-pressed', 'true')

  // Abrir y cerrar el drawer de una tarjeta tampoco mueve nada.
  await tarjeta(page, 'historial').locator('[data-abre-tarjeta]').click()
  await expect(page).toHaveURL(/[?&]hueco=historial/)
  await expect(page.locator('[data-hueco="historial"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-hueco="historial"]')).toBeHidden()
  expect(await cajas(page), 'abrir y cerrar un drawer no mueve nada').toEqual(antes)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.reload()
  await expect(nodo(page, terreno.b, 'actual')).toBeVisible()
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1280')
})

test('E2E escritorio · una fase que no es destino dice por cuál tiene que pasar primero, sin «Mover»', async ({
  page,
}) => {
  test.skip(esMovil(page), 'Escritorio: lo mismo en el celular lo prueba la cadena de arriba.')
  await entrar(page, duena, { fresco: true })
  await abrirLaUnidad(page, terreno.enA.id)
  await expect(nodo(page, terreno.a, 'actual')).toBeVisible()
  await nodo(page, terreno.c, 'por venir').click()
  await expect(
    queFalta(page).getByText(`Primero tiene que pasar por «${terreno.b.nombre}».`),
  ).toBeVisible()
  await expect(queFalta(page).getByRole('button', { name: /^Mover/ })).toHaveCount(0)
})

test('E2E escritorio · la cabecera abre la ficha y las tarjetas abren sus huecos', async ({
  page,
}, info) => {
  test.skip(
    esMovil(page),
    'Escritorio: el modal de la ficha y los drawers se recorren igual en el celular.',
  )
  await entrar(page, duena, { fresco: true })
  await abrirLaUnidad(page, terreno.enB.id)

  // La cabecera: el primer h2 es el título; tocarla abre la ficha en `?ver=ficha` (ya no hay enlace «Abrir ficha»).
  const cabecera = page.locator('[data-slot="cabecera-de-la-unidad"]')
  await expect(page.locator('h2').first()).toHaveText(terreno.enB.titulo)
  await expect(page.getByRole('link', { name: 'Abrir ficha' })).toHaveCount(0)
  const verLaFicha = cabecera.getByRole('button', { name: `Ver la ficha de ${terreno.enB.titulo}` })
  await verLaFicha.click()
  await expect(page).toHaveURL(/[?&]ver=ficha/)
  const ficha = page.locator('[data-ficha-completa]')
  await expect(ficha).toBeVisible()
  await expect(ficha.getByRole('link', { name: 'Abrir en Vehículos' })).toHaveAttribute(
    'href',
    `/vehiculos/${terreno.enB.id}`,
  )
  await page.keyboard.press('Escape')
  await expect(ficha).toBeHidden()
  await expect(verLaFicha).toBeFocused()

  // Las tarjetas van en su orden (las que la dueña ve con las reglas de este origen).
  const orden = ['documentos', 'transporte', 'repuestos', 'aduana', 'dinero', 'notas', 'historial']
  const vistas = await page
    .locator('[data-tarjeta]')
    .evaluateAll((ts) => ts.map((t) => t.getAttribute('data-tarjeta') ?? ''))
  expect(vistas).toEqual(orden.filter((c) => vistas.includes(c)))
  for (const clave of ['documentos', 'dinero', 'notas', 'historial'])
    expect(vistas, `la tarjeta ${clave}`).toContain(clave)

  // Dinero junta gastos, pagos y margen en su drawer, una pestaña cada uno: abre la primera y cada pestaña queda en la URL.
  await tarjeta(page, 'dinero').locator('[data-abre-tarjeta]').click()
  await expect(page).toHaveURL(/[?&]hueco=dinero/)
  await expect(page.locator('[data-hueco="gastos"]')).toBeVisible()
  for (const hueco of ['pagos', 'margen']) {
    await page.locator(`[role="tab"][data-vista="${hueco}"]`).click()
    await expect(page.locator(`[data-hueco="${hueco}"]`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`[?&]dinero=${hueco}`))
  }
  await capturar(page, info, 'escritorio-drawer-de-dinero')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-hueco="gastos"]')).toBeHidden()

  // Repuestos sin proyecto: su «⋯» ofrece pedirlos para este vehículo.
  if (vistas.includes('repuestos')) {
    await tarjeta(page, 'repuestos')
      .getByRole('button', { name: 'Más acciones de Repuestos' })
      .click()
    await page.getByRole('menuitem', { name: 'Pedir repuestos para este vehículo' }).click()
    await expect(page).toHaveURL(
      new RegExp(`/repuestos\\?panel=nuevo-proyecto&vehiculo=${terreno.enB.id}`),
    )
    await page.goBack()
    await expect(tarjeta(page, 'notas')).toBeVisible()
  }

  // Notas: tocar la tarjeta abre el drawer con el campo enfocado; al guardar y cerrar, el resumen dice la nota nueva.
  await tarjeta(page, 'notas').getByRole('button', { name: 'Escribir una nota' }).click()
  const campo = page.getByRole('textbox', { name: 'Escribir una nota' })
  await expect(campo).toBeFocused()
  await campo.fill('Revisar el BL con la naviera')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(
    page.locator('[data-nota]').filter({ hasText: 'Revisar el BL con la naviera' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tarjeta(page, 'notas')).toContainText('Revisar el BL con la naviera')
})

test('E2E escritorio · el Historial se filtra por fase y por quién, en la URL', async ({
  page,
}) => {
  test.skip(esMovil(page), 'Escritorio: el filtro es el mismo en el celular.')
  await entrar(page, duena, { fresco: true })
  await abrirLaUnidad(page, terreno.enB.id, '?hueco=historial')
  const historial = page.locator('[data-hueco="historial"]')
  await expect(historial.locator('li')).toHaveCount(2)
  await historial.getByLabel('Fase').selectOption({ label: terreno.a.nombre })
  await expect(page).toHaveURL(new RegExp(`[?&]historial_fase=${terreno.a.id}`))
  await expect(historial.locator('li')).toHaveCount(1)
  await historial.getByLabel('Fase').selectOption({ label: 'Todas' })
  await historial.getByLabel('Quién').selectOption({ label: terreno.primera.nombre })
  await expect(page).toHaveURL(/[?&]historial_quien=/)
  await expect(historial.locator('li')).toHaveCount(1)
  await expect(historial).toContainText(NOTA_DE_LA_PASADA)
  // Fase A y quien movió a B: nada cumple los dos; «Quitar filtros» los quita.
  await historial.getByLabel('Fase').selectOption({ label: terreno.a.nombre })
  await expect(historial.getByText('Nada coincide con los filtros')).toBeVisible()
  await historial.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(page).not.toHaveURL(/historial_(fase|quien)=/)
  await expect(historial.locator('li')).toHaveCount(2)
})

test('E2E escritorio · sin permisos de dinero ni de repuestos no hay esas tarjetas', async ({
  page,
}) => {
  test.skip(esMovil(page), 'Escritorio: los permisos no dependen del ancho.')
  await entrar(page, terreno.primera.correo, { fresco: true })
  await abrirLaUnidad(page, terreno.enB.id)
  await expect(tarjeta(page, 'notas')).toBeVisible()
  await expect(tarjeta(page, 'dinero')).toHaveCount(0)
  await expect(tarjeta(page, 'repuestos')).toHaveCount(0)
})

test('E2E celular · una columna: cabecera, cadena, «Qué falta» y tarjetas, con la barra «Mover»', async ({
  page,
}, info) => {
  test.skip(!esMovil(page), 'Celular: la columna y la barra «Mover» son del ancho angosto.')
  await entrar(page, duena, { fresco: true })
  await abrirLaUnidad(page, terreno.enB.id)
  const y = async (l: Locator) => (await l.boundingBox())?.y ?? Number.NaN
  const cabecera = await y(page.locator('[data-slot="cabecera-de-la-unidad"]'))
  const cadena = await y(page.getByRole('navigation', { name: 'Cadena de la unidad' }))
  const falta = await y(queFalta(page))
  const lasTarjetas = await y(tarjetas(page))
  expect(cabecera).toBeLessThan(cadena)
  expect(cadena).toBeLessThan(falta)
  expect(falta).toBeLessThan(lasTarjetas)
  await expect(page.getByRole('button', { name: 'Mover', exact: true })).toBeVisible()
  await expect(nodo(page, terreno.b, 'actual')).toBeInViewport()
  await capturar(page, info, 'celular')
})
