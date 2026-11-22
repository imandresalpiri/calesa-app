import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { tipearEnLaHoja } from './soporte/cotizar-guardar'
import {
  filasSonLoGuardado,
  guardarLaHojaAbierta,
  leerElPdf,
  snapshotDe,
  totalImpreso,
  usd,
} from './soporte/cotizar-pdf'
import {
  abrirLaHoja,
  abrirLaVistaPrevia,
  alDia,
  cerrarLaVistaPrevia,
  dialogo,
  etiquetasDeLasFilas,
  grupos,
  hoja,
  tarjeta,
  total,
} from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { capturar, crearAsesoraDeLaSemilla } from './soporte/recorrido'
import {
  borrarLoDeEsteSpec,
  crearOrigen,
  crearVehiculo,
  publicarComoLaDuena,
  publicarConLaComisionEnCostos,
  rgbDe,
  urlDeLaHoja,
} from './soporte/tarjeta-cuadricula'
import { literal, sql } from './soporte/sql'
import { formatearNumero } from '../src/shared/lib/formato'

// La tarjeta de la cotización en cuadrícula (T310, `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): una plantilla de la forma 2 como la de V1 USA
// (`entities/tarjeta/plantilla-como-v1-usa.json`), publicada por RPC, se ve igual en la vista previa (textos, montos y colores de sus celdas) y en el PDF; una de la
// forma 1 se ve con sus grupos, conceptos y total de siempre; una fila `no_aplica` se oculta con la variante, y un nodo nombrado que pasa a un nivel no viaja.
// Cada caso en un origen propio con una copia de la fórmula v1 de `subasta_usa`: nunca se publica sobre la de la semilla, que leen otros specs.
test.describe.configure({ mode: 'serial' })

const REPLICA = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/tarjeta/plantilla-como-v1-usa.json', 'utf8'),
) as unknown
// La forma 1 de la subasta (su semilla ya es forma 2).
const FORMA_1 = (
  JSON.parse(
    readFileSync(
      'src/modules/cotizaciones/entities/plantilla/plantillas-v1-de-las-semillas.json',
      'utf8',
    ),
  ) as { subasta_usa: unknown }
).subasta_usa
const NOMBRE_DE_LA_DUENA = 'Teresa Cuadrícula'

let duena = ''
let leadDeLaDuena = ''
let asesora = { email: '', nombre: '' }
let leadDeLaAsesora = ''
const origenes = { replica: '', grupos: '', nivel: '' }
const vehiculos = { replica: '', grupos: '' }
let guardadaDeLaReplica = ''
let guardadaDeGrupos = ''

const celda = (page: Page, id: string) => tarjeta(page).locator(`[data-celda="${id}"]`)

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tjcuad-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE_DE_LA_DUENA })
  leadDeLaDuena = await crearLead({
    nombre: `tarjeta ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  asesora = await crearAsesoraDeLaSemilla(`tjcuad-${proyecto}`)
  leadDeLaAsesora = await crearLead({
    nombre: `tarjeta asesora ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  origenes.replica = await crearOrigen(proyecto, 'replica')
  origenes.grupos = await crearOrigen(proyecto, 'grupos')
  origenes.nivel = await crearOrigen(proyecto, 'nivel')
  vehiculos.replica = await crearVehiculo(origenes.replica, `Tarjeta réplica Hilux ${proyecto}`)
  vehiculos.grupos = await crearVehiculo(origenes.grupos, `Tarjeta grupos Hilux ${proyecto}`)
  await publicarComoLaDuena(duena, origenes.replica, REPLICA)
  await publicarComoLaDuena(duena, origenes.nivel, REPLICA)
  // La forma 1: la de la subasta antes de sembrarse en forma 2 (el fixture), publicada tal cual (sin migrar).
  sql(`
    insert into public.plantillas_tarjeta (origen_id, estado, version, definicion, nota, publicado_en)
    values (${literal(origenes.grupos)}::uuid, 'publicada', 1, ${literal(JSON.stringify(FORMA_1))}::jsonb, 'E2E T310 forma 1', now())`)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
})

