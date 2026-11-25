import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  RELLENO,
  borrarTerrenoDeSubasta,
  guardarVistaVieja,
  sembrarTerrenoDeSubasta,
  titulosDeSubasta,
  type TerrenoDeSubasta,
  type TituloDeSubasta,
} from './soporte/filtro-de-subasta'
import { aLaVista, cerrarPanelDeFiltros, panelDeFiltros, vehiculo } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { vistasDe } from './soporte/vehiculos'
import { abrirVistaYOpciones } from './soporte/vista-y-opciones'

// «Subasta» y «Fase», los filtros del inventario (docs/UX.md › «Vehículos»): «Subasta» es una a la vez (cuándo cierra, las vivas, sin resolver o no ganadas) y sólo
// existe en un origen de subasta, con el orden «Cierre más próximo» (el de siempre cuando «Subasta» tiene valor); «Fase» son las fases del origen y «Sin fase».
// Viven en la URL, se guardan en una vista y el atajo «Sin resolver» pone su filtro. La equivalencia de las dos copias
// de cada condición la ata `vehiculos-inventario-postgrest.spec.ts`; el plan, `db:medir:volumen`. Terreno propio por SQL de servicio, borrado al empezar y al terminar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let correo = ''
let terreno: TerrenoDeSubasta

// Sin filtrar: todo menos la no ganada (y el relleno, que no se mira acá).
const SIN_FILTRAR: TituloDeSubasta[] = [
  'vivaHoy',
  'enSubasta',
  'vivaSinFecha',
  'sinResolverNueva',
  'sinResolverVieja',
  'comprado',
  'sinFase',
]

// Lo que se ve en la lista: cada título del terreno, visible o no.
async function exigirLista(page: Page, visibles: TituloDeSubasta[]): Promise<void> {
  const t = titulosDeSubasta(proyecto)
  for (const [clave, titulo] of Object.entries(t)) {
    const lugar = vehiculo(page, titulo)
    if (visibles.includes(clave as TituloDeSubasta)) {
      await expect(lugar).toBeVisible()
    } else {
      await expect(lugar).toBeHidden()
    }
  }
}

const filas = (page: Page) => aLaVista(page.locator('tbody tr, li article'))

// Los títulos del terreno en el orden de la lista (cada fila nombra uno; el relleno también cuenta).
async function ordenDeLaLista(page: Page): Promise<string[]> {
  const textos = await filas(page).allInnerTexts()
  const t = Object.values(titulosDeSubasta(proyecto))
  const relleno = new RegExp(`E2E Relleno \\d+ ${proyecto}`)
  return textos.map(
    (texto) => t.find((titulo) => texto.includes(titulo)) ?? relleno.exec(texto)?.[0] ?? texto,
  )
}

const irA = async (page: Page, consulta = '') =>
  page.goto(`/vehiculos?origen=${terreno.origen}${consulta}`)

const chips = (page: Page) => page.getByRole('list', { name: 'Filtros activos' })

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  correo = correoDePrueba(`duena-filtro-situacion-${proyecto}`)
  await borrarTerrenoDeSubasta(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({ email: correo, contrasena: CONTRASENA, nombre: 'Dalia Filtro' })
  terreno = await sembrarTerrenoDeSubasta(proyecto)
})

test.afterAll(async () => {
  await borrarTerrenoDeSubasta(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E subasta filtro · el panel tiene «Subasta» (una a la vez) y «Fase» (varias), y se combinan con otro filtro', async ({
  page,
}, info) => {
  await entrar(page, correo, { fresco: true })
  await irA(page)
  await exigirLista(page, SIN_FILTRAR)
  let panel = await panelDeFiltros(page)
  const subasta = panel.getByRole('group', { name: 'Subasta' })
  const fase = panel.getByRole('group', { name: 'Fase' })
  await expect(subasta.getByRole('radio', { name: 'Cualquiera' })).toBeChecked()
  for (const nombre of [
    'Cierra hoy',
    'Cierra en 48 h',
    'Cierra esta semana',
    'Todas las vivas',
    'Sin resolver',
    'No ganadas',
  ]) {
    await expect(subasta.getByRole('radio', { name: nombre })).toBeVisible()
  }
  for (const nombre of ['En subasta', 'Comprado', 'Sin fase']) {
    await expect(fase.getByRole('checkbox', { name: nombre })).toBeVisible()
  }
  // «En subasta» es la fase y nada más: el filtro de la subasta dice «Todas las vivas».
  await expect(panel.getByText('En subasta', { exact: true })).toHaveCount(1)
  await expect(panel.getByRole('group', { name: 'Orden' })).toBeVisible()

  await subasta.getByRole('radio', { name: 'Sin resolver' }).check()
  await capturar(page, info, 'panel-de-subasta')
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/subasta=sin_resolver/)
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await expect(chips(page).getByText('Subasta: Sin resolver')).toBeVisible()

  // Con el año: sólo la de 2020 en adelante.
  panel = await panelDeFiltros(page)
  await panel.getByRole('spinbutton', { name: 'Año, desde' }).fill('2018')
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/anio\.min=2018/)
  await exigirLista(page, ['sinResolverNueva'])
})

