import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDePersona } from './soporte/leads-alta'
import { meterSeguimiento, nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { panelDeFiltros, cerrarPanelDeFiltros } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { sql } from './soporte/sql'

// El filtro «Sin seguimiento» del listado de leads (`?sin_seguimiento=si`) y el «Ver todos» de «Leads sin seguimiento» de Inicio que lo abre. Es la misma
// definición que el bloque: sin ningún seguimiento y creado hace más de 24 horas. Un lead con un seguimiento, o creado hace menos, no aparece.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const VIEJO = 'SS Viejo'
const CON_SEGUIMIENTO = 'SS Con seguimiento'
const RECIENTE = 'SS Reciente'

const envejecer = (patron: string) =>
  sql(
    `update public.leads set creado_en = now() - interval '2 days' where nombre like 'E2E ${patron}%'`,
  )

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  for (const corto of [VIEJO, CON_SEGUIMIENTO, RECIENTE]) {
    await nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })
  }
  envejecer(VIEJO)
  envejecer(CON_SEGUIMIENTO)
  const [conSeguimiento] = sql(
    `select id from public.leads where nombre = 'E2E ${CON_SEGUIMIENTO}' limit 1`,
  ).split('\n')
  await meterSeguimiento(conSeguimiento ?? '', await idDePersona(t.personas.berta))
  // El seguimiento de arriba lo deja con fecha de hoy: el lead sigue siendo viejo, pero ya no está sin seguimiento.
})

test.afterAll(async () => {
  sql(`delete from public.leads where nombre like 'E2E SS %'`)
  await limpiarListado(t)
})

test('el filtro trae sólo a los viejos sin seguimiento, con su chip con «×»', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?sin_seguimiento=si')
  await expect(fila(page, VIEJO)).toBeVisible()
  await expect(fila(page, CON_SEGUIMIENTO)).toHaveCount(0)
  await expect(fila(page, RECIENTE)).toHaveCount(0)
  await capturar(page, info, 'listado-filtrado')

  const chip = page.getByRole('button', { name: /^Quitar el filtro Sin seguimiento/ })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page).not.toHaveURL(/sin_seguimiento/)
  await expect(fila(page, VIEJO)).toBeVisible()
  await expect(fila(page, CON_SEGUIMIENTO)).toBeVisible()
  await expect(fila(page, RECIENTE)).toBeVisible()
})

test('se elige desde el panel de filtros del listado', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const panel = await panelDeFiltros(page)
  await panel.getByRole('group', { name: 'Sin seguimiento' }).getByLabel('Sí').check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/sin_seguimiento=si/)
  await expect(fila(page, VIEJO)).toBeVisible()
  await expect(fila(page, RECIENTE)).toHaveCount(0)
})

test('«Ver todos» de Inicio llega a la lista filtrada cuando el bloque está en su tope', async ({
  page,
}, info) => {
  // Cinco más: con el viejo de arriba son seis, uno más que el tope del bloque.
  for (let i = 1; i <= 5; i += 1) {
    await nuevoLead({
      corto: `SS Tope ${String(i)} ${info.project.name}`,
      telefono: completoCon(t, nacional()),
      deQuien: t.personas.berta,
    })
  }
  envejecer('SS Tope')
  await entrar(page, t.personas.berta)
  await page.goto('/')
  const bloque = page.getByRole('region', { name: 'Leads sin seguimiento' })
  await expect(bloque).toBeVisible()
  await capturar(page, info, 'inicio-en-el-tope')
  await bloque.getByRole('link', { name: 'Ver todos' }).click()
  await expect(page).toHaveURL(/\/leads\?sin_seguimiento=si/)
  await expect(fila(page, VIEJO)).toBeVisible()
  await expect(fila(page, RECIENTE)).toHaveCount(0)
})
