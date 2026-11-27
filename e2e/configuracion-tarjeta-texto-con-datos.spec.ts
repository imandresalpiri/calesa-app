import type { PlantillaEnCuadricula } from '../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { leerElPdf } from './soporte/cotizar-pdf'
import { abrirLaVistaPrevia, dialogo } from './soporte/cotizar-vista-previa'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import {
  abrirElPanel,
  casillaDelLienzo,
  cerrarElPanel,
  sembrarBorradorDePlantilla,
  tarjetaDibujada,
} from './soporte/plantilla'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { copiarLaFormulaDeLaSubasta } from './soporte/tarjeta-cuadricula'

// @sin-celular-archivo: el editor no existe bajo 1.024 px; por debajo, un aviso y la tarjeta en sólo lectura

// El texto con datos de la tarjeta (glosario: «Texto con datos», «Pastilla»; `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): en el editor, una celda de
// texto lleva «Comisión giro » y el porcentaje de la transferencia como pastilla (Retroceso la borra entera, Ctrl+Z la devuelve) y otra «Total: » con el monto
// del total; se publica. Una guardada de ese origen, con `transferencia_pct` = 0,042, lo muestra en la vista previa (con Live, el monto de adentro tapado), en
// el PDF y en la imagen. Un origen propio con una copia de la fórmula v1 de `subasta_usa`, nunca la de la semilla.
test.describe.configure({ mode: 'serial' })

const RAIZ = 'tjtxd_'
const NOMBRE_DE_LA_DUENA = 'Teresa Textos'

// Un título y dos celdas de texto vacías a lo ancho: la de la comisión y la del total.
const PARTIDA: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [
    { id: 'concepto', ancho: 220 },
    { id: 'monto', ancho: 140 },
  ],
  filas: [
    { id: 'f_titulo', alto: 28, ocultar_si: 'nunca' },
    { id: 'f_comision', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_total', alto: 28, ocultar_si: 'nunca' },
  ],
  celdas: [
    {
      id: 'c_titulo',
      fila: 'f_titulo',
      columna: 'concepto',
      abarca_columnas: 2,
      contenido: { tipo: 'texto', texto: 'Cotización' },
    },
    {
      id: 'c_comision',
      fila: 'f_comision',
      columna: 'concepto',
      abarca_columnas: 2,
      contenido: { tipo: 'texto', texto: '' },
    },
    {
      id: 'c_total',
      fila: 'f_total',
      columna: 'concepto',
      abarca_columnas: 2,
      contenido: { tipo: 'texto', texto: '' },
    },
  ],
}

const COMISION = /Comisión giro 4,2\s?%/

let duena = ''
let origen = ''
let guardada = ''

const misOrigenes = () =>
  `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`

function borrarLoDeEsteSpec(): void {
  sql(`
    delete from public.cotizaciones where origen_id in (${misOrigenes()});
    delete from public.origenes where id in (${misOrigenes()})`)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  duena = correoDePrueba(`duena-tjtxd-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE_DE_LA_DUENA })
  origen = (
    await crearOrigenDePrueba(`E2E texto con datos ${proyecto}`, `${RAIZ}${proyecto}`, {
      tipo: 'subasta',
    })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  sembrarCotizaciones({ origenId: origen, creadoPor: idDePersona(duena), cuantas: 1 })
  guardada = sql(`select id from public.cotizaciones where origen_id = ${literal(origen)}::uuid`)
  // La guardada (la referencia del lienzo) con la comisión del giro al 4,2 %.
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set valores = valores || '{"transferencia_pct": 0.042}'::jsonb
     where id = ${literal(guardada)}::uuid;
    commit;`)
  sembrarBorradorDePlantilla(origen, PARTIDA)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarPersonasDePrueba()
})

const panelDe = (page: Page) => page.getByRole('complementary', { name: 'Panel de la tarjeta' })
const campoDelTexto = (page: Page) => panelDe(page).getByRole('textbox', { name: 'Texto' })
const celdaDibujada = (page: Page, id: string) =>
  tarjetaDibujada(page).locator(`[data-celda="${id}"]`)

// Elegir la casilla, tipear en el campo «Texto» del panel y, con «Insertar dato», el nodo de la fórmula que se busca.
async function textoConUnDato(
  page: Page,
  f: number,
  texto: string,
  dato: { buscar: string; nodo: string },
) {
  await casillaDelLienzo(page, f, 0).click()
  await expect(casillaDelLienzo(page, f, 0)).toHaveAttribute('aria-selected', 'true')
  const panel = await abrirElPanel(page, 'Celda')
  await expect(
    panel.getByRole('radiogroup', { name: 'Contenido' }).getByRole('radio', { name: 'Texto' }),
  ).toBeChecked()
  const campo = campoDelTexto(page)
  await campo.click()
  await page.keyboard.type(texto)
  await expect(campo).toHaveText(texto)
  await panel.getByRole('button', { name: 'Insertar dato' }).click()
  const elegir = panel.locator('[data-elegir-dato]')
  await elegir.getByLabel('Buscar un dato').fill(dato.buscar)
  await elegir.getByRole('button', { name: dato.nodo, exact: true }).click()
}

