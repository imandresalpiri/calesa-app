import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead, type LeadDePrueba } from './soporte/leads-ficha'
import {
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDelLead } from './soporte/leads-marcas'
import { irAlEmbudo, oportunidad, tarjeta, verEtapa } from './soporte/leads-oportunidades'
import { meterRecordatorio, modalDeRecordatorio } from './soporte/leads-seguimientos'
import { capturar } from './soporte/recorrido'

// La lista de leads lleva a la ficha (T340, `docs/UX.md` › «Leads: listado (estados propios)»): la fila, la tarjeta y la tarjeta del kanban son
// un enlace a `/leads/<id>` (el nombre es el `<a>`; el resto navega igual, sin recargar), Ctrl abre otra pestaña y lo propio de la fila (el «⋯»,
// «Recordatorio») hace lo suyo. El clic
// en una celda, el enlace de un campo, el teclado y el 200 %, en `leads-listado-patron.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/t340`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let lead: LeadDePrueba
let corto: string
let recordatorioId: string

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  corto = `Sin resumen ${info.project.name}`
  lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  recordatorioId = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: await idDe(t.personas.berta),
    titulo: 'Llamar por el sedán',
    recordarEn: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const ficha = () => `/leads/${lead.id}`
const tituloDeLaFicha = (page: Page) => page.getByRole('heading', { name: lead.nombre, level: 1 })

// Una marca en `window`: si la navegación recargara la página, se perdería.
async function marcarLaPagina(page: Page) {
  await page.evaluate(() => {
    ;(window as unknown as { sinRecargar?: boolean }).sinRecargar = true
  })
}
const sigueSinRecargar = (page: Page) =>
  page.evaluate(() => (window as unknown as { sinRecargar?: boolean }).sinRecargar === true)

test('E2E un clic en la fila (tabla) o en la tarjeta (celular) lleva a la ficha, sin recargar', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // El nombre es un enlace de verdad a la ficha, con el nombre del lead (sin «Abrir» delante).
  await expect(
    delLead(page, corto).getByRole('link', {
      name: lead.nombre,
      exact: true,
    }),
  ).toHaveAttribute('href', ficha())
  await capturar(page, info, 'lista')
  await marcarLaPagina(page)
  // La esquina de la fila o la tarjeta: ni el nombre ni una acción.
  await delLead(page, corto)
    .first()
    .click({ position: { x: 6, y: 6 } })
  await expect(page).toHaveURL(new RegExp(`${ficha()}$`))
  await expect(tituloDeLaFicha(page)).toBeVisible()
  expect(await sigueSinRecargar(page)).toBe(true)
  await capturar(page, info, 'ficha-desde-la-lista')
})

// @sin-celular: el clic con Ctrl y el botón del medio del ratón no existen en una pantalla táctil
test('E2E Ctrl+clic en la fila abre la ficha en otra pestaña y la lista se queda', async ({
  page,
  context,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const otra = context.waitForEvent('page')
  await delLead(page, corto)
    .first()
    .click({ position: { x: 6, y: 6 }, modifiers: ['ControlOrMeta'] })
  const pestana = await otra
  await expect(pestana).toHaveURL(new RegExp(`${ficha()}$`))
  await pestana.close()
  await expect(page).toHaveURL(/\/leads$/)
})

test('E2E el «⋯» y «Recordatorio» de la fila hacen lo suyo, no llevan a la ficha', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const menu = await abrirMenuDelLead(page, lead.nombre)
  await expect(menu.getByRole('menuitem', { name: 'Anotar seguimiento…' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(/\/leads$/)

  // «Recordatorio» lo abre en la ficha, sobre ese recordatorio (su enlace, no el de la fila).
  await delLead(page, corto).first().locator('[data-recordatorio-de-fila]').click()
  await expect(page).toHaveURL(
    new RegExp(`${ficha()}\\?.*panel=editar-recordatorio.*recordatorio=${recordatorioId}`),
  )
  await expect(modalDeRecordatorio(page, 'Editar')).toBeVisible()
})

test('E2E en el kanban, un clic en la tarjeta lleva a las oportunidades del lead; «Mover a…» y el «⋯» no', async ({
  page,
}, info) => {
  const titulo = `Kanban sin resumen ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  const laTarjeta = tarjeta(page, titulo)
  await expect(laTarjeta).toBeVisible()
  await capturar(page, info, 'kanban')

  await laTarjeta.getByRole('button', { name: `Mover «${titulo}» a otra etapa` }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(page).toHaveURL(/vista=embudo/)

  const menu = await abrirMenuDelLead(page, lead.nombre)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(/vista=embudo/)

  await marcarLaPagina(page)
  await laTarjeta.getByRole('heading', { name: titulo }).click()
  await expect(page).toHaveURL(new RegExp(`${ficha()}\\?seccion=oportunidades$`))
  await expect(tituloDeLaFicha(page)).toBeVisible()
  expect(await sigueSinRecargar(page)).toBe(true)
})