test('E2E subasta filtro · cada valor de «Subasta» y de «Fase» trae lo suyo', async ({ page }) => {
  await entrar(page, correo)
  await irA(page, '&subasta=hoy')
  await exigirLista(page, ['vivaHoy'])
  // Las vivas por el cierre más próximo: la de hoy, la de dentro de 5 días y, al final, la que no tiene fecha.
  await irA(page, '&subasta=vivas')
  await exigirLista(page, ['vivaHoy', 'enSubasta', 'vivaSinFecha'])
  const t = titulosDeSubasta(proyecto)
  expect(await ordenDeLaLista(page)).toEqual([t.vivaHoy, t.enSubasta, t.vivaSinFecha])
  await irA(page, '&subasta=semana')
  await exigirLista(page, ['vivaHoy', ...cierraEstaSemana()])
  await irA(page, '&subasta=sin_resolver')
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await irA(page, '&subasta=no_ganadas')
  await exigirLista(page, ['noGanada'])
  await expect(chips(page).getByText('Subasta: No ganadas')).toBeVisible()

  await irA(page, '&fase=ninguna')
  await exigirLista(page, ['sinFase'])
  await irA(page, `&fase=${terreno.fases.comprado}`)
  await exigirLista(page, ['comprado'])
  // La fase de la subasta es una columna: trae todo lo que está en ella, viva o no (sin la no ganada, que se pide aparte).
  await irA(page, `&fase=${terreno.fases.enSubasta}`)
  await exigirLista(page, [
    'vivaHoy',
    'enSubasta',
    'vivaSinFecha',
    'sinResolverNueva',
    'sinResolverVieja',
  ])
  // Las dos a la vez se suman como cualquier filtro.
  await irA(page, `&subasta=sin_resolver&fase=${terreno.fases.enSubasta},ninguna`)
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
})

// La de dentro de 5 días cierra esta semana sólo si la semana (lunes a domingo, en La Paz) llega hasta ahí.
function cierraEstaSemana(): TituloDeSubasta[] {
  const enLaPaz = new Date(Date.now() - 4 * 3_600_000)
  const dia = enLaPaz.getUTCDay()
  const hastaElLunes = dia === 0 ? 1 : 8 - dia
  return hastaElLunes > 5 ? ['enSubasta'] : []
}

test('E2E subasta filtro · «Cierre más próximo» ordena por tramos y pagina sin repetir', async ({
  page,
}) => {
  await entrar(page, correo)
  await irA(page, '&orden=cierre&por=10')
  await expect(chips(page).getByText('Orden: Cierre más próximo')).toBeVisible()
  await expect(page.getByText('Cierre más próximo primero')).toBeVisible()
  const t = titulosDeSubasta(proyecto)
  await expect(filas(page)).toHaveCount(10)
  const primera = await ordenDeLaLista(page)
  // Primero las vivas por su cierre, después la viva sin fecha y después el resto por alta.
  expect(primera.slice(0, 3)).toEqual([t.vivaHoy, t.enSubasta, t.vivaSinFecha])

  const paginas = page.getByRole('navigation', { name: 'Páginas' })
  await aLaVista(paginas.getByRole('link', { name: 'Siguiente' })).click()
  await expect(page).toHaveURL(/cursor=2(~|%7E)/)
  // Siete «sin filtrar» (sin la no ganada) más el relleno: las que faltan, sin repetir ninguna.
  await expect(filas(page)).toHaveCount(SIN_FILTRAR.length + RELLENO - 10)
  const segunda = await ordenDeLaLista(page)
  expect(segunda.filter((titulo) => primera.includes(titulo))).toEqual([])
  const volver = aLaVista(page.getByRole('link', { name: 'Volver al principio' }))
  await expect(volver).toBeVisible()

  await aLaVista(paginas.getByRole('link', { name: 'Anterior' })).click()
  await expect(filas(page)).toHaveCount(10)
  expect(await ordenDeLaLista(page)).toEqual(primera)

  await aLaVista(paginas.getByRole('link', { name: 'Siguiente' })).click()
  await expect(page).toHaveURL(/cursor=/)
  await aLaVista(page.getByRole('link', { name: 'Volver al principio' })).click()
  await expect(page).not.toHaveURL(/cursor=/)
  await expect(page.getByText('Cierre más próximo primero')).toBeVisible()
})

