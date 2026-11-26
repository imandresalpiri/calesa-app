// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve la hoja en sólo lectura con su aviso.
import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana, pestanaDelOrigen } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { arrastrarEnElLienzo } from './soporte/arrastre-del-lienzo'
import { barraDeLaFormula } from './soporte/barra-de-la-formula'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElBorradorDelDiseno, publicarFormulaDeTresSumandos } from './soporte/diseno-editor'
import { borrarNivelesDePrueba, nivelEnLaBase, PREFIJO_DE_NIVEL_E2E } from './soporte/niveles'
import { literal, sql } from './soporte/sql'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// El editor de la hoja (docs/UX.md › «Cotización: hoja (estados propios)»; docs/GLOSARIO.md › «Inspector de la hoja»): la hoja de verdad en el lienzo, cada pieza
// elegida en él (`?pieza=`) y editada en el inspector. Un recorrido en escritorio sobre la fórmula de tres sumandos (Base: Precio y Flete · Extras: Aduana ·
// Resumen: Total): el rótulo, arrastrar a un lugar libre de otra sección con su aviso de nivel, el ancho con el borde y con Alt+Shift+→, la tarjeta del total
// como pieza publicada desde la barra, quitar y volver a sumar desde «Sin lugar en la hoja», un nivel creado desde el inspector y salir con cambios.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }
let nivel = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  nivel = `${PREFIJO_DE_NIVEL_E2E} Editor ${proyecto}`
  duena = correoDePrueba(`duena-editor-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Elsa Editor' })
  origen = await crearOrigenDeCotizar(proyecto, 'deditor', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lienzo = (page: Page) => page.locator('[data-lienzo-de-la-hoja]')
const seccion = (page: Page, id: string) => lienzo(page).locator(`section[data-seccion="${id}"]`)
const boton = (page: Page, pieza: string) => page.locator(`[data-elegir="${pieza}"]`)
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')

// Elige una pieza con el clic. Una sección se toca por su título: el centro cae sobre sus piezas, que la tapan.
async function elegir(page: Page, pieza: string) {
  await boton(page, pieza).click(pieza.startsWith('seccion-') ? { position: { x: 24, y: 6 } } : {})
  await expect(inspector(page)).toHaveAttribute('data-pieza', pieza)
}

async function abrirElEditor(page: Page) {
  await entrar(page, duena, { fresco: true })
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  await expect(seccion(page, 'base')).toBeVisible()
}

async function guardarElBorrador(page: Page) {
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
}

const piezasDe = (page: Page, id: string) =>
  seccion(page, id)
    .locator('[data-rejilla-de-celdas] > [data-pieza]')
    .evaluateAll((nodos) => nodos.map((n) => n.getAttribute('data-pieza')))

test('E1: elige una celda, cambia su rótulo y guarda el borrador con la definición editada', async ({
  page,
}) => {
  await abrirElEditor(page)
  await expect(inspector(page)).toHaveCount(0)
  await elegir(page, 'precio')
  await expect(page).toHaveURL(/pieza=precio/)
  const rotulo = inspector(page).getByLabel('Rótulo')
  await expect(rotulo).toHaveValue('Precio')
  await rotulo.fill('Precio de subasta')
  await rotulo.press('Tab')
  await expect(boton(page, 'precio')).toHaveAccessibleName('Elegir «Precio de subasta»')
  await guardarElBorrador(page)
  const definicion = leerElBorradorDelDiseno(origen.id)?.definicion as
    { nodos: { id: string; etiqueta: string }[] } | undefined
  expect(definicion?.nodos.find((n) => n.id === 'precio')?.etiqueta).toBe('Precio de subasta')
})

test('E2: arrastra una celda a un lugar libre de otra sección y el inspector avisa el nivel', async ({
  page,
}) => {
  await abrirElEditor(page)
  await elegir(page, 'seccion-extras')
  await inspector(page).getByLabel('Quién la ve').selectOption('costos')
  // El aviso de lo que se deduce sube el lienzo: se arrastra con él ya dibujado.
  await expect(page.locator('[data-avisos-del-diseno]')).toContainText('puede deducir «Aduana»')
  await elegir(page, 'flete')
  // Debajo de «Aduana», en la fila del «+» de «Extras»: un lugar libre.
  const hueco = seccion(page, 'extras').locator('[data-hueco-para-sumar]')
  await arrastrarEnElLienzo(page, 'flete', hueco, { marca: 'libre' })
  await expect.poll(() => piezasDe(page, 'extras')).toEqual(['aduana', 'flete'])
  await expect.poll(() => piezasDe(page, 'base')).toEqual(['precio'])
  await expect(page.locator('[data-anuncio-de-la-hoja]')).toHaveText(
    'Moviste «Flete» a «Extras», columna 1, fila 2.',
  )
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'flete')
  await expect(inspector(page).locator('[data-aviso-de-nivel]')).toContainText(
    'Ahora la ve «Costos»',
  )
  await guardarElBorrador(page)
  const extras = leerElBorradorDelDiseno(origen.id)?.diseno.secciones.find((s) => s.id === 'extras')
  expect(extras?.items.map((i) => [i.nodo, i.posicion])).toEqual([
    ['aduana', { columna: 1, fila: 1 }],
    ['flete', { columna: 1, fila: 2 }],
  ])
})

test('E3: cambia el ancho con el borde y con Alt+Shift+→', async ({ page }) => {
  await abrirElEditor(page)
  await elegir(page, 'precio')
  const ancho = inspector(page).getByLabel('Ancho', { exact: true })
  await expect(ancho).toHaveValue('12')
  // El borde derecho llevado hasta la mitad de la pieza: la mitad de la rejilla.
  const borde = page.locator('[data-borde-de-ancho]')
  await expect(borde).toHaveAccessibleName('Ancho de «Precio de subasta»: 12 de 12 columnas')
  await borde.dragTo(boton(page, 'precio'), { steps: 10, force: true })
  await expect(ancho).toHaveValue('6')
  await boton(page, 'precio').focus()
  await page.keyboard.press('Alt+Shift+ArrowRight')
  await expect(ancho).toHaveValue('7')
  await guardarElBorrador(page)
  const base = leerElBorradorDelDiseno(origen.id)?.diseno.secciones.find((s) => s.id === 'base')
  expect(base?.items.find((i) => i.nodo === 'precio')?.ancho).toBe(7)
})

test('E4: suma la tarjeta del total y la publica desde la barra de la fórmula', async ({
  page,
}) => {
  await abrirElEditor(page)
  await seccion(page, 'resumen').getByRole('button', { name: 'Sumar una pieza aquí' }).click()
  await page.getByRole('button', { name: 'Tarjeta del total', exact: true }).click()
  await expect(seccion(page, 'resumen').locator('[data-elegir="tarjeta-del-total"]')).toBeVisible()

  // Con cambios sin guardar, «Publicar…» espera con su motivo.
  const publicar = barraDeLaFormula(page).getByRole('button', { name: 'Publicar…', exact: true })
  await expect(publicar).toBeDisabled()
  await expect(publicar).toHaveAccessibleDescription('Guarda el borrador antes de publicar.')
  await guardarElBorrador(page)
  await expect(publicar).toBeEnabled()
  await publicar.click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('La tarjeta del total en el resumen')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = (columna: string) =>
    sql(
      `select ${columna} from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    )
  await expect.poll(() => publicada('version')).toBe('2')
  expect(
    publicada(
      `(select jsonb_agg(i ->> 'tipo') from jsonb_array_elements(diseno -> 'secciones') s, jsonb_array_elements(s -> 'items') i where s ->> 'id' = 'resumen')::text`,
    ),
  ).toBe('["celda", "total"]')
  // Publicada, el editor sigue sobre la versión nueva, sin cambios.
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
  await expect(seccion(page, 'resumen').locator('[data-elegir="tarjeta-del-total"]')).toBeVisible()
})

