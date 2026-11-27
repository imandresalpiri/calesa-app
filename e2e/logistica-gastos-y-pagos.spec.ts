// @sin-celular-archivo: el camino feliz del dinero de la unidad va en escritorio, como pide la fila 6.11; en el celular el panel de la unidad es el mismo drawer con tarjetas (6.01).
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarDinero,
  NOMBRE_DE_QUIEN_CONFIRMA,
  sembrarDinero,
  tipoDeCambioPorDefecto,
  type TerrenoDeDinero,
} from './soporte/dinero'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// Gastos, pagos y margen en el panel de la unidad (6.11). Tramo 1: con `logistica.gastos.ver` y `editar` se registra un gasto en otra moneda con el tipo de cambio por defecto y la lista muestra
// el equivalente que devolvió la base; la vista «Margen» dice «Sin venta registrada» en una línea (nunca 0) y su desglose, «Sin cotización final» y el gasto como real; cambiar de vista no mueve el drawer. Quien no tiene `logistica.gastos.ver` ni
// `logistica.margen.ver` no ve ninguno de los dos bloques. Tramo 2 (6.11-2): con `logistica.pagos.editar` se registra un pago que queda «Sin confirmar» (su «⋯» no ofrece confirmar); otra cuenta con
// `logistica.pagos.confirmar` lo confirma, el pago queda sellado con su nombre y de sólo lectura, y el margen pasa de «Sin venta registrada» a la venta, sin recargar la página.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDinero

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-dinero-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Dinero',
  })
  terreno = await sembrarDinero(proyecto)
})

