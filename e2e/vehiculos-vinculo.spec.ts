import { expect, test, type Page } from './soporte/prueba'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import {
  CLAVE,
  entrar,
  irAlOrigen,
  menuDeVehiculo,
  limpiarInventario,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// El vínculo a un lead y los interesados, vistos desde el bloque «Relacionados» de la ficha del vehículo (se cargan directo). Y lo que el vínculo otorga: con alcance «propios»,
// quien tiene al lead en su cartera edita el vehículo aunque no lo haya creado.
test.describe.configure({ mode: 'serial' })

const VINCULADO = 'Vínculo Sedán'
const SUELTO = 'Vínculo Camioneta'
const LEAD = 'E2E Marta Flores'

let soloCorea = ''
let asesora = ''
let colega = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let vinculado = ''
let suelto = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  const terreno = await prepararInventario(proyecto)
  ;({ soloCorea, corea } = terreno)
  await cargarVehiculos(corea.id, [{ titulo: VINCULADO }, { titulo: SUELTO }])
  vinculado = (await vehiculoPorTitulo(VINCULADO))?.id ?? ''
  suelto = (await vehiculoPorTitulo(SUELTO))?.id ?? ''

  // Ve todo Corea y edita sólo lo propio; lleva su cartera de leads.
  asesora = correoDePrueba(`asesora-vinculo-${proyecto}`)
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: 'Ada Asesora', invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Asesora ${proyecto}`, clave: `e2e_asesora_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'vehiculos.editar', origenId: corea.id, alcance: 'propios' },
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.editar', alcance: 'propios' },
    ],
  })
  // Ve los vehículos de Corea y sus propios leads: no tiene ninguno.
  colega = correoDePrueba(`colega-vinculo-${proyecto}`)
  await crearPersona({ email: colega, contrasena: CLAVE, nombre: 'Cora Colega', invitada: true })
  await darRolDePrueba({
    email: colega,
    rol: { nombre: `${PREFIJO_ROL_E2E}Colega ${proyecto}`, clave: `e2e_colega_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'leads.ver', alcance: 'propios' },
    ],
  })

  const lead = await crearLead({
    nombre: 'Marta Flores',
    telefono: `5917${String(Date.now()).slice(-7)}`,
    deQuien: asesora,
  })
  await vincular(vinculado, lead)
  await marcarInteres({
    vehiculoId: suelto,
    leadId: lead,
    quien: asesora,
    nota: 'Lo quiere en blanco',
  })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarInventario()
})

async function abrirFicha(page: Page, vehiculoId: string, titulo: string) {
  await page.goto(`/vehiculos/${vehiculoId}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
}
// El bloque «Relacionados» de arriba: sus grupos Vinculado e Interesado (el de cotizaciones sólo existe con `cotizaciones.ver`).
const vinculo = (page: Page) => page.getByRole('region', { name: 'Vinculado', exact: true })
const interesados = (page: Page) => page.getByRole('region', { name: 'Interesado', exact: true })

test('quien tiene al lead en su cartera ve el vínculo y edita el vehículo que no creó', async ({
  page,
}) => {
  await entrar(page, asesora)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(vinculo(page).getByText(LEAD)).toBeVisible()
  await expect(vinculo(page).getByText(/^Desde el /)).toBeVisible()

  // No lo creó ella, pero es de un lead de su cartera: «Editar» aparece y la base lo acepta.
  await page
    .getByRole('button', { name: `Más acciones de ${VINCULADO}` })
    .first()
    .click()
  await page.getByRole('menuitem', { name: 'Editar', exact: true }).click()
  const panel = page.getByRole('dialog', { name: `Editar ${VINCULADO}` })
  await panel.getByLabel('Marca').fill('Hyundai')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  expect((await vehiculoPorTitulo(VINCULADO))?.marca).toBe('Hyundai')

  // Lo mismo con sus fotos.
  await page.goto(`/vehiculos/${vinculado}?panel=imagenes`)
  await expect(
    page
      .getByRole('dialog', { name: 'Editar imágenes' })
      .getByRole('button', { name: 'Elegir fotos' }),
  ).toBeVisible()

  // En el inventario, «Editar» (en el «⋯») se puede sólo en el vinculado: en el otro se ve apagado con sus imágenes, con el motivo (edita lo propio y éste no lo es).
  await irAlOrigen(page, corea)
  await menuDeVehiculo(page, VINCULADO).click()
  await expect(page.getByRole('menuitem', { name: 'Editar', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await menuDeVehiculo(page, SUELTO).click()
  await expect(page.getByRole('menuitem', { name: 'Editar', exact: true })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Editar imágenes', exact: true })).toBeDisabled()
  await expect(
    page.getByRole('menu').getByText('No tienes permiso para editar este vehículo.').first(),
  ).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el interés de su lead se ve en el otro vehículo, que no puede editar', async ({ page }) => {
  await entrar(page, asesora)
  await abrirFicha(page, suelto, SUELTO)
  // Sin vínculo, el grupo no se dibuja.
  await expect(interesados(page).getByText(LEAD)).toBeVisible()
  await expect(vinculo(page)).toHaveCount(0)
  await expect(interesados(page).getByText('Lo quiere en blanco')).toBeVisible()
  await expect(interesados(page).getByText(/lo marcó Ada Asesora/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  // Sin poder editarlo, el «⋯» tiene «Editar imágenes» apagado; el visor (`?visor=`) sólo muestra.
  await page
    .getByRole('button', { name: `Más acciones de ${SUELTO}` })
    .first()
    .click()
  await expect(page.getByRole('menuitem', { name: 'Editar imágenes', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.goto(`/vehiculos/${suelto}?visor=${suelto}&foto=1`)
  await expect(page.locator('[data-visor-de-imagenes]')).toBeVisible()
  await expect(
    page.locator('[data-visor-de-imagenes]').getByText('No tiene fotos todavía.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Elegir fotos' })).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('quien no tiene al lead en su cartera sabe que hay un vínculo, no de quién', async ({
  page,
}) => {
  await entrar(page, colega)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(vinculo(page).getByText('1 que no puedes ver')).toBeVisible()
  await expect(page.getByText(LEAD)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  // El interés de un lead ajeno no le aparece.
  await abrirFicha(page, suelto, SUELTO)
  await expect(interesados(page).getByText('1 que no puedes ver')).toBeVisible()
  await expect(page.getByText(LEAD)).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin permiso sobre leads el bloque no existe', async ({ page }) => {
  await entrar(page, soloCorea)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(page.getByRole('region', { name: 'Relacionados' })).toHaveCount(0)
  await expect(page.getByText(LEAD)).toHaveCount(0)
})
