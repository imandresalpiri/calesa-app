import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearPersona } from './soporte/base'
import { abrirElCampo, abrirElMenu } from './soporte/editor-de-campos'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import {
  PREFIJO_DE_ORIGEN_E2E,
  borrarOrigenesDePrueba,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import { irAFicha } from './soporte/leads-ficha'
import { sql } from './soporte/sql'
import {
  aLaVistaAlAcomodarse,
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  textoGrandeAlCargar,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'

// Las capturas de la sesión de defectos al 200 % (`E2E_CAPTURAS=e2e-capturas/defectos-200/{antes,despues}`): cada pantalla de Configuración,
// el menú de cada persona del equipo, la matriz de Roles, el interruptor, el selector de iconos desplazado y la ficha de un lead con el
// origen inactivo, al 100 % y al 200 %. Sin asserts: lo que se puede afirmar vive en `configuracion-200`, `interruptor-200` y `equipo`; este
// recorre y deja las imágenes para juzgar mirando, y tiene que poder correr contra el código de antes del arreglo.
test.describe.configure({ mode: 'serial' })

const LARGO =
  'Subasta internacional de vehículos livianos y pesados de Norteamérica y del Asia oriental'
const PERSONA_LARGA = 'Maria de los Angeles Fernandez de Cordoba y Sanchez de la Vega'

let r: TerrenoDelRecorrido
let origen = { id: '', nombre: '' }
let tabla = ''

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'D200')
  origen = await crearOrigenDePrueba(LARGO, `largo_capturas_${info.project.name}`)
  // Una tabla de referencia del origen, para su panel «Columnas».
  tabla = sql(`
    insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
    values ('${origen.id}', 'fletes_por_puerto', 'Fletes por puerto de destino',
            '[{"clave":"puerto","etiqueta":"Puerto","tipo":"texto"},{"clave":"anio","etiqueta":"Año","tipo":"anio"},{"clave":"monto","etiqueta":"Monto en dólares","tipo":"numero"}]')
    returning id`)
  await crearPersona({
    email: correoDePrueba(`una-persona-con-un-correo-muy-largo-del-equipo-${info.project.name}`),
    contrasena: 'una-clave-de-prueba-9',
    nombre: PERSONA_LARGA,
    invitada: true,
  })
  // Un lead cuyo origen está inactivo y tiene icono: lo que arregló 8d0285d (el nombre y «(inactivo)» de corrido).
  // La base no deja asignar un origen ya apagado: se asigna activo y después se apaga.
  const inactivo = await sembrarOrigen(`${PREFIJO_DE_ORIGEN_E2E} inactivo ${info.project.name}`)
  sql(`
    update public.origenes_lead set icono = 'compartir' where id = '${inactivo.id}';
    update public.leads set origen_lead_id = '${inactivo.id}' where id = '${r.uno.id}';
    update public.origenes_lead set activo = false where id = '${inactivo.id}';
  `)
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
  await borrarOrigenesDePrueba()
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
})

const PANTALLAS = [
  ['hub', () => '/configuracion/inicio'],
  ['empresa-datos', () => '/configuracion/empresa'],
  ['empresa-monedas', () => '/configuracion/empresa/monedas'],
  ['empresa-integraciones', () => '/configuracion/empresa/integraciones'],
  ['empresa-comprobantes', () => '/configuracion/empresa/comprobantes'],
  ['origenes', () => '/configuracion/origenes'],
  ['origen-datos', () => `/configuracion/origenes/${origen.id}/campos?panel=datos`],
  ['origen-campos', () => `/configuracion/origenes/${origen.id}/campos`],
  ['origen-categorias', () => `/configuracion/origenes/${origen.id}/categorias`],
  ['origen-fases', () => `/configuracion/origenes/${origen.id}/fases`],
  ['origen-planilla', () => urlDeLaFormula(origen.id, 'planilla')],
  ['origen-hoja', () => urlDeLaFormula(origen.id, 'hoja')],
  ['origen-tarjeta', () => urlDeLaFormula(origen.id, 'tarjeta')],
  ['origen-tablas', () => `/configuracion/origenes/${origen.id}/planilla?panel=tablas`],
  [
    'origen-tablas-nueva',
    () => `/configuracion/origenes/${origen.id}/planilla?panel=tablas&accion=nueva-tabla`,
  ],
  [
    'origen-tablas-columnas',
    () =>
      `/configuracion/origenes/${origen.id}/planilla?panel=tablas&tabla=${tabla}&accion=columnas-de-tabla`,
  ],
  ['leads-campos', () => '/configuracion/leads/campos'],
  ['leads-tarjetas', () => '/configuracion/leads'],
  ['leads-origenes', () => '/configuracion/leads?panel=origenes'],
  ['leads-seguimientos', () => '/configuracion/leads?panel=seguimientos'],
  ['leads-mensaje-del-portal', () => '/configuracion/leads?panel=portal'],
  ['origenes-colores', () => '/configuracion/origenes?panel=colores'],
  ['origenes-vigencia', () => '/configuracion/origenes?panel=vigencia'],
  ['catalogos-puertos', () => `/configuracion/origenes/${origen.id}/fases?panel=puertos`],
  ['catalogos-navieras', () => `/configuracion/origenes/${origen.id}/fases?panel=navieras`],
  [
    'catalogos-categorias',
    () => `/configuracion/origenes/${origen.id}/fases?panel=categorias-de-gasto`,
  ],
  [
    'catalogos-tipos-de-documento',
    () => `/configuracion/origenes/${origen.id}/fases?panel=tipos-de-documento`,
  ],
  ['repuestos-flujo', () => '/repuestos/configuracion/flujo'],
  ['repuestos-catalogos', () => '/repuestos/configuracion/catalogos'],
  ['repuestos-cotizador', () => '/repuestos/configuracion/cotizador'],
  ['equipo', () => '/configuracion/equipo'],
  ['roles', () => '/configuracion/roles'],
] as const