test.afterAll(async () => {
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const formato = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

test('E2E sin los permisos de dinero la unidad no tiene la pestaña «Dinero» ni dibuja «Gastos», «Pagos» ni «Margen»', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Dinero' })).toHaveCount(0)
  await expect(page.locator('[data-bloque-del-hueco]').first()).toBeAttached()
  for (const clave of ['gastos', 'pagos', 'margen']) {
    await expect(page.locator(`[data-bloque-del-hueco="${clave}"]`)).toHaveCount(0)
  }
})

test('E2E registrar un gasto en otra moneda muestra su equivalente y el margen sin venta', async ({
  page,
}) => {
  const tipo = await tipoDeCambioPorDefecto()
  // Un monto que da un equivalente redondo con el valor de la base: 100 de la moneda base.
  const monto = Math.round(tipo.monedaPorBase * 100 * 100) / 100
  const equivalente = formato(Math.round((monto / tipo.monedaPorBase) * 100) / 100)

  await entrar(page, terreno.conDinero, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  // La pestaña «Dinero» (gastos, pagos y margen juntos), no el enlace «Gastos» de la sub-navegación de Logística.
  await abrirSeccionDeLaUnidad(page, 'gastos')
  await expect(page.getByText('Esta unidad no tiene gastos registrados.')).toBeVisible()

  await page.getByRole('button', { name: 'Registrar gasto' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar gasto' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Categoría').selectOption({ label: 'Flete marítimo' })
  await formulario.getByLabel('Moneda').selectOption(tipo.moneda)
  await formulario.getByLabel('Monto').fill(formato(monto))
  // El tipo por defecto de la empresa queda elegido; quien carga puede cambiarlo.
  await expect(formulario.getByLabel('Tipo de cambio')).toContainText(tipo.nombre)
  await formulario.getByRole('button', { name: 'Registrar gasto' }).click()
  await expect(formulario).toBeHidden()

  const lista = page.getByRole('list', { name: 'Gastos de la unidad' })
  await expect(lista.getByText('Flete marítimo')).toBeVisible()
  await expect(lista.getByText(/Equivale a/)).toContainText(equivalente)

  // Cambiar de vista no mueve el drawer: mide lo mismo en Gastos, Pagos y Margen.
  const drawer = page
    .getByRole('dialog')
    .filter({ has: page.locator('[data-vistas-de-la-tarjeta]') })
  const caja = await drawer.boundingBox()
  await abrirSeccionDeLaUnidad(page, 'margen')
  const margen = page.locator('[data-hueco="margen"][data-estado="listo"]')
  // El margen en una línea: un nulo es «Sin venta registrada», nunca 0.
  await expect(margen.locator('[data-cifra="margen"]')).toContainText('Sin venta registrada')
  expect(await drawer.boundingBox()).toEqual(caja)
  await abrirSeccionDeLaUnidad(page, 'pagos')
  expect(await drawer.boundingBox()).toEqual(caja)
  await abrirSeccionDeLaUnidad(page, 'margen')

  // El desglose, a un toque: las cifras como las da la base, en la moneda base.
  await margen.getByRole('button', { name: 'Ver el desglose' }).click()
  const desglose = page.getByRole('dialog', { name: 'Desglose del margen' })
  await expect(desglose).toBeVisible()
  await expect(desglose.locator('[data-cifra="cotizado"]')).toContainText('Sin cotización final')
  await expect(desglose.locator('[data-cifra="desviacion"]')).toContainText('Sin cotización final')
  await expect(desglose.locator('[data-cifra="venta"]')).toContainText('Sin venta registrada')
  await expect(desglose.locator('[data-cifra="margen"]')).toContainText('Sin venta registrada')
  await expect(desglose.locator('[data-cifra="real"]')).toContainText(equivalente)
  await expect(desglose.getByRole('region', { name: 'Real por categoría' })).toContainText(
    'Flete marítimo',
  )
  await page.keyboard.press('Escape')
  await expect(desglose).toBeHidden()
})

test('E2E registrar un pago, confirmarlo con otra cuenta y ver la venta en el margen', async ({
  browser,
  page,
}) => {
  const monto = 1500

  await entrar(page, terreno.conDinero, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await abrirSeccionDeLaUnidad(page, 'pagos')
  await expect(page.getByText('Esta unidad no tiene pagos registrados.')).toBeVisible()

  await page.getByRole('button', { name: 'Registrar pago' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Concepto').fill('Anticipo e2e')
  await formulario.getByLabel('Monto').fill(formato(monto))
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()

  const lista = page.getByRole('list', { name: 'Pagos de la unidad' })
  await expect(lista.getByText('Anticipo e2e')).toBeVisible()
  await expect(lista.getByText('Sin confirmar')).toBeVisible()
  // Quien carga el pago no tiene la clave de confirmar: su «⋯» no lo ofrece y no hay sello.
  await page.getByRole('button', { name: /Más acciones de pago Anticipo e2e/ }).click()
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Confirmar pago' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(lista.getByText(/Confirmado por/)).toHaveCount(0)

  // Otra cuenta, con la clave de confirmar, abre el margen (sin venta) y confirma el pago.
  const contexto = await browser.newContext()
  const otra = await contexto.newPage()
  try {
    await entrar(otra, terreno.conConfirmacion, { fresco: true })
    await otra.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
    await abrirSeccionDeLaUnidad(otra, 'margen')
    const margen = otra.locator('[data-hueco="margen"][data-estado="listo"]')
    await expect(margen.locator('[data-cifra="margen"]')).toContainText('Sin venta registrada')
    await abrirSeccionDeLaUnidad(otra, 'pagos')
    const pagos = otra.getByRole('list', { name: 'Pagos de la unidad' })
    await expect(pagos.getByText('Anticipo e2e')).toBeVisible()
    // Quien confirma no tiene la clave de editar: ni «Registrar pago» ni «Editar».
    await expect(otra.getByRole('button', { name: 'Registrar pago' })).toHaveCount(0)

    await otra.getByRole('button', { name: /Más acciones de pago Anticipo e2e/ }).click()
    await expect(otra.getByRole('menuitem', { name: 'Editar' })).toHaveCount(0)
    await otra.getByRole('menuitem', { name: 'Confirmar pago' }).click()
    const confirmar = otra.getByRole('dialog', { name: 'Confirmar el pago «Anticipo e2e»' })
    await expect(confirmar).toBeVisible()
    await expect(confirmar).toContainText('Queda sellado')
    await confirmar.getByRole('button', { name: 'Confirmar pago' }).click()
    await expect(confirmar).toBeHidden()

    // El sello dice quién y la fila queda de sólo lectura.
    await expect(
      pagos.getByText(new RegExp(`Confirmado por ${NOMBRE_DE_QUIEN_CONFIRMA}`)),
    ).toBeVisible()
    await expect(pagos.getByText('Sin confirmar')).toHaveCount(0)
    await otra.getByRole('button', { name: /Más acciones de pago Anticipo e2e/ }).click()
    await expect(otra.getByRole('menuitem', { name: 'Anular pago' })).toBeVisible()
    await expect(otra.getByRole('menuitem', { name: 'Confirmar pago' })).toHaveCount(0)
    await expect(otra.getByRole('menuitem', { name: 'Editar' })).toHaveCount(0)
    await expect(otra.getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0)
    await otra.keyboard.press('Escape')

    // Sin recargar: el margen ya tiene la venta (la suma de los pagos confirmados).
    await abrirSeccionDeLaUnidad(otra, 'margen')
    await expect(margen.locator('[data-cifra="margen"]')).not.toContainText('Sin venta registrada')
    await margen.getByRole('button', { name: 'Ver el desglose' }).click()
    const desglose = otra.getByRole('dialog', { name: 'Desglose del margen' })
    await expect(desglose.locator('[data-cifra="venta"]')).toContainText(formato(monto))
  } finally {
    await contexto.close()
  }
})

// Tramo 3 (6.11-3): `/logistica/gastos` lista, con lo que dejaron las pruebas de arriba (un gasto en otra moneda y un pago confirmado en la unidad), los gastos y los pagos que se ven. Un
// clic en la fila abre el panel de su unidad sin salir de la lista; ninguna suma en pantalla; un filtro sin coincidencias dice «Nada coincide» y se limpia. Quien no ve gastos ni pagos
// entra por la URL y encuentra «No tienes permiso».
test('E2E la lista de /logistica/gastos muestra el gasto y el pago, filtra y abre la unidad', async ({
  page,
}) => {
  await entrar(page, terreno.conDinero, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.origen.id}`)
  const barra = page.getByRole('navigation', { name: `Logística de ${terreno.origen.nombre}` })
  await barra.getByRole('link', { name: 'Gastos' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/gastos\\?origen=${terreno.origen.id}`))
  await expect(barra.getByRole('link', { name: 'Gastos' })).toHaveAttribute('aria-current', 'page')

  // Los gastos: la unidad, la categoría y el equivalente que guardó la base; ningún total.
  const abrir = page.getByRole('button', { name: `Abrir unidad ${terreno.enFase.titulo}` })
  await expect(abrir).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Flete marítimo' })).toBeVisible()
  await expect(page.getByText(/Equivale a/)).toBeVisible()
  await expect(page.getByText(/Total/)).toHaveCount(0)

  // La fila abre el panel de su unidad, y Esc lo cierra dejando la lista donde estaba.
  await abrir.click()
  await expect(page).toHaveURL(/vehiculo=/)
  const panel = page.getByRole('dialog', { name: 'Unidad' })
  await expect(panel.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).toHaveURL(/\/logistica\/gastos/)
  await expect(abrir).toBeVisible()

  // Los pagos: el concepto y su estado.
  await page
    .getByRole('navigation', { name: 'Qué lista ver' })
    .getByRole('link', { name: 'Pagos' })
    .click()
  await expect(page).toHaveURL(new RegExp(`ver=pagos&origen=${terreno.origen.id}`))
  await expect(page.getByRole('button', { name: /Anticipo e2e/ })).toBeVisible()
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()

  // El pago ya está confirmado: «sin confirmar» no encuentra nada y «Limpiar filtros» lo trae de vuelta.
  await page.goto(
    `/logistica/gastos?origen=${terreno.origen.id}&ver=pagos&confirmacion=sin_confirmar`,
  )
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('button', { name: /Anticipo e2e/ })).toBeVisible()
})

test('E2E sin gastos.ver ni pagos.ver /logistica/gastos dice que no hay permiso', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica/gastos?origen=${terreno.origen.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})
