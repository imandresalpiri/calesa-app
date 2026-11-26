import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  concesionesDelRol,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  filaDeNivel,
  masAccionesDe,
  sembrarNivel,
} from './soporte/niveles'
import { literal, sql } from './soporte/sql'

// Los niveles de acceso y «Quién crea y quién ve» dentro de la matriz de Roles, en el bloque «Cotizaciones» (T511): el bloque a la vista por
// `?bloque=cotizaciones`, su modal (`?panel=quien-crea-y-quien-ve`) que escribe con las mismas actions de la matriz, y las tres URLs de Catálogos que ahora responden 308.
// Crear, renombrar, retirar y eliminar un nivel, el tope y la vista de sólo lectura: `configuracion-cotizacion-niveles*.spec.ts`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
let rol = ''
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`
const ORIGEN = "(select id from public.origenes where clave = 'subasta_usa')"

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-niveles-en-la-matriz-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Matriz' })
  rol = `${PREFIJO_ROL_E2E}Quién crea ${proyecto}`
  sql(
    `insert into public.roles (nombre, clave) values (${literal(rol)}, ${literal(`e2e_quien_crea_${proyecto}`)})`,
  )
  sembrarNivel(nombre('Gerencia'))
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('los niveles viven dentro de «Cotizaciones»: el bloque queda a la vista, «Todos» va primero y cada nivel trae su «⋯»', async ({
  page,
}) => {
  const gerencia = nombre('Gerencia')
  await entrar(page, duena)
  await abrirNiveles(page)
  await expect(page.locator('#bloque-cotizaciones')).toBeInViewport()
  const todos = page.locator('[data-nivel-fijo]').first()
  await expect(todos).toContainText('Todos')
  await expect(filaDeNivel(page, gerencia)).toBeVisible()
  await expect(masAccionesDe(page, gerencia)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo nivel' })).toBeEnabled()
  // «Todos» no tiene «⋯»: no se cambia.
  await expect(masAccionesDe(page, 'Todos')).toHaveCount(0)
})

test('«Quién crea y quién ve» se abre en un modal con su URL y escribe con las actions de la matriz', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirNiveles(page)
  const boton = page.getByRole('button', { name: 'Ver quién crea y quién ve', exact: true })
  await expect(page.getByRole('dialog', { name: 'Quién crea y quién ve' })).toHaveCount(0)
  await boton.click()
  await expect(page).toHaveURL(/panel=quien-crea-y-quien-ve/)
  await expect(page.getByRole('dialog', { name: 'Quién crea y quién ve' })).toBeVisible()
  const crea = page.getByRole('switch', { name: `Crea: ${rol}`, exact: true })
  await expect(crea).not.toBeChecked()
  await crea.click()
  await expect(crea).toBeChecked()
  await expect
    .poll(async () => (await concesionesDelRol(rol)).map((c) => c.permiso_clave))
    .toContain('cotizaciones.crear')
})

test('Roles con el panel de «Quién crea y quién ve» y un origen lo abre en ese origen', async ({
  page,
}) => {
  const origen = sql(`select ${ORIGEN}`)
  await entrar(page, duena)
  await page.goto(
    `/configuracion/roles?bloque=cotizaciones&panel=quien-crea-y-quien-ve&origen=${origen}`,
  )
  await expect(page.getByRole('dialog', { name: 'Quién crea y quién ve' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Origen', exact: true })).toHaveValue(origen)
})