test('E2E subasta filtro · una vista guardada vuelve a poner «Subasta», y una vieja se lee traducida', async ({
  page,
}) => {
  await entrar(page, correo)
  await irA(page, '&subasta=no_ganadas&anio.min=2018')
  await exigirLista(page, ['noGanada'])
  await abrirVistaYOpciones(page)
  await page.getByLabel('Guardar los filtros de ahora').fill('Las que perdimos')
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText('Vista «Las que perdimos» guardada')).toBeVisible()
  expect(await vistasDe(correo)).toEqual([
    {
      nombre: 'Las que perdimos',
      params: { origen: terreno.origen, subasta: 'no_ganadas', 'anio.min': '2018' },
    },
  ])

  // La que guardó el filtro de antes: se aplica con las claves nuevas y es «la de ahora».
  await guardarVistaVieja(correo, 'Perdidas de antes', {
    origen: terreno.origen,
    situacion: 'no_ganada',
  })
  await page.goto(`/vehiculos?origen=${terreno.otro}`)
  await abrirVistaYOpciones(page)
  await page.getByRole('button', { name: 'Perdidas de antes', exact: true }).click()
  await expect(page).toHaveURL(/subasta=no_ganadas/)
  await expect(page).not.toHaveURL(/situacion=/)
  await exigirLista(page, ['noGanada'])
  await expect(chips(page).getByText('Subasta: No ganadas')).toBeVisible()
  await abrirVistaYOpciones(page)
  const actual = page.getByRole('button', { name: /^Perdidas de antes/ })
  await expect(actual).toHaveAttribute('aria-current', 'true')
  await expect(actual).toContainText('la de ahora')
})

test('E2E subasta filtro · el atajo «Sin resolver» cuenta, pone «Subasta» y se quita', async ({
  page,
}, info) => {
  await entrar(page, correo)
  await irA(page)
  const atajo = aLaVista(page.getByRole('button', { name: /^Sin resolver/ }))
  await expect(atajo).toContainText('2')
  await expect(atajo).toHaveAttribute('aria-pressed', 'false')
  await atajo.click()
  await expect(page).toHaveURL(/subasta=sin_resolver/)
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await expect(atajo).toHaveAttribute('aria-pressed', 'true')
  await capturar(page, info, 'atajo-puesto')
  await atajo.click()
  await expect(page).not.toHaveURL(/subasta=/)
  await exigirLista(page, SIN_FILTRAR)
})

test('E2E subasta filtro · un origen manual no tiene «Subasta», ni «Orden», ni el atajo', async ({
  page,
}) => {
  await entrar(page, correo)
  await page.goto(`/vehiculos?origen=${terreno.otro}`)
  await expect(page.getByRole('link', { name: `E2E Otro origen ${proyecto}` })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(aLaVista(page.getByRole('button', { name: /^Sin resolver/ }))).toHaveCount(0)
  const panel = await panelDeFiltros(page)
  await expect(panel.getByRole('spinbutton', { name: 'Año, desde' })).toBeVisible()
  await expect(panel.getByRole('group', { name: 'Subasta' })).toHaveCount(0)
  await expect(panel.getByRole('group', { name: 'Orden' })).toHaveCount(0)
})

test('E2E subasta filtro · sin resultados ofrece «Limpiar filtros»', async ({ page }) => {
  await entrar(page, correo)
  await irA(page, '&subasta=hoy&q=NadaSeLlamaAsi')
  await expect(filas(page)).toHaveCount(0)
  await aLaVista(page.getByRole('button', { name: 'Limpiar filtros' })).click()
  await expect(page).not.toHaveURL(/subasta=/)
  await exigirLista(page, SIN_FILTRAR)
})