test('E5: quita una celda con «Deshacer» a mano y la vuelve a sumar desde «Sin lugar en la hoja»', async ({
  page,
}) => {
  await abrirElEditor(page)
  await elegir(page, 'aduana')
  await page.getByRole('button', { name: 'Más acciones de «Aduana»', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Quitar', exact: true }).click()
  await expect(page.getByText('Quitaste «Aduana».')).toBeVisible()
  await expect(boton(page, 'aduana')).toHaveCount(0)

  const sinLugar = inspector(page).locator('[data-sin-lugar]')
  await expect(sinLugar).toContainText('Sin lugar en la hoja (1)')
  await sinLugar.getByRole('button', { name: 'Agregar «Aduana»', exact: true }).click()
  // Va al final de la primera sección principal, y queda elegida.
  await expect.poll(() => piezasDe(page, 'base')).toEqual(['precio', 'aduana'])
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'aduana')
})

test('E6: crea un nivel desde el inspector y queda elegido en la sección', async ({ page }) => {
  await abrirElEditor(page)
  await elegir(page, 'seccion-base')
  await inspector(page).getByRole('button', { name: 'Nuevo nivel', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Nuevo nivel de acceso' })
  await expect(page).toHaveURL(/panel=nuevo-nivel/)
  await modal.getByLabel('Nombre').fill(nivel)
  await modal.getByRole('button', { name: 'Crear nivel', exact: true }).click()
  await expect(modal).toBeHidden()
  const creado = nivelEnLaBase(nivel)
  expect(creado).toBeDefined()
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'seccion-base')
  await expect(inspector(page).getByLabel('Quién la ve')).toHaveValue(creado!.clave)
  await expect(inspector(page).getByLabel('Quién la ve').locator('option:checked')).toHaveText(
    nivel,
  )
})

test('E7: salir con cambios pregunta y «Seguir editando» los deja', async ({ page }) => {
  await abrirElEditor(page)
  await elegir(page, 'seccion-extras')
  await inspector(page).getByLabel('Dónde va').selectOption('avanzado')
  await pestanaDelOrigen(page, 'Planilla').click()
  const barra = page.getByRole('region', { name: 'Cambios sin guardar' })
  await barra.getByRole('button', { name: 'Seguir editando' }).click()
  await enLaPestana(page, 'Hoja')
  await expect(inspector(page).getByLabel('Dónde va')).toHaveValue('avanzado')
  await barra.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})
