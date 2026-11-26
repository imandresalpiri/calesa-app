// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { barraDeLaFormula } from './soporte/barra-de-la-formula'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { celdaDeLaHoja, esperarElTotal, totalDeLaHoja } from './soporte/cotizar-guardar'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { abrirPlanilla, guardado, guardar, menuDeLaFila } from './soporte/planilla'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Los «Decimales» de una celda (`docs/UX.md` › «Cotización: fórmula (estados propios)», glosario «Decimales (de una celda)»): en la planilla, «⋯» › «Decimales…»
// abre su panel (`?panel=decimales&fila=<id>`) con «Automático» y 0 a 4 y el ejemplo, con su alto reservado; se guarda, se publica y la hoja de
// cotizar muestra la celda así (el monto en 0, el porcentaje en 2), con el total que sigue en «Automático» y el Modo Live tapando el monto. Un origen propio,
// que se borra solo, al empezar y al terminar: otros specs leen la publicada de los orígenes compartidos.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origen = { id: '', nombre: '' }
const claveDelOrigen = () => `${PREFIJO_CLAVE_E2E}decimales_${proyecto}`

// `flete` (un monto con cuatro decimales), `tasa` (un porcentaje) y el total, que es el flete.
function formulaDeDecimales() {
  return {
    definicion: {
      nodos: [
        { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
        { id: 'flete', tipo: 'constante', etiqueta: 'Flete', grupo: 'g', formato: 'usd' },
        { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
        {
          id: 'total',
          tipo: 'calculo',
          op: 'suma',
          etiqueta: 'Total',
          salida: 'total',
          de: ['flete'],
        },
      ],
      buckets: { origen: 'tc' },
      total_en: 'tc',
      grupos: [{ id: 'g', etiqueta: 'Costos', plazo: '1 día', tono: 'verde', bucket: 'origen' }],
    },
    params: { flete: 1234.5678, tasa: 0.14946 },
    diseno: {
      cabecera: {
        ver_total_bs: false,
        modos: [
          {
            clave: 'm1',
            nombre: 'Modo uno',
            total_en: 'tc',
            buckets: [{ bucket: 'origen', nodo: 'tc' }],
          },
        ],
      },
      secciones: [
        {
          id: 'costos',
          titulo: 'Costos',
          presentacion: 'principal',
          items: ['tc', 'flete', 'tasa'].map((nodo) => ({ tipo: 'celda', nodo, ancho: 'mitad' })),
        },
      ],
      tarjeta_total: { nodo: 'total', secundarios: [] },
    },
  }
}

function publicarLaFormula(origenId: string): void {
  const { definicion, params, diseno } = formulaDeDecimales()
  const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(diseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E decimales', now());
    end $f$`)
}

function borrarElOrigen(): void {
  const clave = literal(claveDelOrigen())
  sql(`
    delete from public.cotizaciones where origen_id in (select id from public.origenes where clave = ${clave});
    delete from public.origenes where clave = ${clave}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarElOrigen()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-decimales-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Deci Males' })
  origen = await crearOrigenDePrueba(`E2E Decimales ${proyecto}`, `decimales_${proyecto}`, {
    tipo: 'manual',
  })
  publicarLaFormula(origen.id)
})

test.afterAll(async () => {
  borrarElOrigen()
  await borrarPersonasDePrueba()
})

const panel = (page: Page) => page.getByRole('dialog', { name: 'Decimales', exact: true })
const sinEspacios = (t: string | null) => (t ?? '').replace(/[  ]/g, ' ')

// Un alto reservado: una prueba sin celular no mide cajas (`docs/LECCIONES.md`); afirma el estilo que lo reserva.
const RESERVADO = /^[1-9][\d.]*px$/

// «⋯» › «Decimales…» de la fila: el panel abierto, con su URL.
async function abrirLosDecimales(page: Page, fila: string): Promise<Locator> {
  const menu = await menuDeLaFila(page, fila)
  await menu.getByRole('menuitem', { name: 'Decimales…' }).click()
  await expect(panel(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=decimales/)
  await expect(page).toHaveURL(new RegExp(`fila=${fila}`))
  return panel(page)
}

// Los radios van con otra piel (`<Opciones>`): se toca la opción por su texto, como en el perfil.
async function elegir(p: Locator, opcion: string): Promise<void> {
  await p
    .getByRole('group', { name: 'Cuántos decimales muestra' })
    .getByText(opcion, { exact: true })
    .click()
  await expect(p.getByRole('radio', { name: opcion, exact: true })).toBeChecked()
}

async function elegirYAplicar(p: Locator, opcion: string): Promise<void> {
  await elegir(p, opcion)
  await p.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(p).toBeHidden()
}

test('E2E un monto en 0 y un porcentaje en 2 desde la planilla: se publican y la hoja los muestra así', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)

  // (1) El monto: «Automático» marcado; el ejemplo pasa de «USD 1.234,57 → USD 1.234,57» a «… → USD 1.235», y el ejemplo y la línea del motivo tienen su
  // alto reservado (cambiar de opción no mueve el pie).
  const p = await abrirLosDecimales(page, 'flete')
  await expect(p).toContainText(/C\d+ · Flete/)
  await expect(p.getByRole('radio', { name: 'Automático' })).toBeChecked()
  const ejemplo = p.locator('[data-ejemplo-de-decimales] [data-monto-valor]')
  await expect(ejemplo).toHaveCount(2)
  await expect(p.locator('[data-ejemplo-de-decimales]')).toHaveCSS('min-height', RESERVADO)
  await expect(p.locator('[data-motivo-de-decimales]')).toHaveCSS('min-height', RESERVADO)
  await elegir(p, '0')
  await expect.poll(async () => sinEspacios(await ejemplo.nth(1).textContent())).toBe('USD 1.235')
  expect(sinEspacios(await ejemplo.nth(0).textContent())).toBe('USD 1.234,57')
  await capturar(page, info, 'panel-de-decimales')
  await p.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(p).toBeHidden()
  await expect(page).not.toHaveURL(/panel=decimales/)

  // (2) El porcentaje, en 2 (puntos: 14,946 % → «14,95 %»).
  await elegirYAplicar(await abrirLosDecimales(page, 'tasa'), '2')

  // (3) Guardar el borrador y publicarlo: la publicada lleva `decimales` en esos dos nodos, y ninguno en el total.
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  await barraDeLaFormula(page).getByRole('button', { name: 'Publicar…', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Decimales por celda')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const decimalesPublicados = () =>
    sql(
      `select coalesce(string_agg((n ->> 'id') || '=' || (n ->> 'decimales'), ',' order by n ->> 'id'), '')
         from public.formulas f, jsonb_array_elements(f.definicion -> 'nodos') n
        where f.origen_id = ${literal(origen.id)}::uuid and f.estado = 'publicada' and n ? 'decimales'`,
    )
  await expect.poll(decimalesPublicados).toBe('flete=0,tasa=2')

  // (4) Al volver, el panel abre con lo elegido.
  await abrirPlanilla(page, origen.id)
  const otraVez = await abrirLosDecimales(page, 'flete')
  await expect(otraVez.getByRole('radio', { name: '0', exact: true })).toBeChecked()
  await otraVez.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(otraVez).toBeHidden()

  // (5) La hoja de cotizar: el flete sin decimales, la tasa con 2 y el total en «Automático» (2, como siempre).
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await esperarElTotal(page)
  const flete = celdaDeLaHoja(page, 'flete').locator('[data-monto-valor]')
  await expect.poll(async () => sinEspacios(await flete.first().textContent())).toBe('USD 1.235')
  await expect(celdaDeLaHoja(page, 'tasa')).toContainText(/14,95\s?%/)
  await expect
    .poll(async () =>
      sinEspacios(await totalDeLaHoja(page).locator('[data-monto-valor]').first().textContent()),
    )
    .toBe('USD 1.234,57')
  await capturar(page, info, 'hoja-con-decimales')

  // (6) Con el Modo Live, el monto de la celda va tapado como cualquier otro.
  const live = page.getByRole('button', { name: 'Modo Live: ocultar los montos' }).first()
  await live.click()
  await expect(page.locator('html')).toHaveClass(/live/)
  await expect(celdaDeLaHoja(page, 'flete').locator('[data-monto-oculto]').first()).toBeVisible()
  await expect(flete.first()).toBeHidden()
  await live.click()
  await expect(page.locator('html')).not.toHaveClass(/live/)
})