test('E2E la réplica de V1 USA en cuadrícula: la vista previa de una guardada dibuja sus textos, montos y colores, y oculta lo que no aplica', async ({
  page,
}, info) => {
  await abrirLaHoja(page, duena, urlDeLaHoja(origenes.replica, leadDeLaDuena, vehiculos.replica))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  guardadaDeLaReplica = await guardarLaHojaAbierta(page)
  const s = snapshotDe(guardadaDeLaReplica)
  await page.goto(`/cotizaciones/${guardadaDeLaReplica}`)
  await expect(hoja(page)).toBeVisible()
  await abrirLaVistaPrevia(page)
  await expect(celda(page, 'categoria')).toHaveText('COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL')
  await expect(celda(page, 'asesor')).toHaveText('Asesor:')
  await expect(celda(page, 'iniciales')).toHaveText('TC')
  await expect(celda(page, 'cab_tc')).toHaveText('Tipo $ Cambio')
  await expect(celda(page, 'cab_plazo')).toHaveText('Plazos Pagos')
  await expect(celda(page, 'remate_concepto')).toHaveText('Remate (costo aprox.)')
  await expect(celda(page, 'remate_descripcion')).toHaveText('Probabilidad de compra en subasta')
  await expect(celda(page, 'remate_monto').locator('[data-monto-valor]')).toHaveText(
    usd(s, Number(s.valores['remate'])),
  )
  const paralelo = sql("select nombre from public.tipos_cambio where clave = 'paralelo'")
  await expect(celda(page, 'compra_tc')).toHaveText(paralelo)
  await expect(celda(page, 'compra_tc_valor')).toHaveText(
    formatearNumero(Number(s.valores['tc_paralelo']), { decimales: 4, locale: s.locale }),
  )
  await expect(celda(page, 'compra_plazo')).toHaveText('2 días')
  await expect(celda(page, 'total_etiqueta')).toHaveText('TOTAL DÓLARES:')
  await expect(total(tarjeta(page)).locator('[data-monto-valor]').first()).toHaveText(
    usd(s, s.totales.usd ?? 0),
  )
  // Los colores: el hex del catálogo de cada celda (fondo `auto` = blanco).
  await expect(celda(page, 'remate_concepto')).toHaveAttribute('data-color', 'verde')
  await expect(celda(page, 'remate_concepto')).toHaveCSS('background-color', rgbDe('verde'))
  await expect(celda(page, 'transporte_bolivia_monto')).toHaveCSS(
    'background-color',
    rgbDe('amarillo'),
  )
  await expect(celda(page, 'nacionalizacion_concepto')).toHaveCSS(
    'background-color',
    rgbDe('naranja'),
  )
  await expect(celda(page, 'remate_descripcion')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  )
  // Lo que no aplica no se dibuja: la cuenta especial (interruptor apagado), el transporte a Chile y la exportación (otras opciones) y la garantía.
  for (const fila of ['n_cuenta_especial', 'n_transporte_chile', 'n_export', 'garantia']) {
    await expect(tarjeta(page).locator(`[data-fila="${fila}"]`), fila).toHaveCount(0)
  }
  await capturar(page, info, 'replica-v1-usa')
  await cerrarLaVistaPrevia(page)
})

// @sin-celular: el PDF de la réplica se arma en el servidor y no depende del ancho de la pantalla ni del tacto
test('E2E el PDF de la réplica de V1 USA trae los textos y los montos de sus celdas', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, `/cotizaciones/${guardadaDeLaReplica}`)
  const s = snapshotDe(guardadaDeLaReplica)
  const { lineas, leido } = await leerElPdf(page, guardadaDeLaReplica)
  expect(leido.paginas).toHaveLength(1)
  const texto = lineas.join('\n')
  for (const esperado of [
    'COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL',
    'Tipo $ Cambio',
    'Plazos Pagos',
    'Remate (costo aprox.)',
    'TOTAL DÓLARES:',
    usd(s, Number(s.valores['remate'])),
    usd(s, s.totales.usd ?? 0),
  ]) {
    expect(texto, esperado).toContain(esperado)
  }
  expect(texto).not.toContain('…')
})

