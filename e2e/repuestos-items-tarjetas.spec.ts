import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { capturar } from './soporte/recorrido'
import {
  abrirItem,
  accionDelItem,
  agregarItems,
  filaDelItem,
  tarjetaDe,
} from './soporte/repuestos-tarjetas'
import { literal, sql } from './soporte/sql'

// Los ítems de `/repuestos/[id]` como tarjetas (`docs/UX.md` › «Repuestos: proyecto (estados propios)»): el buscador y las fichas filtran en el navegador con «N de M ítems»; un clic en la tarjeta abre el drawer de
// abajo (`?item=`) con la fila del ítem como Excel, editable celda a celda con el teclado, y sus secciones; Esc lo cierra y el foco vuelve a la tarjeta; «Agregar ítem» abre otro con la fila
// nueva (Enter crea y deja otra); el «⋯» lleva a Imágenes y Eliminar; el asa cambia el alto en escritorio. Todo se siembra por SQL; cada proyecto de Playwright usa los suyos.
test.describe.configure({ mode: 'serial' })

const BOMBA = 'Bomba de agua delantera'
const FARO = 'Faro izquierdo'
const PARAGOLPES = 'Paragolpes'
const TAPA = 'Tapa del tanque'
const TIPO_UNO = 'Prueba tarjetas bomba'

let duena = ''
let etiqueta = ''
let proyecto = ''
const ids: Record<string, string> = {}

function limpiar() {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
  sql(
    `delete from repuestos_catalogos where catalogo = 'tipo_pieza' and nombre = ${literal(TIPO_UNO)}`,
  )
}

