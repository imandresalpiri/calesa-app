// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { sembrarBorradorDeNFilas } from './soporte/formula-editor'
import { leerBorrador } from './soporte/formula-editor-guardar'
import { esLaQueRecuerdaLaPestana } from './soporte/pestanas-del-origen'
import {
  borrarLoDePrevia,
  claveDeVolumen,
  definicionConTablas,
  sembrarBorradorDeLaDefinicion,
  sembrarTablaDeVolumen,
} from './soporte/formula-editor-previa'
import {
  a1De,
  abrirCostado,
  abrirPlanilla,
  celdaDe,
  entradaDeLaCelda,
  escribirEnLaCelda,
  filaDe,
  grilla,
  guardado,
  guardar,
  planilla,
  totalesDelCostado as totales,
} from './soporte/planilla'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// La planilla con volumen (`docs/RENDIMIENTO.md` › «Cotizador (fórmula, diseño, cotizaciones)»): con 600 filas dibuja 500 con `<AvisoDeTope>` y «Buscar fila» lleva a las demás; lo de prueba son
// pocos pedidos, constantes y no por fila; PostgREST no da más de 1.000 filas por pedido (`max_rows`), así que una tabla se lee si cabe (999 sí, 1.000 y 1.001 no,
// con su aviso) y dos de 600 se leen enteras en dos pedidos; guardar 600 filas es un pedido de menos de 1 MiB.
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 600 filas (77.017 B de la lectura de la definición; los nodos de la tabla con 500 filas), más un 5 %.
const TOPE_DE_BYTES_DE_LA_DEFINICION = 80_900
const TOPE_DE_NODOS_CON_500 = 6_300

let proyecto = ''
let duena = ''
let grande = { id: '', nombre: '' }
let conTabla = { id: '', nombre: '' }
let enormes = { id: '', nombre: '' }
let dosDeSeiscientas = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-volumen-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Volumen' })
  for (const [sufijo, n] of [
    ['999', 999],
    ['1000', 1000],
    ['1001', 1001],
    ['a600', 600],
    ['b600', 600],
  ] as const) {
    sembrarTablaDeVolumen(claveDeVolumen(proyecto, sufijo), n)
  }
  const de = (...s: string[]) => s.map((x) => claveDeVolumen(proyecto, x))
  grande = await crearOrigenDeCotizar(proyecto, 'plgrande', false)
  sembrarBorradorDeNFilas(grande.id, 600, duena)
  conTabla = await crearOrigenDeCotizar(proyecto, 'plcontabla', false)
  sembrarBorradorDeLaDefinicion(conTabla.id, definicionConTablas(600, de('999')), duena)
  enormes = await crearOrigenDeCotizar(proyecto, 'plenorm', false)
  sembrarBorradorDeLaDefinicion(
    enormes.id,
    definicionConTablas(1, de('999', '1000', '1001')),
    duena,
  )
  dosDeSeiscientas = await crearOrigenDeCotizar(proyecto, 'pldos600', false)
  sembrarBorradorDeLaDefinicion(
    dosDeSeiscientas.id,
    definicionConTablas(1, de('a600', 'b600')),
    duena,
  )
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const buscar = (page: Page) => page.getByRole('searchbox', { name: 'Buscar fila' })

// Cuenta los pedidos de lo de prueba por tabla de la base.
function contar(page: Page) {
  const cuenta = { tipos: 0, tablas: 0, filas: 0 }
  page.on('request', (r) => {
    const url = r.url()
    if (/\/rest\/v1\/tipos_cambio\?/.test(url)) cuenta.tipos += 1
    else if (/\/rest\/v1\/tablas_referencia_filas\?/.test(url)) cuenta.filas += 1
    else if (/\/rest\/v1\/tablas_referencia\?/.test(url)) cuenta.tablas += 1
  })
  return cuenta
}

