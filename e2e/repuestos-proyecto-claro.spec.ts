import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { borrarFotosDe } from './soporte/fotos'
import { capturar } from './soporte/recorrido'
import { abrirItem } from './soporte/repuestos-tarjetas'
import { literal, sql } from './soporte/sql'
import { sembrarFotos } from './soporte/vehiculos-lista'

// El detalle claro de un proyecto de repuestos (`docs/UX.md` › `/repuestos/[id]`): la cabecera dice de qué vehículo es (miniatura de la portada, título enlazado a su
// ficha, VIN y lote, origen y situación) o «Proyecto externo · sin vehículo»; los ítems salen agrupados por paso, en el orden del flujo, con su conteo y «Sin fase» al
// final; la primera columna dice qué es cada ítem, y su siguiente lo mueve de grupo. Todo se siembra por SQL; los nombres de fases, catálogos y orígenes se leen de
// la base. La etiqueta del externo no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas (D12). Cada proyecto de Playwright usa los suyos.
test.describe.configure({ mode: 'serial' })

const A = 'Bomba de agua delantera'
const B = 'Faro izquierdo'
const C = 'Paragolpes'
const D = 'Tapa del tanque'
const VIN = '1HGCM82633A004352'
const TIPO = 'Prueba claro bomba'

let duena = ''
let titulo = ''
let etiqueta = ''
let lote = ''
let vehiculo = ''
let proyecto = ''
let externo = ''
const ids: Record<string, string> = {}
// Las dos primeras fases activas del flujo de repuestos, en su orden.
let primera = { id: '', nombre: '' }
let posterior = { id: '', nombre: '' }
let tipo = { id: '', nombre: '' }
let condicion = { id: '', nombre: '' }
let origen = ''
let faseDelVehiculo = ''

const una = (consulta: string) => {
  const [id = '', nombre = ''] = sql(consulta).trim().split('|')
  return { id, nombre }
}

function limpiar() {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
  if (titulo !== '') {
    sql(
      `delete from repuestos_proyectos where vehiculo_id in (select id from vehiculos where titulo = ${literal(titulo)})`,
    )
    sql(`delete from vehiculos where titulo = ${literal(titulo)}`)
  }
}

const grupos = (page: Page) => page.locator('[data-grupo-de-paso]').filter({ visible: true })
const grupo = (page: Page, clave: string) =>
  page.locator(`[data-grupo-de-paso="${clave}"]`).filter({ visible: true })
const encabezado = (page: Page, clave: string) =>
  grupo(page, clave).locator('th[scope="rowgroup"], h2')