const tipoNuevo = (nombre: string) =>
  sql(
    `insert into repuestos_catalogos (catalogo, nombre) values ('tipo_pieza', ${literal(nombre)}) returning id`,
  )
    .trim()
    .split('\n')[0] as string

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba tarjetas ${nombre}`
  limpiar()
  const uno = tipoNuevo(TIPO_UNO)
  proyecto = sql(
    `insert into repuestos_proyectos (vehiculo_etiqueta) values (${literal(etiqueta)}) returning id`,
  )
    .trim()
    .split('\n')[0] as string
  // Cuatro ítems; la hoja ordena por `creado_en`, así que cada uno nace un instante después del anterior.
  const item = (descripcion: string, extra: Record<string, string>) =>
    sql(
      `insert into repuestos_items (proyecto_id, descripcion, creado_en, ${Object.keys(extra).join(', ')})
       values ('${proyecto}', ${literal(descripcion)}, clock_timestamp(), ${Object.values(extra).join(', ')})
       returning id`,
    )
      .trim()
      .split('\n')[0] as string
  ids[BOMBA] = item(BOMBA, {
    tipo_pieza_id: `'${uno}'`,
    precio_cliente: '50',
    moneda: `'USD'`,
    tracking: `'TRK-AAA111'`,
  })
  ids[FARO] = item(FARO, { tracking: `'TRK-BBB222'` })
  ids[PARAGOLPES] = item(PARAGOLPES, { tipo_pieza_id: `'${uno}'` })
  ids[TAPA] = item(TAPA, { precio_cliente: '10', moneda: `'USD'`, notas: `'urgente'` })
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tarjetas-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tania Tarjetas' })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

test('el buscador y las fichas filtran los ítems en el navegador, con «N de M ítems» y «Limpiar filtros»', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await expect(page.locator('[data-tarjeta-de-item]')).toHaveCount(4)
  await expect(page.getByRole('status')).toHaveCount(0)

  // Por el tracking.
  await page.getByRole('searchbox', { name: 'Buscar ítems' }).fill('BBB222')
  await expect(page.getByRole('status')).toHaveText('1 de 4 ítems')
  await expect(tarjetaDe(page, FARO)).toBeVisible()
  await expect(tarjetaDe(page, TAPA)).toHaveCount(0)
  await capturar(page, info, 'buscando')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)

  // Una ficha y «Sin precio» se suman; «Limpiar filtros» los suelta.
  await page.getByLabel('Tipo de pieza', { exact: true }).selectOption({ label: TIPO_UNO })
  await expect(page.getByRole('status')).toHaveText('2 de 4 ítems')
  await page.getByRole('button', { name: 'Sin precio', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('1 de 4 ítems')
  await expect(page.getByRole('button', { name: 'Sin precio', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page).toHaveURL(/sin_precio=1/)
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).not.toHaveURL(/sin_precio/)

  // Sin coincidencias: el vacío por filtro con su salida.
  await page.getByRole('searchbox', { name: 'Buscar ítems' }).fill('zzzzzz')
  await expect(page.getByText('Ningún ítem coincide con la búsqueda o los filtros.')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
  await expect(tarjetaDe(page, TAPA)).toBeVisible()
})

test('un clic en la tarjeta abre el drawer con la fila del ítem, se edita celda a celda y Esc devuelve el foco', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const drawer = await abrirItem(page, TAPA)
  await expect(page).toHaveURL(new RegExp(`[?&]item=${ids[TAPA] ?? ''}`))
  for (const columna of [
    'Ítem',
    'Cantidad',
    'Precio al cliente',
    'País de origen',
    'Vía de transporte',
    'Moneda',
    'Tracking',
    'Notas',
  ]) {
    await expect(drawer.getByRole('columnheader', { name: columna, exact: true })).toBeVisible()
  }
  await expect(drawer.locator('[data-bloque-del-hueco]').first()).toHaveAttribute(
    'data-bloque-del-hueco',
    'que-falta',
  )
  await capturar(page, info, 'drawer-del-item')

  // Tracking: se tipea y Enter guarda; la flecha derecha al final pasa a Notas y Tab sigue.
  const tracking = filaDelItem(drawer).getByLabel(`Tracking del ítem ${TAPA}`)
  await tracking.fill('TRK-CCC333')
  await tracking.press('Enter')
  await expect
    .poll(() => sql(`select tracking from repuestos_items where id = '${ids[TAPA] ?? ''}'`).trim())
    .toBe('TRK-CCC333')
  await tracking.press('End')
  await tracking.press('ArrowRight')
  await expect(filaDelItem(drawer).getByLabel(`Notas del ítem ${TAPA}`)).toBeFocused()
  // Notas ya trae texto: ← sólo sale de la celda con el cursor al inicio.
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowLeft')
  await expect(tracking).toBeFocused()

  // Recargar con el drawer abierto: el cambio sigue.
  await page.reload()
  await expect(
    filaDelItem(page.getByRole('dialog', { name: TAPA, exact: true })).getByLabel(
      `Tracking del ítem ${TAPA}`,
    ),
  ).toHaveValue('TRK-CCC333')

  // Esc cierra y el foco vuelve a la tarjeta.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: TAPA, exact: true })).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]item=/)
  await expect(page.getByRole('button', { name: `Abrir ${TAPA}`, exact: true })).toBeFocused()
})

test('«Agregar ítem» crea cada ítem con Enter y deja otra fila nueva; las tarjetas quedan en la hoja', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await agregarItems(page, ['Espejo derecho', 'Luz trasera'])
  await expect(page).not.toHaveURL(/panel=nuevo-item/)
  await expect(tarjetaDe(page, 'Espejo derecho')).toBeVisible()
  await expect(tarjetaDe(page, 'Luz trasera')).toBeVisible()
  expect(
    sql(
      `select count(*) from repuestos_items where proyecto_id = '${proyecto}' and descripcion in ('Espejo derecho', 'Luz trasera')`,
    ).trim(),
  ).toBe('2')
})

test('el «⋯» de la tarjeta abre las imágenes y la confirmación de eliminar', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await accionDelItem(page, 'Luz trasera', 'Imágenes')
  await expect(page).toHaveURL(new RegExp(`panel=imagenes&item=|item=.*panel=imagenes`))
  await expect(page.getByRole('dialog', { name: 'Imágenes de «Luz trasera»' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Imágenes de «Luz trasera»' })).toBeHidden()

  await accionDelItem(page, 'Luz trasera', 'Eliminar')
  const confirmar = page.getByRole('dialog', { name: 'Eliminar el ítem «Luz trasera»' })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar' }).click()
  await expect(tarjetaDe(page, 'Luz trasera')).toHaveCount(0)
})

// @sin-celular: el asa para agrandar el drawer sólo existe desde 768 px; en el celular el drawer ocupa la pantalla completa y no tiene asa.
test('en escritorio el asa agranda el drawer con las flechas', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const drawer = await abrirItem(page, TAPA)
  const asa = drawer.getByRole('separator', { name: 'Cambiar el alto del panel' })
  await expect(asa).toBeVisible()
  const antes = Number(await asa.getAttribute('aria-valuenow'))
  await asa.focus()
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(async () => Number(await asa.getAttribute('aria-valuenow')))
    .toBeGreaterThan(antes)
})
