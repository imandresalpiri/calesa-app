import { formatearNumero } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, otraPersona } from './soporte/inventario'
import { idDe } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { esperarFichaHidratada, irAFicha, nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { embudoPorDefecto, enLaBase, etapa, oportunidad } from './soporte/leads-oportunidades'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'

// El bloque «Oportunidades» de la ficha (`?seccion=oportunidades`), el embudo del lead: las de quien mira sobre el lead en una columna por etapa,
// sólo con el lead en la cartera. «Nueva oportunidad» y «Editar» en un panel con su URL, «Mover a…» y
// eliminar con «Deshacer». Nadie más ve las de otra persona, ni la dueña con «todos».
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDeBerta = (corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })

// La ficha llega dibujada antes de que React enganche sus botones: un clic en ese instante se pierde (con la CPU lenta, «Nueva
// oportunidad» no abría nada). Se espera la hidratación antes de tocar.
async function irAOportunidades(page: Parameters<typeof irAFicha>[0], leadId: string) {
  await irAFicha(page, leadId, '?seccion=oportunidades')
  await esperarFichaHidratada(page)
}

const item = (page: Parameters<typeof irAFicha>[0], titulo: string) =>
  aLaVista(page.getByRole('article', { name: titulo }))

// La columna de una etapa del embudo que se ve (`<section>` con el nombre de la etapa).
const columna = (page: Parameters<typeof irAFicha>[0], etapa: string) =>
  page.getByRole('region', { name: 'Oportunidades', exact: true }).getByRole('region', {
    name: etapa,
    exact: true,
  })

// «Mover a» del «⋯» de la tarjeta: un submenú con las etapas de su embudo.
async function moverEnLaFicha(
  page: Parameters<typeof irAFicha>[0],
  titulo: string,
  destino: string,
) {
  await item(page, titulo)
    .getByRole('button', { name: `Más acciones de «${titulo}»` })
    .click()
  await page.getByRole('menuitem', { name: 'Mover a' }).click()
  await page.getByRole('menuitem', { name: destino, exact: true }).click()
}

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('crear desde el panel: lo que falta se dice junto al campo y entra en la etapa inicial', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Crear ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await expect(page.getByText(/^Sin oportunidades/)).toBeVisible()
  await page.getByRole('button', { name: 'Nueva oportunidad' }).click()
  await expect(page).toHaveURL(/panel=nueva-oportunidad/)
  const panel = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  await panel.getByLabel(/Monto estimado/).fill('mucho')
  await panel.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(panel.getByText('El título lleva entre 1 y 120 caracteres.')).toBeVisible()
  await expect(panel.getByText(/Escribe el monto con números/)).toBeVisible()
  const titulo = `Hilux ${info.project.name}`
  await panel.getByLabel('Título').fill(titulo)
  await panel.getByLabel(/Monto estimado/).fill('25.000,50')
  await panel.getByLabel('Notas (opcional)').fill('Quiere financiar')
  await panel.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(item(page, titulo)).toBeVisible()
  // En la columna de la etapa inicial, con el título y el monto (las notas se ven al editarla).
  await expect(columna(page, 'Nuevo').getByRole('article', { name: titulo })).toBeVisible()
  await expect(
    item(page, titulo).locator('[data-monto-valor]', { hasText: /25\.000,50/ }),
  ).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('editar con versión: otra pestaña la cambió y se ofrece «Recargar» sin perder lo escrito', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Editar ${info.project.name}`)
  const titulo = `Editar ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await item(page, titulo)
    .getByRole('button', { name: `Más acciones de «${titulo}»` })
    .click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const panel = page.getByRole('dialog', { name: 'Editar oportunidad' })
  await panel.getByLabel('Título').fill(`${titulo} 2`)
  // Otra pestaña la edita mientras tanto.
  const { error } = await rpcComo(t.personas.berta, 'oportunidad_guardar', {
    p_id: op.id,
    p_actualizado_en_esperado: op.actualizado_en,
    p_cambios: { notas: 'desde otra pestaña' },
  })
  expect(error).toBeNull()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByText(/Cambiaste esta oportunidad .* desde otra ventana/)).toBeVisible()
  await expect(panel.getByLabel('Título')).toHaveValue(`${titulo} 2`)
  await expect(panel.getByRole('button', { name: 'Recargar', exact: true })).toBeVisible()
})