// Al 100 % sólo lo que cambia: el resto no se mueve.
const AL_CIEN = new Set([
  'empresa-monedas',
  'empresa-integraciones',
  'origen-datos',
  'origen-campos',
  'leads-campos',
  'origen-tablas-nueva',
  'origen-tablas-columnas',
  'equipo',
  'roles',
])

// El editor de campos del origen con su código cargado (las asas), el «⋯» de un campo y su panel abierto tocando la fila.
async function editorDeCampos(page: Page, info: Parameters<typeof capturar>[1], zoom: string) {
  await page.goto(`/configuracion/origenes/${origen.id}/campos`)
  await expect(page.getByRole('button', { name: 'Mover «Color»', exact: true })).toBeVisible()
  await abrirElMenu(page, 'Color')
  await capturar(page, info, `campos-menu-${zoom}`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await abrirElCampo(page, 'Color')
  await capturar(page, info, `campos-panel-${zoom}`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
}

async function selectorDeIconos(page: Page, info: Parameters<typeof capturar>[1], zoom: string) {
  await page.goto('/configuracion/leads?panel=seguimientos')
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
  await expect(modal).toBeVisible()
  await capturar(page, info, `selector-de-iconos-arriba-${zoom}`)
  // El cuerpo del modal es lo que se desplaza: su pie queda fijo.
  await modal.evaluate((m) => {
    const cuerpo = [...m.querySelectorAll<HTMLElement>('*')].find(
      (e) => getComputedStyle(e).overflowY === 'auto' && e.scrollHeight > e.clientHeight,
    )
    if (cuerpo) cuerpo.scrollTop = cuerpo.scrollHeight
  })
  await capturar(page, info, `selector-de-iconos-abajo-${zoom}`)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
}

for (const zoom of ['100', '200'] as const) {
  test(`Configuración y sus pantallas al ${zoom} %`, async ({ page }, info) => {
    // Recorre cada pantalla de Configuración (las seis pestañas del origen y los paneles de sus tablas): al 200 % pasa de los 30 s de siempre.
    test.setTimeout(90_000)
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page, r.t.personas.duena)
    for (const [nombre, url] of PANTALLAS) {
      if (zoom === '100' && !AL_CIEN.has(nombre)) continue
      await page.goto(url())
      // Con un panel abierto por la URL, la página queda detrás con `aria-hidden`: el título se mira igual.
      await expect(
        page.getByRole('heading', { level: 1, includeHidden: url().includes('panel=') }),
      ).toBeVisible()
      // Un panel por la URL (las tablas de referencia): se captura abierto; con `accion=`, el de la tabla va encima del drawer «Tablas».
      if (url().includes('panel=')) await expect(page.getByRole('dialog').last()).toBeVisible()
      // La barra de secciones se desplaza hasta la abierta recién al hidratar: se captura con ella ya a la vista.
      if ((await page.getByRole('tablist').count()) > 0) {
        await aLaVistaAlAcomodarse(
          page.getByRole('tab', { selected: true }).first(),
          `la pestaña abierta de «${nombre}»`,
        )
      }
      await capturar(page, info, `${nombre}-${zoom}`)
      if (nombre === 'equipo') {
        await page
          .getByRole('button', { name: /^(Acciones sobre|Más acciones de) / })
          .first()
          .click()
        await expect(page.getByRole('menu')).toBeVisible()
        await capturar(page, info, `equipo-menu-${zoom}`)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('menu')).toBeHidden()
      }
      if (nombre === 'roles') {
        // La fila con un interruptor de cerca y, en escritorio, la tabla desplazada hasta el final.
        const turnos = page.locator('[data-permiso="web.cola.participar"]')
        await turnos.scrollIntoViewIfNeeded()
        await capturar(page, info, `roles-turnos-${zoom}`)
        await page.evaluate(() => {
          for (const e of document.querySelectorAll<HTMLElement>('*')) {
            if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto') {
              e.scrollLeft = e.scrollWidth
            }
          }
        })
        await turnos.scrollIntoViewIfNeeded()
        await capturar(page, info, `roles-desplazada-${zoom}`)
      }
    }
    await editorDeCampos(page, info, zoom)
    await selectorDeIconos(page, info, zoom)
    // c.3: la ficha de un lead con el origen inactivo y su icono.
    await irAFicha(page, r.uno.id)
    await expect(page.getByRole('heading', { name: r.uno.nombre, level: 1 })).toBeVisible()
    await expect(page.getByText('(inactivo)').first()).toBeVisible()
    await capturar(page, info, `ficha-con-origen-inactivo-${zoom}`)
  })
}
