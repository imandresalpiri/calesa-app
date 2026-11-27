import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import { crearOrigenDeCotizar, ocultoDeUnaFormulaSembrada } from './soporte/cotizar-formula'
import {
  cambiarElFactorVivo,
  crearVehiculoDePrueba,
  envejecerLaCotizacion,
  guardarPorLaHoja,
  numeroDeLaCotizacion,
  publicarConTablaViva,
} from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  limpiarGuardado,
  prepararGuardado,
  tipearEnLaHoja,
  NOMBRE_DE_LA_DUENA_DEL_GUARDADO,
} from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import {
  abrirLaHoja,
  cotizarEnLaSubasta,
  abrirLaVistaPrevia,
  alDia,
  anotar,
  cerrarLaVistaPrevia,
  desvioDeLaCombinada,
  dialogo,
  etiquetasDeLasFilas,
  grupos,
  hoja,
  regionDelTotal,
  tarjeta,
  textoDe,
  total,
  urlDeLaSubasta,
  variable,
  zona,
} from './soporte/cotizar-vista-previa'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { formatearFecha } from '../src/shared/lib/fechas'

// «Vista previa» de la tarjeta (paso 4.18-2, `docs/UX.md` › «Cotizar»): el botón del pie del resumen abre `?panel=vista-previa` con la tarjeta de la cotización tal como la vería el
// cliente. La dibuja `cotizacion_tarjeta()` (la plantilla publicada del origen, 4.18-1) con los números de la hoja (la nueva) o con los guardados (una guardada, P5 a). Cierra 4-55.
test.describe.configure({ mode: 'serial' })

// Los topes de la tarjeta de `subasta_usa` con todo encendido (garantía y total en Bs), con la plantilla sembrada convertida a la cuadrícula: medidos con la dueña
// (123 nodos y 17.808 bytes de `cotizacion_tarjeta`) y fijados en lo medido más un 5 % (C11). La respuesta lleva la cuadrícula entera: es un modal en un portal.
const TOPE_DE_NODOS_DE_LA_TARJETA = 130
const TOPE_DE_BYTES_DE_LA_RESPUESTA = 18_700

