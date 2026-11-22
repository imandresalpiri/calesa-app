// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio (e2e.md, 2026-11-08).
import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  definicionYParamsComoLaPublicada,
  leerElBorradorDelDiseno,
  publicarFormulaDeTresSumandos,
} from './soporte/diseno-editor'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// La pestaña «Hoja» de un origen (4.22-2, `docs/UX.md` › «Cotización: hoja (estados propios)»): el camino feliz en escritorio, sobre el editor de la hoja (el lienzo y
// el inspector). Se ven las secciones y las celdas; elegir una celda y ponerle el nivel «Costos» avisa que se deduce restando (sin bloquear) y alinea quién la edita;
// una sección pasa a «Avanzado»; «Guardar el borrador» crea el borrador con la definición y los `params` de la publicada tal cual; recargar vuelve a mostrar lo guardado.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-diseno-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Diseño' })
  origen = await crearOrigenDeCotizar(proyecto, 'ddiseno', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// En el lienzo: el botón «Elegir …» de cada pieza (`data-elegir`, el valor de `?pieza=`) y la sección (`section[data-seccion]`); a la derecha, el inspector.
const elegir = (page: Page, pieza: string) => page.locator(`[data-elegir="${pieza}"]`)
const seccion = (page: Page, id: string) =>
  page.locator(`[data-lienzo-de-la-hoja] section[data-seccion="${id}"]`)
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')

async function abrirElDiseno(page: Page) {
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  await expect(seccion(page, 'base')).toBeVisible()
}

test('D1: se ve la hoja; «Costos» en una celda avisa sin bloquear; se guarda el borrador y lo guardado vuelve', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiseno(page)
  await expect(seccion(page, 'base')).toHaveAccessibleName('Base')
  await expect(elegir(page, 'flete')).toBeVisible()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
  await expect(guardar(page)).toBeDisabled()

  // El total lo ve todo el mundo: su «Quién la ve» va apagado.
  await elegir(page, 'total').click()
  await expect(page).toHaveURL(/pieza=total/)
  await expect(inspector(page).getByLabel('Quién la ve')).toBeDisabled()

  await elegir(page, 'flete').click()
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'flete')
  await inspector(page).getByLabel('Quién la ve').selectOption('costos')
  await expect(page.locator('[data-avisos-del-diseno]')).toContainText(
    'puede deducir «Flete» restando',
  )
  await expect(inspector(page).getByLabel('Quién la edita')).toHaveValue('costos')
  // Una sección se elige por su título: el centro cae sobre sus piezas.
  await elegir(page, 'seccion-extras').click({ position: { x: 24, y: 6 } })
  await inspector(page).getByLabel('Dónde va').selectOption('avanzado')
  await expect(guardar(page)).toBeEnabled()

  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const borrador = leerElBorradorDelDiseno(origen.id)
  expect(borrador).not.toBeNull()
  const secciones = borrador!.diseno.secciones
  const flete = secciones.find((s) => s.id === 'base')?.items.find((i) => i.nodo === 'flete')
  expect(flete).toMatchObject({ nivel_ver: 'costos', nivel_editar: 'costos' })
  expect(secciones.find((s) => s.id === 'extras')?.presentacion).toBe('avanzado')
  expect(definicionYParamsComoLaPublicada(origen.id)).toBe(true)

  // Recargar con `?pieza=` conserva la pieza elegida y trae lo guardado.
  await page.reload()
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'seccion-extras')
  await expect(inspector(page).getByLabel('Dónde va')).toHaveValue('avanzado')
  await elegir(page, 'flete').click()
  await expect(inspector(page).getByLabel('Quién la ve')).toHaveValue('costos')
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})
