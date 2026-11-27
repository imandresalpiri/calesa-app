import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { agregarItems } from './soporte/repuestos-tarjetas'
import { sql } from './soporte/sql'

// Los paneles del pago y de la compra de `/repuestos/[id]` (`?pestana=pagos&panel=pago&pago=` y `?pestana=compras&panel=compra&compra=`): arriba el monto con su moneda, el estado y
// la fecha; la zona del comprobante a la vista aunque esté vacía; subir un PDF y una imagen, ver su vista previa, reemplazarlo y quitarlo sin que la zona cambie de alto; y un pago
// confirmado que se abre en sólo lectura con su sello. La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas.
test.describe.configure({ mode: 'serial' })

const BOMBA = 'Bomba de agua'
const PDF = {
  name: 'factura.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
}
const PNG = {
  name: 'recibo.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
}

let etiqueta = ''
let duena = ''
let proyecto = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = '${etiqueta}'`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba comprobante e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-comprobante-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Comprobante' })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

const altoDe = async (zona: Locator) => (await zona.boundingBox())?.height ?? 0

// Vacía, sube un PDF, lo reemplaza por una imagen (con su miniatura), lo quita y vuelve a subir el PDF: la zona mide siempre lo mismo.
async function recorrerLaZona(page: Page, zona: Locator, vacio: string) {
  await expect(zona).toBeVisible()
  await expect(zona).toContainText(vacio)
  await expect(zona).toContainText('PDF o imagen de hasta 10 MB.')
  const alto = await altoDe(zona)
  const archivo = zona.locator('input[type=file]')

  await archivo.setInputFiles(PDF)
  await expect(zona.getByText('factura.pdf')).toBeVisible()
  await expect(zona.getByRole('button', { name: 'Ver comprobante' })).toBeVisible()
  expect(await altoDe(zona)).toBe(alto)

  await zona.getByRole('button', { name: 'Reemplazar' }).waitFor()
  await archivo.setInputFiles(PNG)
  await expect(zona.getByText('recibo.png')).toBeVisible()
  await expect(zona.locator('img[data-vista-previa]')).toBeVisible()
  expect(await altoDe(zona)).toBe(alto)

  await zona.getByRole('button', { name: 'Quitar' }).click()
  await expect(zona).toContainText(vacio)
  expect(await altoDe(zona)).toBe(alto)

  await archivo.setInputFiles(PDF)
  await expect(zona.getByText('factura.pdf')).toBeVisible()
  // Sólo PDF o imagen: otro tipo se rechaza dentro del renglón reservado, sin tocar el alto.
  await archivo.setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('x'),
  })
  await expect(
    page.getByRole('alert').filter({ hasText: 'Sólo PDF o imagen de hasta 10 MB.' }),
  ).toBeVisible()
  expect(await altoDe(zona)).toBe(alto)
}

test('E2E el pago: la zona del comprobante a la vista, sube, reemplaza y quita; confirmado se lee con su sello', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  await page.goto(`/repuestos/${proyecto}?pestana=pagos`)
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await expect(formulario).toBeVisible()
  // Arriba lo principal: el monto con su moneda, el estado y la fecha.
  await expect(formulario.getByLabel('Monto')).toBeVisible()
  await expect(formulario.getByLabel('Moneda')).toBeVisible()
  await expect(formulario.getByText('Sin confirmar')).toBeVisible()
  await expect(formulario.getByLabel('Fecha')).not.toHaveValue('')
  // «Más datos» a la vista, nunca plegado: el método, el tipo de cambio y las notas.
  await expect(formulario.getByRole('heading', { name: 'Más datos' })).toBeVisible()
  for (const campo of ['Método', 'Tipo de cambio', 'Notas']) {
    await expect(formulario.getByLabel(campo)).toBeVisible()
  }

  const zona = formulario.getByRole('group', { name: 'Comprobante' })
  await recorrerLaZona(page, zona, 'Arrastra aquí el comprobante o elígelo.')

  await formulario.getByLabel('Concepto').fill('Anticipo con comprobante')
  await formulario.getByLabel('Monto').fill('120,00')
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()
  expect(
    sql(
      `select (comprobante_ruta like '${proyecto}/%.pdf') from pagos where proyecto_repuestos_id = '${proyecto}'`,
    ).trim(),
  ).toBe('t')

  // Sin confirmar: tocarlo lo abre para editar, con su comprobante ya adjunto.
  const lista = page.getByRole('list', { name: 'Pagos del proyecto' })
  await lista.getByRole('button', { name: 'Abrir pago Anticipo con comprobante' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar pago' })
  await expect(edicion.getByRole('group', { name: 'Comprobante' })).toContainText('Comprobante.pdf')
  await edicion.getByRole('button', { name: 'Cancelar' }).click()
  await expect(edicion).toBeHidden()

  await page.getByRole('button', { name: /Más acciones de pago Anticipo con comprobante/ }).click()
  await page.getByRole('menuitem', { name: 'Confirmar pago' }).click()
  const confirmar = page.getByRole('dialog', {
    name: 'Confirmar el pago «Anticipo con comprobante»',
  })
  await confirmar.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(confirmar).toBeHidden()
  await expect(lista.getByText(/Confirmado por Rita Comprobante/)).toBeVisible()

  // Confirmado: el mismo panel, sólo para leer, con su sello y «Anular pago».
  await lista.getByRole('button', { name: 'Abrir pago Anticipo con comprobante' }).click()
  const lectura = page.getByRole('dialog', { name: 'Pago', exact: true })
  await expect(lectura.getByText('Confirmado', { exact: true })).toBeVisible()
  await expect(lectura.getByText(/Confirmado por Rita Comprobante/)).toBeVisible()
  await expect(lectura.getByRole('textbox')).toHaveCount(0)
  await expect(lectura.getByRole('button', { name: 'Ver comprobante' })).toBeVisible()
  await expect(lectura.getByRole('button', { name: 'Quitar' })).toHaveCount(0)
  await expect(lectura.getByRole('button', { name: 'Anular pago' })).toBeVisible()
})

test('E2E la compra: la zona del comprobante a la vista, sube, reemplaza y quita', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await agregarItems(page, [BOMBA])
  await page.goto(`/repuestos/${proyecto}?pestana=compras`)
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Registrar compra' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByLabel('Monto')).toBeVisible()
  await expect(dialogo.getByLabel('Moneda')).toBeVisible()
  await expect(dialogo.getByText('Sin registrar')).toBeVisible()
  await expect(dialogo.getByLabel('Fecha')).toBeVisible()
  for (const grupo of ['Qué se compró', 'Notas', 'Comprobante de la compra']) {
    await expect(dialogo.getByRole('heading', { name: grupo })).toBeVisible()
  }

  const zona = dialogo.getByRole('group', { name: 'Comprobante de la compra' })
  await recorrerLaZona(page, zona, 'Arrastra aquí el comprobante o elígelo.')

  await dialogo.getByLabel('Ítem').selectOption({ label: BOMBA })
  await dialogo.getByLabel('Proveedor').fill('Repuestos Andinos')
  await dialogo.getByLabel('Monto').fill('30')
  await dialogo.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(dialogo).toBeHidden()
  expect(
    sql(
      `select (comprobante_ruta like '${proyecto}/%.pdf') from repuestos_compras where proyecto_id = '${proyecto}'`,
    ).trim(),
  ).toBe('t')

  // Editar: el comprobante ya adjunto se ve en su zona.
  await page
    .getByRole('list', { name: 'Compras del proyecto' })
    .getByRole('listitem')
    .filter({ hasText: 'Repuestos Andinos' })
    .getByRole('button', { name: /^Más acciones de / })
    .click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar compra' })
  await expect(edicion.getByText('Registrada')).toBeVisible()
  await expect(edicion.getByRole('group', { name: 'Comprobante de la compra' })).toContainText(
    'Comprobante.pdf',
  )
})