function definicion(estado: 'borrador' | 'publicada'): string {
  return sql(`select coalesce(definicion::text, '') from public.plantillas_tarjeta
    where origen_id = ${literal(origen)}::uuid and estado = ${literal(estado)}`)
}

test('E2E insertar el porcentaje de la transferencia y el total en un texto; borrar y deshacer la pastilla; publicar', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen}/tarjeta`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  const panel = panelDe(page)
  const campo = campoDelTexto(page)

  // «Comisión giro » y la transferencia: se inserta su monto y «Qué mostrar» queda atado a la pastilla hasta «Listo».
  await textoConUnDato(page, 1, 'Comisión giro ', {
    buscar: 'Transferencia',
    nodo: 'Transferencia a USA',
  })
  await expect(panel.getByLabel('Qué mostrar')).toHaveValue('monto')
  await panel.getByLabel('Qué mostrar').selectOption('porcentaje')
  await panel.getByRole('button', { name: 'Listo' }).click()
  await expect(panel.locator('[data-elegir-dato]')).toHaveCount(0)
  const pastilla = campo.locator('[data-parte]')
  await expect(pastilla).toHaveText('% Transferencia a USA')
  await expect(pastilla).toHaveAttribute('aria-label', /^Dato: .*Transferencia a USA/)
  await expect(campo).toBeFocused()
  await expect(panel.getByText('14 de 300')).toBeVisible()
  await expect(celdaDibujada(page, 'c_comision')).toHaveText(COMISION)
  await expect(celdaDibujada(page, 'c_comision')).toHaveAttribute('data-texto-con-datos', '')
  await capturar(page, info, 'texto-con-datos-en-el-editor')

  // Retroceso con el cursor después de la pastilla la borra entera; Ctrl+Z (en el campo) la devuelve.
  await page.keyboard.press('Backspace')
  await expect(pastilla).toHaveCount(0)
  await expect(campo).toHaveText('Comisión giro ')
  await expect(celdaDibujada(page, 'c_comision')).toHaveText(/^Comisión giro\s*$/)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(pastilla).toHaveText('% Transferencia a USA')
  await expect(celdaDibujada(page, 'c_comision')).toHaveText(COMISION)

  // «Total: » y el monto del total: el lienzo lo dibuja con `<Monto>`.
  await textoConUnDato(page, 2, 'Total: ', { buscar: 'total', nodo: 'TOTAL' })
  await panel.getByRole('button', { name: 'Listo' }).click()
  await expect(campo.locator('[data-parte]')).toHaveText('TOTAL')
  await expect(celdaDibujada(page, 'c_total')).toHaveText(/^Total: USD\s/)
  await expect(celdaDibujada(page, 'c_total').locator('[data-monto]')).toHaveCount(1)

  await cerrarElPanel(page)
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect.poll(() => definicion('borrador')).toContain('"partes"')
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: /^Publicar la tarjeta de / })
  await modal.getByLabel('Nota de la versión').fill('Texto con datos')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = JSON.parse(definicion('publicada')) as PlantillaEnCuadricula
  const contenidoDe = (id: string) => publicada.celdas.find((c) => c.id === id)?.contenido
  expect(contenidoDe('c_comision')).toEqual({
    tipo: 'texto',
    partes: ['Comisión giro ', { tipo: 'dato', nodo: 'transferencia', mostrar: 'porcentaje' }],
  })
  expect(contenidoDe('c_total')).toEqual({
    tipo: 'texto',
    partes: ['Total: ', { tipo: 'dato', nodo: 'total', mostrar: 'monto' }],
  })
})

test('E2E la guardada muestra la comisión con su porcentaje en la vista previa, el PDF y la imagen; con Live, el monto de adentro va tapado', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  const t = await abrirLaVistaPrevia(page)
  await expect(t.locator('[data-celda="c_comision"]')).toHaveText(COMISION)
  const total = t.locator('[data-celda="c_total"]')
  await expect(total).toHaveText(/^Total: USD\s/)
  await expect(total.locator('[data-monto-valor]')).toBeVisible()
  await capturar(page, info, 'texto-con-datos-en-la-vista-previa')

  const live = dialogo(page).getByRole('button', { name: 'Modo Live: ocultar los montos' })
  await live.click()
  await expect(page.locator('html')).toHaveClass(/live/)
  await expect(total.locator('[data-monto-oculto]')).toBeVisible()
  await expect(total.locator('[data-monto-valor]')).toBeHidden()
  await expect(t.locator('[data-celda="c_comision"]')).toHaveText(COMISION)
  await live.click()
  await expect(page.locator('html')).not.toHaveClass(/live/)

  const { lineas } = await leerElPdf(page, guardada)
  expect(lineas.join('\n')).toMatch(COMISION)

  const imagen = await page.request.get(`/cotizaciones/${guardada}/imagen`)
  expect(imagen.status()).toBe(200)
  expect(imagen.headers()['content-type']).toMatch(/^image\//)
  await info.attach('imagen-de-la-tarjeta', {
    body: await imagen.body(),
    contentType: imagen.headers()['content-type'] ?? 'image/png',
  })
})
