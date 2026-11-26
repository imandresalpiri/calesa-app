import type { Page } from '@playwright/test'
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
import { filaDeCatalogo, masAccionesDe, menuDe, nombreDeLaFila } from './soporte/lista-de-catalogo'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Repuestos › Configuración (T514, `docs/UX.md` › «Repuestos (config)»): el ⚙ «Configurar» de `/repuestos` (en sus tres vistas, sólo con `repuestos.configurar`), la tira de pestañas
// (Flujo, Cotizador, Catálogos, cada una su sub-ruta), el camino feliz de cada una, la raíz que abre Flujo y el buscador de Configuración, que lleva aquí. El detalle de cada editor lo prueban `configuracion-repuestos-catalogos.spec.ts`, `configuracion-repuestos-cotizador.spec.ts` y
// `configuracion-flujos*.spec.ts`.
test.describe.configure({ mode: 'serial' })

const RAIZ = '/repuestos/configuracion'
const PIEZA = 'Pieza e2e T514'

let duena = ''
let lectora = ''
let faseId = ''
let faseNombre = ''

const limpiar = () => {
  sql(`delete from repuestos_catalogos where nombre like ${literal('%e2e T514%')}`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  limpiar()
  duena = correoDePrueba(`duena-repuestos-config-${proyecto}`)
  lectora = correoDePrueba(`lectora-repuestos-config-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Configura' })
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lupe Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos config ${proyecto}`,
      clave: `e2e_ve_repuestos_config_${proyecto}`,
    },
    permisos: ['repuestos.ver'],
  })
  const fase = sql(
    `select f.id || '|' || f.nombre from public.fases f join public.flujos x on x.id = f.flujo_id where x.ambito = 'repuestos' and f.activa order by x.nombre, f.orden limit 1`,
  )
  const [id = '', ...partes] = fase.split('|')
  faseId = id
  faseNombre = partes.join('|')
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const configurar = (page: Page) => page.getByRole('link', { name: 'Configurar los repuestos' })
const tira = (page: Page) => page.getByRole('tablist')

// La redirección (308) de la raíz de la configuración: se pide sin seguirla y se mira a dónde manda.
async function redirige(page: Page, desde: string, hacia: string): Promise<void> {
  const respuesta = await page.request.get(desde, { maxRedirects: 0 })
  expect(respuesta.status(), `estado de ${desde}`).toBe(308)
  const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
  expect(destino.pathname + destino.search).toBe(hacia)
}

test('E2E el ⚙ Configurar sale en las tres vistas de Repuestos con el permiso y lleva a la configuración', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  for (const [ruta, nombre] of [
    ['/repuestos', 'proyectos'],
    ['/repuestos?vista=cadena', 'cadena'],
    ['/repuestos?vista=stock', 'stock'],
  ] as const) {
    await page.goto(ruta)
    await expect(configurar(page)).toBeVisible()
    await capturar(page, info, `engranaje-${nombre}`)
  }
  await configurar(page).click()
  await expect(page).toHaveURL(/\/repuestos\/configuracion\/flujo$/)
  await expect(
    page.getByRole('heading', { name: 'Configuración de repuestos', level: 1 }),
  ).toBeVisible()
  await expect(tira(page).getByRole('tab', { name: 'Flujo' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('E2E sin el permiso no hay ⚙ y cada pestaña dice «No tienes permiso»', async ({ page }) => {
  await entrar(page, lectora, { fresco: true })
  for (const ruta of ['/repuestos', '/repuestos?vista=cadena', '/repuestos?vista=stock']) {
    await page.goto(ruta)
    await expect(page.getByRole('heading', { name: 'Repuestos', level: 1 })).toBeAttached()
    await expect(configurar(page)).toHaveCount(0)
  }
  for (const pestana of ['flujo', 'cotizador', 'catalogos']) {
    await page.goto(`${RAIZ}/${pestana}`)
    await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  }
})

test('E2E Flujo: la raíz lo abre y una fase abre su panel', async ({ page }, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(RAIZ)
  await expect(page).toHaveURL(/\/repuestos\/configuracion\/flujo$/)
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()
  await page.goto(`${RAIZ}/flujo?vista=lista`)
  await page.locator('[data-abre-resumen]', { hasText: faseNombre }).first().click()
  await expect(page).toHaveURL(new RegExp(`fase=${faseId}`))
  await expect(page.getByRole('dialog').getByRole('heading', { name: faseNombre })).toBeVisible()
  await capturar(page, info, 'flujo-con-una-fase')
})

test('E2E Cotizador: la fórmula, los tramos y un tramo por ?panel=tramo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${RAIZ}/cotizador`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar cambios' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tramos de logística' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cajas', level: 2 })).toBeVisible()
  await capturar(page, info, 'cotizador')
  await page.goto(`${RAIZ}/cotizador?panel=tramo&tramo=nuevo&moneda=USD`)
  await expect(page.getByRole('dialog', { name: 'Agregar tramo en USD' })).toBeVisible()
})

