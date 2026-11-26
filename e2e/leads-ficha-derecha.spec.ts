import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { esperarFichaHidratada, irAFicha } from './soporte/leads-ficha'
import {
  oportunidadEn,
  otroEmbudo,
  seguimientosYRecordatorios,
  vehiculosDelLead,
} from './soporte/leads-ficha-derecha'
import { embudoPorDefecto } from './soporte/leads-oportunidades'
import {
  abrirTodos,
  botonMasDelSeguimiento,
  drawerDeTodos,
  modalDeRecordatorio,
  modalDeSeguimiento,
  verTodosLosSeguimientos,
} from './soporte/leads-seguimientos'
import {
  abrirAnteriores,
  botonVincularOMarcar,
  drawerDeAnteriores,
  panelAgregar,
  seccionVehiculos,
} from './soporte/leads-vehiculos'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La columna derecha de la ficha del lead (T344, `docs/UX.md` › «Leads: ficha (estados propios)»): cuatro bloques compactos en orden de uso
// —Seguimiento, Cotizaciones, Vehículos, Oportunidades—, cada uno con una sola acción en su título y lo demás en su «⋯»; los enlaces de
// siempre siguen llegando a lo suyo.
test.describe.configure({ mode: 'serial' })

const BLOQUES = ['Seguimiento', 'Cotizaciones', 'Vehículos', 'Oportunidades'] as const

let duena = ''
let origenDeCotizar = ''
let ana = ''
let lead = ''
let soloCerradas = ''
let porDefecto = ''
let flotas = ''

const marcaDe = (proyecto: string) => `E2E derecha ${proyecto}`

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000)
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  const preparado = await prepararGuardado(proyecto, 'derecha')
  duena = preparado.duena
  origenDeCotizar = preparado.origen.id
  lead = preparado.lead
  seguimientosYRecordatorios(duena, lead)
  porDefecto = (await embudoPorDefecto(duena)).id
  flotas = await otroEmbudo(duena, `Flotas ${proyecto}`)
  const posventa = await otroEmbudo(duena, `Posventa ${proyecto}`)
  const repuestos = await otroEmbudo(duena, `Repuestos ${proyecto}`)
  // La base del alta (abierta, en el embudo por defecto) sale: dos cerradas y cuatro abiertas, una por embudo; la más nueva (la primera que
  // se ve) en «Flotas».
  sql(`delete from public.oportunidades where lead_id = ${literal(lead)}`)
  const de = (embudoId: string, titulo: string, cerrada = false) => {
    oportunidadEn(duena, lead, embudoId, { titulo, cerrada })
  }
  de(porDefecto, 'Ganada antes', true)
  de(porDefecto, 'Ganada después', true)
  de(repuestos, 'Repuestos del lote')
  de(posventa, 'Mantenimiento')
  de(porDefecto, 'Camioneta usada')
  de(flotas, 'Flota de cinco')
  sembrarCotizaciones({
    origenId: preparado.origen.id,
    leadId: lead,
    creadoPor: idDePersona(duena),
    cuantas: 5,
  })
  await vehiculosDelLead(duena, lead, { origenId: preparado.origen.id, marca: marcaDe(proyecto) })
  soloCerradas = await crearLead({
    nombre: `derecha cerradas ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  sql(`delete from public.oportunidades where lead_id = ${literal(soloCerradas)}`)
  oportunidadEn(duena, soloCerradas, flotas, { titulo: 'Ya cerrada', cerrada: true })
  // Ve todos los leads, vehículos y cotizaciones, sin cotizar; el lead no está en su cartera.
  ana = correoDePrueba(`ana-derecha-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Mira', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Mira sin cotizar`, clave: 'e2e_mira_sin_cotizar' },
    permisos: ['leads.ver', 'leads.editar', 'vehiculos.ver', 'cotizaciones.ver'],
  })
})