const fila = (page: Page, nombre: string) =>
  page.locator(`[data-tarjeta-de-item="${ids[nombre] ?? ''}"]`).filter({ visible: true })

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  titulo = `Prueba claro Toyota Hilux ${nombre}`
  etiqueta = `Prueba claro externo ${nombre}`
  lote = nombre === 'movil' ? '77002' : '77001'
  limpiar()
  primera = una(
    `select f.id, f.nombre from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.activa order by f.orden, f.id limit 1`,
  )
  posterior = una(
    `select f.id, f.nombre from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.activa order by f.orden, f.id offset 1 limit 1`,
  )
  // La semilla no trae tipos de pieza: el spec siembra el suyo y lo borra al terminar.
  sql(`delete from repuestos_catalogos where catalogo = 'tipo_pieza' and nombre = ${literal(TIPO)}`)
  tipo = una(
    `insert into repuestos_catalogos (catalogo, nombre) values ('tipo_pieza', ${literal(TIPO)}) returning id, nombre`,
  )
  condicion = una(
    `select id, nombre from repuestos_catalogos where catalogo = 'condicion' and activo order by orden, id limit 1`,
  )
  origen = sql(`select nombre from origenes where clave = 'subasta_usa'`).trim()
  const faseVehiculo = una(
    `select f.id, f.nombre from fases f join flujos fl on fl.id = f.flujo_id
     where fl.ambito = 'vehiculos' and fl.origen_id = (select id from origenes where clave = 'subasta_usa') and f.activa
     order by f.orden, f.id limit 1`,
  )
  faseDelVehiculo = faseVehiculo.nombre
  vehiculo = sql(
    `insert into vehiculos (origen_id, titulo, vin, lote, fase_id, fase_desde)
     values ((select id from origenes where clave = 'subasta_usa'), ${literal(titulo)}, ${literal(VIN)}, ${literal(lote)}, '${faseVehiculo.id}', now())
     returning id`,
  )
    .trim()
    .split('\n')[0] as string
  await sembrarFotos(vehiculo, 1)
  proyecto = sql(
    `insert into repuestos_proyectos (vehiculo_id) values ('${vehiculo}') returning id`,
  )
    .trim()
    .split('\n')[0] as string
  externo = sql(
    `insert into repuestos_proyectos (vehiculo_etiqueta, vin) values (${literal(etiqueta)}, ${literal(VIN)}) returning id`,
  )
    .trim()
    .split('\n')[0] as string
  // Dos en la primera fase (A con tipo y condición; B con precio, para que su siguiente sea mover), uno en una posterior y uno sin fase. La segunda fila nace un
  // instante después: la hoja ordena por `creado_en`.
  const item = (descripcion: string, fase: string | null, extra = '') =>
    sql(
      `insert into repuestos_items (proyecto_id, descripcion, fase_id, fase_desde, creado_en${extra === '' ? '' : ', tipo_pieza_id, condicion_id'})
       values ('${proyecto}', ${literal(descripcion)}, ${fase === null ? 'null' : `'${fase}'`}, ${fase === null ? 'null' : 'now()'},
               clock_timestamp()${extra})
       returning id`,
    )
      .trim()
      .split('\n')[0] as string
  ids[A] = item(A, primera.id, `, '${tipo.id}', '${condicion.id}'`)
  ids[B] = item(B, primera.id)
  ids[C] = item(C, posterior.id)
  ids[D] = item(D, null)
  sql(`update repuestos_items set precio_cliente = 50, moneda = 'USD' where id = '${ids[B] ?? ''}'`)
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-claro-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Clara Claro' })
})

test.afterAll(async () => {
  if (vehiculo !== '') await borrarFotosDe([vehiculo])
  limpiar()
  sql(`delete from repuestos_catalogos where catalogo = 'tipo_pieza' and nombre = ${literal(TIPO)}`)
  await borrarPersonasDePrueba()
})

test('la cabecera dice de qué vehículo es: miniatura, título enlazado, VIN y lote, origen y situación', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const bloque = page
    .getByRole('region', { name: 'Vehículo' })
    .locator('[data-vehiculo-del-proyecto]')
  await expect(bloque.locator('img')).toHaveAttribute('src', new RegExp(`/vehiculos/${vehiculo}/`))
  await expect(bloque.getByRole('link', { name: titulo })).toHaveAttribute(
    'href',
    `/vehiculos/${vehiculo}`,
  )
  await expect(bloque).toContainText(`VIN ${VIN} · Lote ${lote}`)
  await expect(bloque).toContainText(origen)
  await expect(bloque).toContainText(faseDelVehiculo)
  await capturar(page, info, 'cabecera')
})

test('los ítems salen agrupados por paso, en el orden del flujo, con su conteo y «Sin fase» al final', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await expect(encabezado(page, primera.id)).toHaveText(`${primera.nombre} · 2`)
  const orden = await grupos(page).evaluateAll((g) =>
    g.map((e) => e.getAttribute('data-grupo-de-paso')),
  )
  expect(orden).toEqual([primera.id, posterior.id, 'sin_fase'])
  await expect(encabezado(page, posterior.id)).toHaveText(`${posterior.nombre} · 1`)
  await expect(encabezado(page, 'sin_fase')).toHaveText('Sin fase · 1')
  await expect(
    grupo(page, primera.id).locator(`[data-tarjeta-de-item="${ids[A] ?? ''}"]`),
  ).toBeVisible()
  await expect(
    grupo(page, 'sin_fase').locator(`[data-tarjeta-de-item="${ids[D] ?? ''}"]`),
  ).toBeVisible()
  // La tarjeta dice «Tipo · Condición» y la descripción; el tipo y la condición se editan en la fila del ítem, en su drawer.
  await expect(fila(page, A)).toContainText(`${tipo.nombre} · ${condicion.nombre}`)
  const drawer = await abrirItem(page, A, `${tipo.nombre} · ${condicion.nombre}`)
  await expect(drawer.getByRole('region', { name: 'Qué es' })).toContainText(
    `${tipo.nombre} · ${condicion.nombre}`,
  )
  await drawer.getByRole('button', { name: 'Editar Qué es' }).click()
  const modal = page.getByRole('dialog', { name: 'Qué es' })
  await expect(modal.getByLabel(`Tipo de pieza del ítem ${A}`)).toHaveValue(tipo.id)
  await expect(modal.getByLabel(`Condición del ítem ${A}`)).toHaveValue(condicion.id)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await capturar(page, info, 'hoja-por-paso')
})