let origen = { id: '', nombre: '' }
let origenVivo = { id: '', nombre: '' }
let duena = ''
let leadDeLaDuena = ''
let asesora = { email: '', nombre: '' }
let leadDeLaAsesora = ''
let subasta = ''
let vehiculo = ''
let vehiculoDe2019 = ''
const TITULO_DEL_VEHICULO = 'Vista previa Hilux'

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead: leadDeLaDuena } = await prepararGuardado(proyecto, 'vprevia'))
  asesora = await crearAsesoraDeLaSemilla(`vprevia-${proyecto}`)
  leadDeLaAsesora = await crearLead({
    nombre: `vista previa ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  await cargarVehiculos(subasta, [
    {
      titulo: `${TITULO_DEL_VEHICULO} ${proyecto}`,
      anio: 2020,
      atributos: { tipo_vehiculo: 'autos' },
    },
  ])
  vehiculo = (await vehiculoPorTitulo(`${TITULO_DEL_VEHICULO} ${proyecto}`))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  // Un origen con la tabla viva, sin plantilla: lo que cambia entre guardar y abrir es una fila de su tabla (E8).
  origenVivo = await crearOrigenDeCotizar(proyecto, 'vpviva', true)
  publicarConTablaViva(origenVivo.id, 100)
  vehiculoDe2019 = crearVehiculoDePrueba(origenVivo.id, `Vista previa 2019 ${proyecto}`, 2019)
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await limpiarGuardado()
  await borrarLeadsDePrueba()
  await borrarRolesDePrueba()
})

test('E2E la vista previa abre con su URL y dibuja el encabezado, el vehículo, los grupos con su color y el total de la hoja', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const totalDelResumen = await textoDe(regionDelTotal(page).locator('[data-total]'))
  expect(totalDelResumen).toMatch(/\d/)
  const t = await abrirLaVistaPrevia(page)
  expect(new URL(page.url()).searchParams.get('panel')).toBe('vista-previa')
  const hoy = formatearFecha(new Date().toISOString(), { zona: zona() })
  await expect(variable(t, 'fecha_larga')).toHaveText(hoy)
  await expect(variable(t, 'titulo_opcion')).toHaveText(
    'COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL',
  )
  // «Asesor:» y el nombre van en dos celdas (un texto no mezcla texto y variables).
  await expect(t.getByText('Asesor:', { exact: true })).toBeVisible()
  await expect(variable(t, 'asesor_nombre')).toHaveText(asesora.nombre)
  // 4-55: la tarjeta titula con el vehículo y el encabezado con la variante.
  await expect(variable(t, 'vehiculo_titulo')).toHaveText(`${TITULO_DEL_VEHICULO} ${proyecto}`)
  expect(await grupos(t)).toEqual([
    ['Compra', 'verde'],
    ['Logística', 'amarillo'],
    ['Aduana', 'naranja'],
  ])
  expect(await textoDe(total(t))).toBe(totalDelResumen)
  await expect(t).toContainText('cotización referencial')
  await cerrarLaVistaPrevia(page)
  expect(new URL(page.url()).searchParams.get('panel')).toBeNull()
  // Recargar con la URL la abre.
  await page.goto(`${urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo)}&panel=vista-previa`)
  await expect(dialogo(page)).toBeVisible()
  await expect(tarjeta(page)).toBeVisible()
})

test('E2E el tipo de cambio y el plazo van una vez por grupo y, con otro modo, dicen los nombres de ese modo', async ({
  page,
}) => {
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const nombreDe = (clave: string) =>
    sql(`select nombre from public.tipos_cambio where clave = ${literal(clave)}`)
  let t = await abrirLaVistaPrevia(page)
  await expect(t.locator('[data-mostrar="tc_nombre"]')).toHaveCount(3)
  await expect(t.locator('[data-mostrar="plazo"]')).toHaveCount(3)
  // El tipo de cambio y el plazo de un grupo van en la primera fila de sus miembros: la de remate (compra) y la de nacionalización (aduana).
  const celdaDeTc = (primerMiembro: string) =>
    t.locator(`[data-mostrar="tc_nombre"][data-nodo="${primerMiembro}"]`)
  await expect(t.locator('[data-mostrar="plazo"][data-nodo="remate"]')).toContainText('2 días')
  await expect(celdaDeTc('remate')).toContainText(nombreDe('paralelo'))
  await expect(celdaDeTc('nacionalizacion')).toContainText(nombreDe('oficial'))
  // La celda combinada ocupa el alto de las filas de su grupo (remate a transferencia; la cuenta especial no aplica y su fila no se dibuja).
  const desvio = await desvioDeLaCombinada(
    celdaDeTc('remate'),
    t.locator('[data-columna="concepto"][data-nodo="remate"]'),
    t.locator('[data-columna="concepto"][data-nodo="transferencia"]'),
  )
  expect(desvio.arriba).toBeLessThanOrEqual(1)
  expect(desvio.abajo).toBeLessThanOrEqual(1)
  await expect(t.locator('[data-fila="n_cuenta_especial"]')).toHaveCount(0)
  await cerrarLaVistaPrevia(page)
  await page.locator('[data-cabecera]').getByText('Unificado', { exact: true }).click()
  await alDia(page)
  t = await abrirLaVistaPrevia(page)
  await expect(celdaDeTc('remate')).toContainText(nombreDe('unificado'))
  await expect(celdaDeTc('nacionalizacion')).toContainText(nombreDe('oficial'))
})

test('E2E «Mostrar garantía» y «Ver total en moneda local» suman lo suyo a la tarjeta, y apagados no sale', async ({
  page,
}, info) => {
  await cotizarEnLaSubasta(page, duena, urlDeLaSubasta(subasta, leadDeLaDuena, vehiculo))
  const garantia = 'GARANTÍA PARA LA PARTICIPACIÓN'
  let t = await abrirLaVistaPrevia(page)
  await expect(t).not.toContainText(garantia)
  await expect(t.locator('[data-total-bs-de-la-tarjeta]')).toHaveCount(0)
  await cerrarLaVistaPrevia(page)
  await celdaDeLaHoja(page, 'mostrar_garantia').getByRole('switch').click()
  await page.getByRole('switch', { name: 'Ver total en moneda local' }).click()
  await alDia(page)
  t = await abrirLaVistaPrevia(page)
  await expect(t).toContainText(garantia)
  await expect(t.locator('[data-total-bs-de-la-tarjeta] [data-monto-valor]')).toContainText(/\d/)
  // Todo encendido: lo que pesa la tarjeta de la subasta (C11).
  const nodos = await t.evaluate((e) => e.querySelectorAll('*').length + 1)
  anotar(info, 'nodos de la tarjeta de subasta_usa, todo encendido', nodos)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_DE_LA_TARJETA)
  await cerrarLaVistaPrevia(page)
  await celdaDeLaHoja(page, 'mostrar_garantia').getByRole('switch').click()
  await page.getByRole('switch', { name: 'Ver total en moneda local' }).click()
  await alDia(page)
  t = await abrirLaVistaPrevia(page)
  await expect(t).not.toContainText(garantia)
  await expect(t.locator('[data-total-bs-de-la-tarjeta]')).toHaveCount(0)
})

test('E2E el Modo Live del pie del modal deja los montos de la tarjeta sin moneda', async ({
  page,
}) => {
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const t = await abrirLaVistaPrevia(page)
  const live = dialogo(page).getByRole('button', {
    name: 'Modo Live: ocultar los símbolos de moneda',
  })
  await expect(live).toHaveAttribute('aria-pressed', 'false')
  await expect(total(t).locator('[data-monto-valor]')).toBeVisible()
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'true')
  await expect(total(t).locator('[data-monto-valor]')).toBeHidden()
  await expect(t.locator('[data-fila^="n_"] [data-monto-valor]').first()).toBeHidden()
  await expect(total(t).locator('[data-monto-sin-moneda]')).toHaveText(/^-?[\d.,\s]+$/)
  await live.click()
  await expect(total(t).locator('[data-monto-valor]')).toBeVisible()
})

test('E2E quien ve «costos» ve en la tarjeta lo mismo que quien no, y ninguna celda que sólo ella ve en la hoja', async ({
  page,
}, info) => {
  const oculto = ocultoDeUnaFormulaSembrada('subasta_usa', 'costos')
  expect(oculto.etiquetas.length, 'la subasta tiene celdas de costos').toBeGreaterThan(0)
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const deLaAsesora = await etiquetasDeLasFilas(await abrirLaVistaPrevia(page))
  await cotizarEnLaSubasta(page, duena, urlDeLaSubasta(subasta, leadDeLaDuena, vehiculo))
  // Las celdas que sólo ella ve existen en su hoja (los impuestos, en «Avanzado»)…
  await page.locator('[data-avanzado]').getByRole('button').click()
  const avanzado = page.getByRole('dialog', { name: 'Avanzado' })
  await expect(avanzado).toContainText('Impuestos')
  await page.keyboard.press('Escape')
  await expect(avanzado).toBeHidden()
  const respuesta = page.waitForResponse((r) => r.url().includes('/rpc/cotizacion_tarjeta'))
  const t = await abrirLaVistaPrevia(page)
  const bytes = (await (await respuesta).body()).length
  anotar(info, 'bytes de cotizacion_tarjeta (la dueña)', bytes)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_LA_RESPUESTA)
  // …y no están en su tarjeta, que lleva las mismas filas que la de la asesora.
  expect(await etiquetasDeLasFilas(t)).toEqual(deLaAsesora)
  for (const etiqueta of oculto.etiquetas) {
    await expect(t).not.toContainText(etiqueta)
  }
})

test('E2E un origen sin plantilla dibuja la tarjeta por omisión: el total, y lo dice fuera de la tarjeta', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, `/cotizaciones/nuevo?origen=${origen.id}&lead=${leadDeLaDuena}`)
  await tipearEnLaHoja(page, 'pub', '1200')
  await alDia(page)
  const t = await abrirLaVistaPrevia(page)
  await expect(t).toHaveAttribute('data-por-omision', '')
  await expect(t.locator('[data-fila^="n_"]')).toHaveCount(0)
  await expect(t.locator('[data-fila="total"]').first()).toHaveText('Total')
  await expect(total(t)).toContainText('1.205,00')
  await expect(dialogo(page)).toContainText(
    'Este origen no tiene una plantilla de tarjeta para esta versión de la fórmula: la tarjeta va sólo con el total.',
  )
  await expect(t).not.toContainText('Este origen no tiene una plantilla')
})

test('E2E la tarjeta de una guardada nombra a quien la mira (no a quien la creó), su número y la fecha de su último guardado; vencida lo dice el modal y lo sin guardar no entra', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, { origenId: origen.id, lead: leadDeLaDuena, pub: '1200' })
  // La creó la asesora (sin pasar por los triggers, como la siembra): la dueña la abre.
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set creado_por = ${literal(idDePersona(asesora.email))}::uuid where id = ${literal(id)}::uuid;
    commit;`)
  const guardadaEl = sql(
    `select to_char(actualizado_en at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from public.cotizaciones where id = ${literal(id)}::uuid`,
  )
  await page.goto(`/cotizaciones/${id}`)
  await expect(hoja(page)).toBeVisible()
  let t = await abrirLaVistaPrevia(page)
  await expect(t.getByText('Cotización n.º', { exact: true })).toBeVisible()
  await expect(variable(t, 'numero')).toHaveText(String(numeroDeLaCotizacion(id)))
  // El asesor de la tarjeta es quien la mira: la dueña, aunque la creó la asesora.
  await expect(variable(t, 'asesor_nombre')).toHaveText(NOMBRE_DE_LA_DUENA_DEL_GUARDADO)
  await expect(variable(t, 'asesor_nombre')).not.toHaveText(asesora.nombre)
  await expect(variable(t, 'fecha_larga')).toHaveText(formatearFecha(guardadaEl, { zona: zona() }))
  await expect(dialogo(page)).not.toContainText('venció')
  const guardado = await textoDe(total(t))
  await cerrarLaVistaPrevia(page)
  // Vencida (envejecida por SQL): lo dice el modal, fuera de la tarjeta (la tarjeta es lo que recibe el cliente).
  envejecerLaCotizacion(id, 400)
  await page.goto(`/cotizaciones/${id}`)
  t = await abrirLaVistaPrevia(page)
  await expect(dialogo(page)).toContainText(/Esta cotización venció el \d{1,2} \S+ \d{4}\./)
  await expect(t).not.toContainText('venció')
  await expect(t).not.toContainText('Vencida')
  await cerrarLaVistaPrevia(page)
  // Un cambio sin guardar no mueve el total de la tarjeta y se dice fuera de ella.
  await tipearEnLaHoja(page, 'pub', '300')
  await alDia(page)
  t = await abrirLaVistaPrevia(page)
  expect(await textoDe(total(t))).toBe(guardado)
  await expect(dialogo(page)).toContainText(
    'Tus cambios sin guardar no están en la tarjeta: guarda para verlos.',
  )
})

test('E2E si lo de hoy no es lo guardado, la tarjeta dibuja lo guardado y lo dice; tras guardar dibuja lo nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, {
    origenId: origenVivo.id,
    lead: leadDeLaDuena,
    pub: '100',
    vehiculoId: vehiculoDe2019,
  })
  // Con el factor de 2019 en 100: 100 de la celda + 5 de la constante + 100 de la tabla = 205 guardado; con 300, 405 hoy.
  cambiarElFactorVivo(origenVivo.id, 300)
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.locator('[data-total]')).toContainText('405,00')
  let t = await abrirLaVistaPrevia(page)
  await expect(total(t)).toContainText('205,00')
  await expect(dialogo(page)).toContainText(
    'Lo de hoy no es lo guardado: la tarjeta muestra lo guardado.',
  )
  await cerrarLaVistaPrevia(page)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-total]')).toContainText('405,00')
  t = await abrirLaVistaPrevia(page)
  await expect(total(t)).toContainText('405,00')
  await expect(dialogo(page)).not.toContainText('Lo de hoy no es lo guardado')
})