test.afterAll(async ({}, info) => {
  sql(
    `delete from public.vehiculos where titulo like ${literal(`${marcaDe(info.project.name)} %`)}`,
  )
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const titulo = (page: Page, nombre: string): Locator =>
  page.getByRole('heading', { name: nombre, exact: true, level: 2 })
const region = (page: Page, nombre: string): Locator =>
  page.getByRole('region', { name: nombre, exact: true })

async function abrirLaFicha(page: Page, quien: string, id = lead, consulta = ''): Promise<void> {
  await entrar(page, quien)
  await irAFicha(page, id, consulta)
  await esperarFichaHidratada(page)
}

test('E2E los cuatro bloques en orden de uso, y el índice los nombra y marca al saltar', async ({
  page,
}, info) => {
  await abrirLaFicha(page, duena)
  await expect(indice(page).getByRole('link')).toHaveText([...BLOQUES])
  const alturas: number[] = []
  for (const nombre of BLOQUES) {
    alturas.push(
      await titulo(page, nombre).evaluate((e) => e.getBoundingClientRect().top + scrollY),
    )
  }
  expect(alturas).toEqual([...alturas].sort((a, b) => a - b))
  for (const nombre of BLOQUES) {
    const enlace = indice(page).getByRole('link', { name: nombre })
    await enlace.click()
    await expect(titulo(page, nombre)).toBeFocused()
    await expect(enlace).toHaveAttribute('aria-current', 'location')
    await capturar(page, info, `bloque-${nombre}`)
  }
})

test('E2E «Seguimiento»: un solo «+» que anota o agenda, el recordatorio más próximo arriba y la línea de tiempo', async ({
  page,
}) => {
  await abrirLaFicha(page, duena)
  const bloque = region(page, 'Seguimiento')
  for (const texto of [
    'Seguimientos y recordatorios',
    'Últimos seguimientos',
    'Tus recordatorios',
  ]) {
    await expect(page.getByText(texto, { exact: true })).toHaveCount(0)
  }
  await expect(bloque.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await expect(bloque.getByRole('button', { name: 'Agendar recordatorio' })).toHaveCount(0)
  await expect(botonMasDelSeguimiento(page)).toHaveCount(1)
  // El más próximo, vencido, con «Completar»; uno solo.
  const proximo = bloque.getByRole('region', { name: 'Tus recordatorios' }).getByRole('article')
  await expect(proximo).toHaveCount(1)
  await expect(proximo).toHaveAccessibleName('Confirmar la visita')
  await expect(proximo.getByText('Vencido')).toBeVisible()
  await expect(proximo.getByRole('button', { name: 'Completar' })).toBeVisible()
  await expect(
    bloque.getByRole('region', { name: 'Seguimientos', exact: true }).getByRole('article'),
  ).toHaveCount(3)
  // El «+»: las dos líneas, cada una con su modal por la URL; al cerrarse, el foco vuelve al «+».
  for (const [linea, panel, modal] of [
    ['Anotar seguimiento', 'panel=anotar-seguimiento', modalDeSeguimiento(page, 'Anotar')],
    ['Agendar recordatorio', 'panel=agendar-recordatorio', modalDeRecordatorio(page, 'Agendar')],
  ] as const) {
    await botonMasDelSeguimiento(page).click()
    await expect(page.getByRole('menuitem')).toHaveText([
      'Anotar seguimiento',
      'Agendar recordatorio',
    ])
    await page.getByRole('menuitem', { name: linea }).click()
    await expect(page).toHaveURL(new RegExp(panel))
    await expect(modal).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await expect(botonMasDelSeguimiento(page)).toBeFocused()
  }
  // El «⋯» del bloque abre tus recordatorios; «Ver todos», la línea completa.
  await abrirTodos(page, 'recordatorios')
  await expect(page).toHaveURL(/todos=recordatorios/)
  await page.keyboard.press('Escape')
  await expect(drawerDeTodos(page)).toBeHidden()
  await verTodosLosSeguimientos(page).click()
  await expect(page).toHaveURL(/todos=seguimientos/)
  await expect(drawerDeTodos(page).getByRole('article')).toHaveCount(10)
})

test('E2E «Cotizaciones»: «Cotizar» como «Cotizar lead» y sus cotizaciones en tarjetas (con 5 no hay «Ver más»; con 11, `leads-cotizaciones.spec.ts`)', async ({
  page,
}) => {
  await abrirLaFicha(page, duena)
  const bloque = region(page, 'Cotizaciones')
  // La misma hoja que «Cotizar lead» del «⋯» de la cabecera (`paraCotizar`): este lead en el primer origen donde quien mira cotiza.
  await expect(bloque.getByRole('link', { name: 'Cotizar', exact: true })).toHaveAttribute(
    'href',
    `/cotizaciones/nuevo?origen=${origenDeCotizar}&lead=${lead}`,
  )
  await bloque.scrollIntoViewIfNeeded()
  await expect(
    bloque.getByRole('list', { name: 'Cotizaciones del lead' }).getByRole('article'),
  ).toHaveCount(5)
  await expect(bloque.getByRole('link', { name: 'Ver más' })).toHaveCount(0)
})

test('E2E «Vehículos»: «Vincular o marcar» en el título y los vínculos anteriores en su drawer', async ({
  page,
}) => {
  await abrirLaFicha(page, duena)
  await expect(titulo(page, 'Relacionados')).toHaveCount(0)
  const boton = seccionVehiculos(page).getByRole('button', { name: 'Ver los vínculos anteriores' })
  // En un drawer con su URL: el bloque no cambia de alto y, al cerrarlo, el foco vuelve al botón.
  const antes = await seccionVehiculos(page).boundingBox()
  await expect((await abrirAnteriores(page)).getByRole('listitem')).toHaveCount(1)
  expect((await seccionVehiculos(page).boundingBox())?.height).toBe(antes?.height)
  await page.keyboard.press('Escape')
  await expect(drawerDeAnteriores(page)).toBeHidden()
  await expect(boton).toBeFocused()
  await botonVincularOMarcar(page).click()
  await expect(page).toHaveURL(/panel=agregar-vehiculo/)
  await expect(panelAgregar(page)).toBeVisible()
  // La URL compartida abre los vínculos anteriores.
  await irAFicha(page, lead, '?panel=vinculos-anteriores')
  await expect(drawerDeAnteriores(page).getByRole('listitem')).toHaveCount(1)
})

const tableroDelBloque = (bloque: Locator): Locator =>
  bloque.getByRole('group', { name: /^Etapas de «/ })
const columna = (bloque: Locator, etapa: string): Locator =>
  tableroDelBloque(bloque).getByRole('region', { name: etapa, exact: true })

test('E2E «Oportunidades»: el embudo del lead, una columna por etapa; el selector y su «⋯» con «Ver en el embudo»', async ({
  page,
}, info) => {
  await abrirLaFicha(page, duena)
  const bloque = region(page, 'Oportunidades')
  await bloque.scrollIntoViewIfNeeded()
  await expect(tableroDelBloque(bloque).getByRole('article')).toHaveCount(3)
  await expect(
    columna(bloque, 'Nuevo').getByRole('article', { name: 'Camioneta usada' }),
  ).toBeVisible()
  await expect(columna(bloque, 'Ganado').getByRole('article')).toHaveCount(2)
  await capturar(page, info, 'embudo-del-lead')
  // Otro embudo: sus columnas; «Ver en el embudo» (en el «⋯» del bloque) lleva a ése, filtrado por el lead.
  await bloque.getByRole('button', { name: /^Embudo: / }).click()
  await page.getByRole('menuitemradio', { name: /^Flotas / }).click()
  await expect(
    columna(bloque, 'Nueva').getByRole('article', { name: 'Flota de cinco' }),
  ).toBeVisible()
  await bloque.getByRole('button', { name: 'Más acciones de «Oportunidades»' }).click()
  await page.getByRole('menuitem', { name: 'Ver en el embudo' }).click()
  await expect(page).toHaveURL(new RegExp(`/leads\\?vista=embudo&embudo=${flotas}&lead=${lead}`))
})

test('E2E «Oportunidades» sin oportunidades en el embudo que se ve: lo dice y deja «Nueva» y «Ver en el embudo»', async ({
  page,
}) => {
  await abrirLaFicha(page, duena, soloCerradas)
  const bloque = region(page, 'Oportunidades')
  // Su única oportunidad (cerrada) es de «Flotas»: en ese embudo la ve en su columna; en «Ventas» no tiene ninguna.
  await bloque.getByRole('button', { name: /^Embudo: / }).click()
  await page.getByRole('menuitemradio', { name: 'Ventas', exact: true }).click()
  await expect(bloque.getByText('Sin oportunidades en «Ventas».')).toBeVisible()
  await expect(bloque.getByRole('button', { name: 'Nueva oportunidad' })).toBeVisible()
  await bloque.getByRole('button', { name: 'Más acciones de «Oportunidades»' }).click()
  await page.getByRole('menuitem', { name: 'Ver en el embudo' }).click()
  await expect(page).toHaveURL(new RegExp(`vista=embudo&embudo=${porDefecto}&lead=${soloCerradas}`))
})

test('E2E fuera de la cartera y sin cotizar: se ve y no se edita', async ({ page }) => {
  await abrirLaFicha(page, ana)
  await expect(indice(page).getByRole('link')).toHaveText([
    'Seguimiento',
    'Cotizaciones',
    'Vehículos',
  ])
  await expect(botonMasDelSeguimiento(page)).toHaveCount(0)
  await expect(
    region(page, 'Cotizaciones').getByRole('link', { name: 'Cotizar', exact: true }),
  ).toHaveCount(0)
  await expect(botonVincularOMarcar(page)).toHaveCount(0)
  await expect(region(page, 'Oportunidades')).toHaveCount(0)
  await expect(
    region(page, 'Seguimientos').getByRole('button', { name: /^Más acciones de / }),
  ).toHaveCount(0)
})

test('E2E los enlaces de siempre llegan a lo suyo', async ({ page }) => {
  await abrirLaFicha(page, duena, lead, '?seccion=vehiculos')
  await expect(titulo(page, 'Vehículos')).toBeFocused()
  await expect(titulo(page, 'Vehículos')).toBeInViewport()
  // `#relacionados` sigue siendo el ancla del bloque «Vehículos» (el del índice y los enlaces de siempre).
  await expect(
    page
      .locator('#relacionados')
      .getByRole('heading', { name: 'Vehículos', exact: true, level: 2 }),
  ).toBeAttached()
  await expect(indice(page).getByRole('link', { name: 'Vehículos' })).toHaveAttribute(
    'href',
    '#relacionados',
  )
  await irAFicha(page, lead, '?panel=anotar-seguimiento')
  await expect(modalDeSeguimiento(page, 'Anotar')).toBeVisible()
  await irAFicha(page, lead, '?todos=recordatorios')
  await expect(drawerDeTodos(page)).toBeVisible()
  await irAFicha(page, lead, '?relacionados=interesado')
  await expect(page.getByRole('dialog', { name: 'Interesado · todos' })).toBeVisible()
})

test('E2E sin red: el índice sigue saltando y «Cotizaciones» lo dice', async ({
  page,
  context,
}) => {
  await abrirLaFicha(page, duena)
  await context.setOffline(true)
  await indice(page).getByRole('link', { name: 'Cotizaciones' }).click()
  await expect(titulo(page, 'Cotizaciones')).toBeFocused()
  // Con el código ya cargado, el error sin red es de la lectura (el de las tarjetas): postgrest-js reintenta un GET tres veces (1, 2 y 4 s) antes de devolverlo.
  // Si el bloque aún no se había acercado, es el del límite del bloque o de su código: cualquiera de los tres dice que falló, en su región.
  await expect(
    region(page, 'Cotizaciones').getByText(
      /Sin conexión\. No se pudo abrir esto\.|No pudimos cargar «Cotizaciones»\.|No pudimos cargar las cotizaciones\./,
    ),
  ).toBeVisible({ timeout: 12_000 })
  await context.setOffline(false)
})
