import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { celdaDeLaHoja, tipearEnLaHoja } from './soporte/cotizar-guardar'
import {
  CALCULADA,
  PISADA,
  REMATE,
  borrarLoDeEsteSpec,
  calculado,
  crearOrigenConLaTransferenciaDeCostos,
  monto,
} from './soporte/cotizar-pisar'
import { abrirLaHoja, alDia, urlDeLaSubasta } from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { contraste } from '../src/shared/lib/color'

// La XCell funciona como un campo (`src/shared/ui/xcell/CLAUDE.md` › «Teclado y toque», `docs/UX.md` › «Flujo 2 — Cotizar», 3): tocar cualquier parte la
// edita, el rótulo flota y nada de la hoja salta (el alto de cada celda y su lugar no cambian al abrir, cancelar, confirmar, con el aviso de lo tipeado ni
// con una celda pisada). La bloqueada no entra en edición: tocarla en cualquier parte enfoca su candado y su globo dice el motivo; su monto se lee (AA).
// El error de la base (rango, obligatorio) va por el mismo camino que el aviso de lo tipeado (la línea de la nota): lo mide el banco (`xcell-geometria`).
test.describe.configure({ mode: 'serial' })

let duena = ''
let sinNivel = ''
let subasta = ''
let lead = ''
let vehiculo = ''
let origenConNivel = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  borrarLoDeEsteSpec('')
  duena = correoDePrueba(`duena-campo-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Cami Campo' })
  sinNivel = correoDePrueba(`sin-nivel-campo-${proyecto}`)
  await crearPersona({
    email: sinNivel,
    contrasena: CONTRASENA,
    nombre: 'Nico Nivel',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinNivel,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Campo sin nivel ${proyecto}`,
      clave: `e2e_campo_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  lead = await crearLead({
    nombre: `campo ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  const titulo = `Campo Corolla ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  origenConNivel = await crearOrigenConLaTransferenciaDeCostos(`campo_${proyecto}`)
})

test.afterAll(async () => {
  borrarLoDeEsteSpec(vehiculo)
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const xcell = (celda: Locator): Locator => celda.locator('[data-xcell]')
const rotulo = (celda: Locator): Locator => celda.locator('[data-xcell] > [id$="e"]')

// Cada celda de la hoja: su alto y su lugar respecto de la primera (un aviso de la hoja arriba de todas no es un salto de la celda), al medio píxel.
const cajas = (page: Page): Promise<string[]> =>
  page.locator('[data-hoja] [data-xcell]').evaluateAll((celdas) => {
    const medio = (n: number) => Math.round(n * 2) / 2
    const arriba = celdas[0]?.getBoundingClientRect().top ?? 0
    return celdas.map((c) => {
      const r = c.getBoundingClientRect()
      return `${c.getAttribute('aria-label') ?? ''}: alto ${String(medio(r.height))}, ${String(medio(r.top - arriba))} abajo de la primera`
    })
  })

// Toca el rótulo hasta que la celda abre (sólo abre cuando la página terminó de hidratar).
async function tocarHastaAbrir(celda: Locator, donde: Locator): Promise<Locator> {
  const entrada = celda.locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) await donde.click()
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  return entrada
}

test('E2E tocar el rótulo o el fondo edita, el rótulo flota y ninguna celda cambia de alto ni de lugar', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, urlDeLaSubasta(subasta, lead, vehiculo))
  await alDia(page)
  const remate = celdaDeLaHoja(page, 'remate')
  const antes = await cajas(page)

  const entrada = await tocarHastaAbrir(remate, rotulo(remate))
  // Abre como el clic en el valor: con todo seleccionado.
  await expect(entrada).toHaveAttribute('data-seleccion', 'todo')
  await expect
    .poll(() => rotulo(remate).evaluate((e) => getComputedStyle(e).scale), 'el rótulo flota')
    .toBe('0.75')
  expect(await cajas(page), 'editando').toEqual(antes)
  // Tocar el rótulo con la edición abierta no la cierra ni la vuelve a abrir.
  await rotulo(remate).click()
  await expect(entrada).toBeFocused()

  await entrada.press('Escape')
  await expect(entrada).toBeHidden()
  expect(await cajas(page), 'tras cancelar').toEqual(antes)

  // El fondo de la celda (su relleno, arriba a la izquierda) también abre.
  await xcell(remate).click({ position: { x: 3, y: 3 } })
  await expect(entrada).toBeVisible()
  await entrada.fill('abc')
  await entrada.press('Enter')
  await expect(remate.getByRole('alert')).toContainText('Escribe un número')
  expect(await cajas(page), 'con el aviso de lo tipeado').toEqual(antes)

  await entrada.fill(REMATE)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
  await alDia(page)
  expect(await cajas(page), 'tras confirmar').toEqual(antes)

  const transferencia = celdaDeLaHoja(page, 'transferencia')
  await expect(monto(transferencia)).toContainText(CALCULADA)
  await tipearEnLaHoja(page, 'transferencia', PISADA)
  await alDia(page)
  await expect(calculado(transferencia)).toContainText(CALCULADA)
  // Pisada, el rótulo flota para dejar la línea de «Calculado» dentro de la celda.
  await expect
    .poll(() => rotulo(transferencia).evaluate((e) => getComputedStyle(e).scale))
    .toBe('0.75')
  expect(await cajas(page), 'con una celda pisada').toEqual(antes)
})

test('E2E la celda bloqueada no entra en edición: tocarla en cualquier parte enfoca su candado con el motivo, y su monto se lee (AA)', async ({
  page,
}) => {
  await abrirLaHoja(page, sinNivel, `/cotizaciones/nuevo?origen=${origenConNivel}`)
  const transferencia = celdaDeLaHoja(page, 'transferencia')
  const valor = monto(transferencia)
  await expect(valor).toHaveAttribute('aria-disabled', 'true')
  const candado = transferencia.getByRole('img', {
    name: 'Lo edita quien tiene el nivel «Costos».',
  })
  const globo = () => candado.evaluate((e) => getComputedStyle(e, '::after').display)

  for (const [donde, tocar] of [
    ['el rótulo', () => rotulo(transferencia).click()],
    ['el fondo', () => xcell(transferencia).click({ position: { x: 3, y: 3 } })],
    // `aria-disabled` no es `disabled`: el botón recibe el clic (Playwright lo cree apagado y hay que forzarlo; sigue siendo un clic del puntero).
    ['el valor', () => valor.click({ force: true })],
  ] as const) {
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await expect(candado).not.toBeFocused()
    await tocar()
    await expect(candado, donde).toBeFocused()
    expect(await globo(), `el globo del motivo, al tocar ${donde}`).toBe('block')
    await expect(transferencia.locator('input'), donde).toHaveCount(0)
  }

  // El valor apagado sigue legible: su tinta sobre el fondo de la celda, sin opacidad en él ni en lo que lo contiene.
  const leido = await valor.evaluate((e) => {
    let opacidad = 1
    for (let n: Element | null = e; n; n = n.parentElement)
      opacidad *= Number(getComputedStyle(n).opacity)
    const celda = e.closest('[data-xcell]')
    return {
      tinta: getComputedStyle(e).color,
      fondo: celda ? getComputedStyle(celda).backgroundColor : '',
      opacidad,
    }
  })
  const hex = (rgb: string) =>
    `#${(rgb.match(/[\d.]+/g) ?? [])
      .slice(0, 3)
      .map((c) => Math.round(Number(c)).toString(16).padStart(2, '0'))
      .join('')}`
  expect(leido.opacidad, 'la opacidad efectiva del valor').toBe(1)
  expect(
    contraste(hex(leido.tinta), hex(leido.fondo)),
    'contraste del valor bloqueado',
  ).toBeGreaterThanOrEqual(4.5)
})