test('E2E una plantilla de la forma 1 (la sembrada, sin migrar) se ve con sus grupos, sus conceptos con monto y su total', async ({
  page,
}, info) => {
  await abrirLaHoja(page, duena, urlDeLaHoja(origenes.grupos, leadDeLaDuena, vehiculos.grupos))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  guardadaDeGrupos = await guardarLaHojaAbierta(page)
  const s = snapshotDe(guardadaDeGrupos)
  await page.goto(`/cotizaciones/${guardadaDeGrupos}`)
  await expect(hoja(page)).toBeVisible()
  const t = await abrirLaVistaPrevia(page)
  expect(await grupos(t)).toEqual([
    ['Compra', 'verde'],
    ['Logística', 'amarillo'],
    ['Aduana', 'naranja'],
  ])
  const filas = await etiquetasDeLasFilas(t)
  expect(filas.slice(0, 3)).toEqual([
    'Remate (costo aprox.)',
    'Fees / Tarifa USA',
    'Transferencia a USA',
  ])
  await expect(
    t.locator('[data-fila="n_remate"][data-mostrar="monto"] [data-monto-valor]'),
  ).toHaveText(usd(s, Number(s.valores['remate'])))
  await expect(total(t).locator('[data-monto-valor]').first()).toHaveText(
    usd(s, s.totales.usd ?? 0),
  )
  await expect(t).toContainText('TOTAL DÓLARES')
  await capturar(page, info, 'forma-1-convertida')
})

// @sin-celular: el PDF de la forma 1 convertida se arma en el servidor y no depende del ancho ni del tacto
test('E2E el PDF de la forma 1 convertida trae los mismos conceptos con monto y el total', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, `/cotizaciones/${guardadaDeGrupos}`)
  const s = snapshotDe(guardadaDeGrupos)
  const { lineas } = await leerElPdf(page, guardadaDeGrupos)
  filasSonLoGuardado(lineas, s)
  expect(totalImpreso(lineas, s)).toBe(usd(s, s.totales.usd ?? 0))
  expect(lineas.join('\n')).not.toContain('…')
})

test('E2E una fila que no aplica se oculta al elegir otra opción de la variante, y vuelve con la suya', async ({
  page,
}, info) => {
  await abrirLaHoja(page, duena, urlDeLaHoja(origenes.replica, leadDeLaDuena, vehiculos.replica))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  let t = await abrirLaVistaPrevia(page)
  await expect(t.locator('[data-fila="n_transporte_bolivia"]').first()).toBeVisible()
  await expect(t.locator('[data-fila="n_transporte_chile"]')).toHaveCount(0)
  await cerrarLaVistaPrevia(page)
  // El radio va `sr-only` dentro de su etiqueta: se toca la etiqueta, como lo hace una persona.
  await page.locator('label', { hasText: 'USA → Chile' }).click()
  await expect(page.getByRole('radio', { name: 'USA → Chile' })).toBeChecked()
  await alDia(page)
  t = await abrirLaVistaPrevia(page)
  await expect(t.locator('[data-fila="n_transporte_chile"]').first()).toBeVisible()
  await expect(t.locator('[data-fila="n_transporte_bolivia"]')).toHaveCount(0)
  await expect(t.locator('[data-fila="n_nacionalizacion"]')).toHaveCount(0)
  await expect(t.locator('[data-celda="categoria"]')).toHaveText(
    'COTIZACIÓN VEHÍCULOS EEUU - CHILE',
  )
  await capturar(page, info, 'variante-chile')
})

test('E2E un nodo que la plantilla nombra y pasa a un nivel no viaja: ni su etiqueta ni su monto en la respuesta ni en la página', async ({
  page,
}) => {
  // Control: con la comisión del nivel «todos», la asesora la ve en la tarjeta.
  await abrirLaHoja(page, asesora.email, urlDeLaHoja(origenes.nivel, leadDeLaAsesora))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  let t = await abrirLaVistaPrevia(page)
  await expect(t.locator('[data-celda="comision_concepto"]')).toHaveText('Comisión')
  await cerrarLaVistaPrevia(page)
  // La N+1 la pone en «costos», que la asesora no tiene: la plantilla deja de servirle a esa versión.
  publicarConLaComisionEnCostos(origenes.nivel)
  await abrirLaHoja(page, asesora.email, urlDeLaHoja(origenes.nivel, leadDeLaAsesora))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  const respuesta = page.waitForResponse((r) => r.url().includes('/rpc/cotizacion_tarjeta'))
  t = await abrirLaVistaPrevia(page)
  const cuerpo = await (await respuesta).text()
  expect(JSON.parse(cuerpo)).toEqual({ estado: 'sin_plantilla' })
  expect(cuerpo).not.toMatch(/comision|Comisión/i)
  await expect(t).toHaveAttribute('data-por-omision', '')
  await expect(dialogo(page)).not.toContainText('Comisión')
})
