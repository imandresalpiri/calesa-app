import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { agregarItems, tarjetaDe } from './soporte/repuestos-tarjetas'
import { literal, sql } from './soporte/sql'

// El proyecto de repuestos de un vehículo desde su ficha y eliminar un proyecto vacío. Sin proyecto, `?seccion=repuestos` (el enlace viejo) se queda en la ficha; el
// panel «Nuevo proyecto» con el vehículo lo crea ya vinculado, y después la cabecera de la ficha dice «Repuestos · Proyecto #N» y `?seccion=repuestos` redirige al
// proyecto. Un proyecto sin ítems se elimina de una vez y «Deshacer» lo devuelve; con un ítem ya no se ofrece. El spec limpia lo que crea (los proyectos de su
// vehículo y los de etiqueta «E2E…»).
test.describe.configure({ mode: 'serial' })

const TITULO = 'E2E Repuestos ficha del vehículo'
const ETIQUETA = 'E2E Eliminar proyecto vacío'
const ITEM = 'Luneta trasera'

let duena = ''
let vehiculoId = ''

function limpiar() {
  sql(`delete from repuestos_proyectos where vehiculo_etiqueta like 'E2E%'`)
  sql(
    `delete from repuestos_proyectos where vehiculo_id in (select id from vehiculos where titulo like 'E2E Repuestos ficha%')`,
  )
  sql(`delete from vehiculos where titulo like 'E2E Repuestos ficha%'`)
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ficha-repuestos-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Ficha' })
  limpiar()
  sql(
    `insert into public.vehiculos (origen_id, titulo) values ((select id from public.origenes where clave = 'subasta_usa'), ${literal(TITULO)})`,
  )
  vehiculoId = sql(`select id from public.vehiculos where titulo = ${literal(TITULO)}`)
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('el proyecto de un vehículo: sin él la ficha se queda; con él, la cabecera lo enlaza y `?seccion=repuestos` redirige', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculoId}?seccion=repuestos`)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${vehiculoId}\\?seccion=repuestos$`))
  await expect(page.getByRole('link', { name: /^Repuestos · Proyecto #\d+$/ })).toHaveCount(0)

  await page.goto(`/repuestos?panel=nuevo-proyecto&vehiculo=${vehiculoId}`)
  const dialogo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await expect(dialogo.getByText(TITULO)).toBeVisible()
  await dialogo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  const proyecto = new URL(page.url()).pathname
  await expect(page.getByRole('link', { name: TITULO })).toBeVisible()

  await page.goto(`/vehiculos/${vehiculoId}`)
  await expect(page.getByRole('link', { name: /^Repuestos · Proyecto #\d+$/ })).toHaveAttribute(
    'href',
    proyecto,
  )
  await page.goto(`/vehiculos/${vehiculoId}?seccion=repuestos`)
  await expect(page).toHaveURL(new RegExp(`${proyecto}$`))
})

test('un proyecto sin ítems se elimina de una vez, «Deshacer» lo devuelve y con un ítem ya no se ofrece', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const dialogo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await dialogo.getByLabel('Vehículo', { exact: true }).fill(ETIQUETA)
  await dialogo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  const detalle = page.url()

  await page.getByRole('button', { name: 'Eliminar proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos$/)
  await expect(page.getByText(/^Proyecto #\d+ eliminado\.$/)).toBeVisible()
  // Una pantalla conserva su estado al volver: el listado de antes puede seguir en el DOM, oculto; lo que cuenta es que no se ve.
  await expect(page.getByText(ETIQUETA)).toBeHidden()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page).toHaveURL(detalle)
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()

  // Con un ítem, la base no lo dejaría: la cabecera ni lo ofrece.
  await agregarItems(page, [ITEM])
  await page.reload()
  await expect(tarjetaDe(page, ITEM)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eliminar proyecto' })).toHaveCount(0)
})