test('con 600 filas: 500 dibujadas con su aviso y su tope de nodos, «Buscar fila» lleva a las demás y guardar es un pedido chico', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  // La definición se lee al abrir la pestaña (la planilla es la vista por defecto): la espera va antes de entrar.
  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/formulas') && r.url().includes('definicion'),
  )
  const desde = Date.now()
  await abrirLaFormula(page, grande.id, 'planilla')
  await expect(filaDe(page, 'fila_497')).toBeVisible()
  const ms = Date.now() - desde
  const bytes = (await (await respuesta).body()).length
  await expect(grilla(page).locator('tr[data-fila]')).toHaveCount(500)
  await expect(filaDe(page, 'fila_498')).toHaveCount(0)
  await expect(
    planilla(page).getByRole('status').filter({ hasText: 'Mostrando las 500 primeras filas.' }),
  ).toBeVisible()
  const nodos = await grilla(page).evaluate((tabla) => tabla.querySelectorAll('*').length + 1)
  await expect(
    page.getByText('Este borrador no tiene el diseño de la hoja: todavía no se puede publicar.'),
  ).toBeVisible()

  const remate = await a1De(page, 'remate')
  await buscar(page).fill('Fila 599')
  await expect(filaDe(page, 'fila_599')).toBeVisible()
  await expect(grilla(page).locator('tr[data-fila]')).toHaveCount(1)
  await escribirEnLaCelda(page, celdaDe(page, 'fila_599'), `=${remate}*2`)
  const pedidos: number[] = []
  page.on('request', (r) => {
    if (
      r.method() === 'POST' &&
      r.headers()['next-action'] !== undefined &&
      !esLaQueRecuerdaLaPestana(r)
    ) {
      pedidos.push(Buffer.byteLength(r.postData() ?? ''))
    }
  })
  const antesDeGuardar = Date.now()
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const msDeGuardar = Date.now() - antesDeGuardar
  expect(pedidos).toHaveLength(1)
  const [bytesDeGuardar = 0] = pedidos
  info.annotations.push({
    type: 'medida',
    description: `${String(bytes)} B de la definición, ${String(nodos)} nodos con 500 filas, ${String(ms)} ms hasta la fila 497; guardar: ${String(bytesDeGuardar)} B, ${String(msDeGuardar)} ms`,
  })
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_LA_DEFINICION)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_500)
  expect(bytesDeGuardar).toBeLessThan(1024 * 1024)
  expect(leerBorrador(grande.id)?.definicion.nodos.find((n) => n.id === 'fila_599')?.texto).toBe(
    '=remate*2',
  )

  await buscar(page).fill('no-existe')
  await expect(
    planilla(page).getByText('Ninguna fila tiene «no-existe» en el concepto.'),
  ).toBeVisible()
})

test('con 600 filas, el resultado al lado aparece en menos de 1 s tras tipear en la última', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, grande.id)
  const remate = await a1De(page, 'remate')
  await escribirEnLaCelda(page, celdaDe(page, 'remate', 'D'), '10')
  await buscar(page).fill('Fila 599')
  await expect(filaDe(page, 'fila_599')).toBeVisible()
  await celdaDe(page, 'fila_599').dblclick()
  const entrada = entradaDeLaCelda(page)
  await expect(entrada).toBeFocused()
  const resultado = planilla(page).getByRole('status', {
    name: 'Resultado con la unidad de ejemplo',
  })
  await expect(resultado).toBeVisible()
  await entrada.fill(`=${remate}*3`)
  const desde = Date.now()
  await expect(resultado).toContainText('30')
  const ms = Date.now() - desde
  info.annotations.push({ type: 'medida', description: `resultado al lado: ${String(ms)} ms` })
  expect(ms).toBeLessThanOrEqual(1000)
})

test('con 600 filas y una tabla, abrir hace 3 pedidos de lo de prueba y ninguno más al buscar ni al aplicar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const cuenta = contar(page)
  await abrirPlanilla(page, conTabla.id)
  await expect(filaDe(page, 'fila_495')).toBeVisible()
  await expect(celdaDe(page, 't_1', 'D')).toContainText('1')
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 1 })
  const remate = await a1De(page, 'remate')
  await buscar(page).fill('Fila 599')
  await escribirEnLaCelda(page, celdaDe(page, 'fila_599'), `=${remate}*2`)
  await abrirCostado(page, 'Totales')
  await expect(totales(page).getByText('Total en dólares')).toBeVisible()
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 1 })
})

test('una tabla de 999 filas se usa; las de 1.000 y 1.001 dan su aviso y no se usan', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, enormes.id)
  await expect(celdaDe(page, 't_1', 'D')).toContainText('1')
  await abrirCostado(page, 'Totales')
  for (const sufijo of ['1000', '1001']) {
    await expect(totales(page)).toContainText(
      `La tabla «${claveDeVolumen(proyecto, sufijo)}» tiene 1.000 filas o más: la vista previa no la lee.`,
    )
  }
})

test('dos tablas de 600 filas se leen enteras, en dos pedidos de filas', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const cuenta = contar(page)
  await abrirPlanilla(page, dosDeSeiscientas.id)
  await expect(celdaDe(page, 't_1', 'D')).toContainText('1')
  await expect(celdaDe(page, 't_2', 'D')).toContainText('1')
  await abrirCostado(page, 'Totales')
  await expect(totales(page)).not.toContainText('no se pudo leer entera')
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 2 })
})
