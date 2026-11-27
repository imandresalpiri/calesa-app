import type { Locator } from '@playwright/test'
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
import { abrirItem, agregarItems } from './soporte/repuestos-tarjetas'
import { sql } from './soporte/sql'

// El panel de un ítem (`?item=<id>`) en dos columnas (`docs/UX.md` › «Panel del ítem»): a la izquierda lo del ítem en el orden en que se usa (Qué es, Estado con lo que falta, Cantidades y precios,
// Origen y envío, Proveedor y Notas del ítem), cada grupo como texto que se edita en su modal; a la derecha, sus tarjetas con alto fijo (Imágenes, Stock, Compras, Documentos, Historial, Notas y
// Vehículo y cliente), cada una con su «⋯» y su drawer; las de logística (Documentos, Historial, Notas) son la tarjeta de la unidad, con su drawer en `?seccion=`. Sin acordeones ni secciones dentro de secciones, y nada salta al guardar. Quien sólo tiene `repuestos.ver` lo lee, con mover apagado.
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas (D12). Cada proyecto de Playwright usa la suya.
test.describe.configure({ mode: 'serial' })

const REPUESTO = 'Radiador grande'
const GRUPOS_DE_LA_IZQUIERDA = [
  'Qué es',
  'Estado',
  'Cantidades y precios',
  'Origen y envío',
  'Proveedor',
  'Notas del ítem',
]
const TARJETAS_DE_LA_DERECHA = [
  'Imágenes',
  'Stock',
  'Compras',
  'Documentos',
  'Historial',
  'Notas',
  'Vehículo y cliente',
]
// El tamaño de una caja (el panel se desplaza al enfocar un campo: su posición no cuenta).
async function tamano(caja: Locator) {
  const medida = await caja.boundingBox()
  return medida === null ? null : { ancho: medida.width, alto: medida.height }
}
let etiqueta = ''
let duena = ''
let lectora = ''
let proyecto = ''
let item = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = '${etiqueta}'`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba item dos columnas e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-item-columnas-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Columnas' })
  lectora = correoDePrueba(`lectora-item-columnas-${nombre}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Columnas',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos columnas ${nombre}`,
      clave: `e2e_ve_repuestos_columnas_${nombre}`,
    },
    permisos: ['repuestos.ver'],
  })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña lee el ítem en el orden en que lo usa y sin acordeones', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''
  await agregarItems(page, [REPUESTO])
  item = sql(`select id from repuestos_items where proyecto_id = '${proyecto}'`).trim()
  sql(
    `update repuestos_items set cantidad = 2, precio_cliente = 150, moneda = 'USD', notas = 'Pedir con soportes' where id = '${item}'`,
  )
  await page.reload()

  const panel = await abrirItem(page, REPUESTO)
  // Las tarjetas del ítem y las de logística (la tarjeta de la unidad: `[data-tarjeta]` con su `h3`), en el orden del panel.
  const titulos = panel.locator(
    ':is([data-slot="tarjeta-de-ajustes"] > header h2, [data-tarjeta] > h3)',
  )
  await expect(titulos).toHaveText([...GRUPOS_DE_LA_IZQUIERDA, ...TARJETAS_DE_LA_DERECHA])

  // Un solo nivel de secciones: nada plegable ni una tarjeta dentro de otra.
  await expect(panel.locator('details')).toHaveCount(0)
  await expect(
    panel.locator('[data-slot="tarjeta-de-ajustes"] [data-slot="tarjeta-de-ajustes"]'),
  ).toHaveCount(0)

  // Cada grupo se lee como texto: lo guardado ya está a la vista, sin abrir nada.
  const izquierda = panel.locator('[data-columna-del-item]')
  await expect(izquierda).toContainText('Pedir con soportes')
  await expect(izquierda.getByText('Cantidad', { exact: true })).toBeVisible()
  await expect(panel.getByText('Proyecto externo · ' + etiqueta)).toBeVisible()
  // «Qué falta» está en el estado y es lo primero que hay para hacer: el bloque existe una sola vez.
  await expect(panel.locator('[data-bloque-del-hueco="que-falta"]')).toHaveCount(1)
})