test('el siguiente de un ítem lo mueve de grupo y los conteos quedan al día', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const boton = fila(page, B).locator(`[data-siguiente-item="${ids[B] ?? ''}"]`)
  const nombre = (await boton.getAttribute('aria-label')) ?? ''
  const accion = nombre.split(' · ')[0] ?? ''
  expect(nombre).toBe(`${accion} · ${B}`)
  await boton.click()
  const panel = page.getByRole('dialog', { name: B, exact: true })
  await expect(page).toHaveURL(/[?&]destino=[0-9a-f-]{36}/)
  const destino = new URL(page.url()).searchParams.get('destino') ?? ''
  await panel.getByRole('button', { name: accion, exact: true }).click()
  await expect(page.getByText(new RegExp(`^${B} pasó a «`))).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(
    grupo(page, destino).locator(`[data-tarjeta-de-item="${ids[B] ?? ''}"]`),
  ).toBeVisible()
  await expect(encabezado(page, primera.id)).toHaveText(`${primera.nombre} · 1`)
})

test('con el proyecto cerrado, la tarjeta y la fila del ítem dicen «Tipo · Condición» y la descripción, sin celdas', async ({
  page,
}) => {
  sql(`update repuestos_proyectos set cerrado_en = now() where id = '${proyecto}'`)
  try {
    await entrar(page, duena, { fresco: true })
    await page.goto(`/repuestos/${proyecto}`)
    await expect(fila(page, A)).toContainText(`${tipo.nombre} · ${condicion.nombre}`)
    await expect(fila(page, A)).toContainText(A)
    const drawer = await abrirItem(page, A, `${tipo.nombre} · ${condicion.nombre}`)
    await expect(drawer.getByLabel(`Tipo de pieza del ítem ${A}`)).toHaveCount(0)
    await expect(drawer.getByRole('region', { name: 'Qué es' })).toContainText(
      `${tipo.nombre} · ${condicion.nombre}`,
    )
  } finally {
    sql(`update repuestos_proyectos set cerrado_en = null where id = '${proyecto}'`)
  }
})

test('un vehículo en la papelera se dice «Vehículo que no puedes ver», sin miniatura', async ({
  page,
}) => {
  sql(`update vehiculos set eliminado_en = now() where id = '${vehiculo}'`)
  try {
    await entrar(page, duena, { fresco: true })
    await page.goto(`/repuestos/${proyecto}`)
    const region = page.getByRole('region', { name: 'Vehículo' })
    await expect(region).toHaveText('Vehículo que no puedes ver')
    await expect(region.locator('img')).toHaveCount(0)
    await expect(fila(page, A)).toBeVisible()
  } finally {
    sql(`update vehiculos set eliminado_en = null where id = '${vehiculo}'`)
  }
})

test('un proyecto externo dice «Proyecto externo · sin vehículo», con la etiqueta y el VIN', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${externo}`)
  const region = page.getByRole('region', { name: 'Vehículo' })
  await expect(region).toContainText('Proyecto externo · sin vehículo')
  await expect(region).toContainText(etiqueta)
  await expect(region).toContainText(`VIN ${VIN}`)
  await expect(page.getByText('Este proyecto todavía no tiene ítems.')).toBeVisible()
  await capturar(page, info, 'externo')
})