test('mover desde la ficha la pasa a la columna de su etapa (también a una ganada); eliminar ofrece «Deshacer»', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Mover ${info.project.name}`)
  const titulo = `Mover ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await moverEnLaFicha(page, titulo, 'Contactado')
  await expect(columna(page, 'Contactado').getByRole('article', { name: titulo })).toBeVisible()
  await expect(columna(page, 'Nuevo').getByRole('article')).toHaveCount(0)
  await moverEnLaFicha(page, titulo, 'Ganado')
  // Cerrada: queda a la vista, en la columna de las ganadas.
  await expect(columna(page, 'Ganado').getByRole('article', { name: titulo })).toBeVisible()
  await expect.poll(async () => (await enLaBase(op.id))?.estado).toBe('ganada')

  const otra = `Otra ${info.project.name}`
  const nueva = await oportunidad(t.personas.berta, lead.id, { titulo: otra })
  await irAOportunidades(page, lead.id)
  await item(page, otra)
    .getByRole('button', { name: `Más acciones de «${otra}»` })
    .click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(item(page, otra)).toHaveCount(0)
  await expect.poll(async () => (await enLaBase(nueva.id))?.eliminado_en).not.toBeNull()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(item(page, otra)).toBeVisible()
  await expect.poll(async () => (await enLaBase(nueva.id))?.eliminado_en).toBeNull()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('quién la ve: el compartido tiene la sección pero no la de Berta; la dueña con «todos» no tiene la sección', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Op Ver ${info.project.name}`)
  const titulo = `De Berta ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  const { error } = await rpcComo(t.personas.berta, 'lead_compartir', {
    p_lead: lead.id,
    p_usuario: await idDe(t.personas.carlos),
  })
  expect(error).toBeNull()
  await entrar(page, t.personas.carlos)
  await irAOportunidades(page, lead.id)
  await expect(page.getByText(/^Sin oportunidades/)).toBeVisible()
  await expect(page.getByText(titulo)).toHaveCount(0)

  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.duena)
  await irAOportunidades(otra, lead.id)
  await expect(aLaVista(otra.getByRole('link', { name: 'Oportunidades' }))).toHaveCount(0)
  await expect(otra.getByText(titulo)).toHaveCount(0)
  await otra.context().close()
})

test('lo que aporta la ficha con la sección «Oportunidades»', async ({ page }, info) => {
  const lead = await leadDeBerta(`Op Pesa ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  // Una abierta y dos ganadas: el embudo admite una sola abierta por lead.
  for (const n of [1, 2, 3]) {
    await oportunidad(t.personas.berta, lead.id, {
      titulo: `Pesa ${String(n)} ${info.project.name}`,
      monto_estimado: 1000 * n,
      ...(n > 1 ? { etapa_id: etapa(embudo, 'Ganado') } : {}),
    })
  }
  await entrar(page, t.personas.berta)
  const largo = async (ruta: string) =>
    ((await (await page.goto(ruta))?.body())?.length ?? 0) as number
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const base = await largo('/perfil')
  const datos = await largo(`/leads/${lead.id}`)
  const oportunidades = await largo(`/leads/${lead.id}?seccion=oportunidades`)
  const resumen = `«Datos» aporta ${kb(datos - base)} KB · «Oportunidades» aporta ${kb(oportunidades - base)} KB`
  console.warn(`[ficha con oportunidades] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha con oportunidades', description: resumen })
  expect(datos - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(oportunidades - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
})