test('un grupo se edita en su modal, guarda al salir del campo y la tarjeta no cambia de alto', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${item}`)
  const panel = page.getByRole('dialog', { name: REPUESTO, exact: true })
  const grupo = panel.getByRole('region', { name: 'Cantidades y precios' })
  await expect(grupo).toBeVisible()
  const antes = await tamano(grupo)

  await grupo.getByRole('button', { name: 'Editar Cantidades y precios' }).click()
  await expect(page).toHaveURL(/[?&]editar=cantidades/)
  const modal = page.getByRole('dialog', { name: 'Cantidades y precios' })
  await expect(modal).toBeVisible()
  // El panel del ítem sigue debajo: el modal no lo cerró.
  await expect(page).toHaveURL(new RegExp(`[?&]item=${item}`))
  const cantidad = modal.getByRole('group', { name: 'Cantidad', exact: true })
  await cantidad.locator('[data-parada="0"]').focus()
  await page.keyboard.type('5')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => sql(`select cantidad from repuestos_items where id = '${item}'`).trim())
    .toBe('5')
  await modal.getByRole('button', { name: 'Listo' }).click()
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]editar=/)
  await expect(grupo).toContainText('5')
  expect(await tamano(grupo), 'la tarjeta no cambió de tamaño al guardar').toEqual(antes)
})

test('una tarjeta de la derecha abre su drawer y su «⋯» pone la acción principal primero', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${item}`)
  const panel = page.getByRole('dialog', { name: REPUESTO, exact: true })
  const notas = panel.getByRole('region', { name: 'Notas', exact: true })
  const alto = (await notas.boundingBox())?.height

  // El «⋯» lista la acción principal primero.
  await notas.getByRole('button', { name: 'Más acciones de Notas' }).click()
  await expect(page.getByRole('menuitem').first()).toHaveText('Ver las notas')
  await page.keyboard.press('Escape')

  // Tocar la tarjeta abre su drawer sin soltar el panel (`?seccion=`, no `?panel=`).
  await notas.getByRole('button', { name: 'Ver las notas' }).click()
  await expect(page).toHaveURL(/[?&]seccion=notas/)
  await expect(page).toHaveURL(new RegExp(`[?&]item=${item}`))
  const drawer = page.getByRole('dialog', { name: 'Notas', exact: true })
  await expect(drawer).toBeVisible()
  const nota = page.locator('[data-hueco="notas"]')
  await nota.getByLabel('Escribir una nota').fill('Llega con el flete')
  await nota.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(nota.locator('[data-nota]').filter({ hasText: 'Llega con el flete' })).toBeVisible()
  expect(
    sql(
      `select count(*) from notas where repuesto_id = '${item}' and cuerpo = 'Llega con el flete'`,
    ).trim(),
  ).toBe('1')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]seccion=/)
  expect((await notas.boundingBox())?.height, 'la tarjeta de notas mantiene su alto').toBe(alto)
})

test('«Qué falta» está en el estado: se elige «Comprado» y el ítem pasa', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${item}`)
  const panel = page.getByRole('dialog', { name: REPUESTO, exact: true })
  const estado = panel.getByRole('region', { name: 'Estado' })
  await expect(estado.getByText('Por cotizar', { exact: true })).toBeVisible()
  await estado.getByRole('button', { name: 'Elegir el destino «Comprado»' }).click()
  await estado.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page.getByText(`${REPUESTO} pasó a «Comprado».`)).toBeVisible()
  await expect(estado.getByText('Comprado').first()).toBeVisible()
  expect(
    sql(
      `select f.nombre from repuestos_items i join fases f on f.id = i.fase_id where i.id = '${item}'`,
    ).trim(),
  ).toBe('Comprado')
})

test('con sólo repuestos.ver el panel se lee: sin «Editar», mover apagado con su motivo', async ({
  page,
}) => {
  const porCotizar = `(select f.id from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.es_inicial limit 1)`
  sql(`update repuestos_items set fase_id = ${porCotizar}, fase_desde = now() where id = '${item}'`)
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${item}`)
  const panel = page.getByRole('dialog', { name: REPUESTO, exact: true })
  await expect(panel.getByRole('region', { name: 'Cantidades y precios' })).toBeVisible()
  await expect(panel.getByRole('button', { name: /^Editar / })).toHaveCount(0)
  // Sin `repuestos.costos.ver` no hay Compras ni Proveedor.
  await expect(panel.getByRole('region', { name: 'Compras' })).toHaveCount(0)
  await expect(panel.getByRole('region', { name: 'Proveedor' })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Elegir el destino «Comprado»' })).toBeDisabled()
  await expect(panel.getByText('No tienes permiso para mover repuestos.')).toBeVisible()
})