test('E2E Catálogos: crear y editar un valor, un toque abre «Editar» y el «⋯» trae sus acciones', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${RAIZ}/catalogos`)
  const bloque = page.locator('section[aria-labelledby="titulo-de-catalogo-tipo_pieza"]')
  const agregar = page.getByRole('dialog', { name: 'Agregar tipo de pieza' })
  await bloque.getByRole('button', { name: 'Agregar tipo de pieza' }).click()
  await agregar.getByLabel('Nombre').fill(PIEZA)
  await agregar.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(agregar).toBeHidden()
  await expect(filaDeCatalogo(page, PIEZA)).toBeVisible()

  // Ningún «Editar» suelto a la vista: la fila se nombra «Editar <nombre>» y las acciones van en el «⋯».
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Editar ${PIEZA}`, exact: true })).toBeVisible()
  await masAccionesDe(page, PIEZA).click()
  const items = menuDe(page, PIEZA).getByRole('menuitem')
  await expect(items.first()).toHaveText('Editar')
  await expect(items.filter({ hasText: /^(Activar|Desactivar)$/ })).toHaveCount(1)
  await expect(items.filter({ hasText: 'Eliminar' })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(menuDe(page, PIEZA)).toBeHidden()

  // Tocar la fila abre «Editar…» y guarda el cambio.
  await nombreDeLaFila(page, PIEZA).click()
  const editar = page.getByRole('dialog', { name: 'Editar tipo de pieza' })
  await editar.getByLabel('Nombre').fill(`${PIEZA} 2`)
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(filaDeCatalogo(page, `${PIEZA} 2`)).toBeVisible()
  await capturar(page, info, 'catalogos')
})

test('E2E la raíz de la configuración de los repuestos abre el flujo en un solo salto', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await redirige(page, RAIZ, `${RAIZ}/flujo`)
})

test('E2E el buscador de Configuración encuentra «cotizador de repuestos» y lleva a la pestaña', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const buscador = page.getByRole('searchbox', { name: 'Buscar en Configuración' })
  const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  for (const [texto, titulo, destino] of [
    ['flujo de repuestos', 'Repuestos › Flujo de repuestos', `${RAIZ}/flujo`],
    ['cotizador de repuestos', 'Repuestos › Cotizador de repuestos', `${RAIZ}/cotizador`],
    ['catálogos de repuestos', 'Repuestos › Catálogos de repuestos', `${RAIZ}/catalogos`],
  ] as const) {
    await buscador.fill(texto)
    await expect(resultados.getByRole('link', { name: titulo, exact: true })).toHaveAttribute(
      'href',
      destino,
    )
  }
  await buscador.fill('cotizador de repuestos')
  await resultados.getByRole('link', { name: 'Repuestos › Cotizador de repuestos' }).click()
  await expect(page).toHaveURL(/\/repuestos\/configuracion\/cotizador$/)
})
