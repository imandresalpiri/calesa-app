import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { esperarFichaHidratada, irAFicha, nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  GENERAR,
  dialogoDeOtorgar,
  fijarDireccionDeLaWeb,
  limpiarPortal,
  nombreDeLaEmpresa,
  prepararPortal,
  seccionPortal,
  type TerrenoDelPortal,
} from './soporte/leads-portal'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en el celular (.claude/rules/e2e.md › «Pruebas: sólo lo clave»)

// Las plantillas por empresa (9.04-5) contra la app compilada y el Supabase local: la dueña cambia el mensaje del portal y, al darle
// acceso a un lead, el texto para WhatsApp es el nuevo; la plantilla del embudo se guarda y se restablece. Que el embudo nuevo nazca con
// la plantilla lo prueba `supabase/tests/areas/plantillas/plantillas.sql`. Al terminar, `ajustes_leads` vuelve a lo de fábrica (un solo
// worker: los demás specs ven el texto y las etapas de fábrica).
test.describe.configure({ mode: 'serial' })

const PROPIO =
  'Hola {cliente}, entra a {direccion} con el código {codigo} y la clave {clave}. — {empresa}'

let t: TerrenoDelPortal

async function aLoDeFabrica() {
  const { error } = await admin()
    .from('ajustes_leads')
    .update({ embudo_etapas: null, portal_mensaje: null })
    .eq('id', 1)
  exigir(error, 'volver los ajustes de leads a lo de fábrica')
}

test.beforeAll(async ({}, info) => {
  await aLoDeFabrica()
  t = await prepararPortal(info.project.name)
  await fijarDireccionDeLaWeb(null)
})

test.afterAll(async () => {
  await aLoDeFabrica()
  await limpiarPortal(t)
})

const irA = async (page: Page) => {
  await entrar(page, t.personas.duena)
  await page.goto('/configuracion/leads')
}

const tarjeta = (page: Page, titulo: string) =>
  page.getByRole('region', { name: titulo, exact: true })

async function abrirModal(page: Page, titulo: string, dialogo: string) {
  await tarjeta(page, titulo)
    .getByRole('button', { name: `Editar ${titulo}`, exact: true })
    .click()
  const modal = page.getByRole('dialog', { name: dialogo, exact: true })
  await expect(modal).toBeVisible()
  return modal
}

test('la dueña cambia el mensaje del portal con el editor de variables', async ({ page }) => {
  const empresa = await nombreDeLaEmpresa()
  await irA(page)
  const tarjetaDelPortal = tarjeta(page, 'Mensaje del portal')
  // Parte del de fábrica: la tarjeta lo dice y «Restablecer» no tiene qué hacer.
  await expect(tarjetaDelPortal).toContainText('De fábrica')
  const modal = await abrirModal(page, 'Mensaje del portal', 'Mensaje del portal')
  const campo = modal.getByLabel('Texto para WhatsApp')
  await expect(campo).toHaveValue(/^Hola, \{cliente\}\.\n/)

  // Los botones insertan la variable donde está el cursor y una desconocida se avisa al escribirla.
  await campo.fill('Hola , bienvenido.')
  await campo.press('Control+Home')
  for (let i = 0; i < 5; i++) await campo.press('ArrowRight')
  await modal.getByRole('button', { name: /^Insertar Cliente/ }).click()
  await expect(campo).toHaveValue('Hola {cliente}, bienvenido.')
  await campo.fill('Hola {foo}')
  await expect(modal.getByText(/^\{foo\} no es una variable de este texto\./)).toBeVisible()

  // Sin {codigo} y {clave} el motivo sale junto al campo y no se guarda.
  await campo.fill('Hola {cliente}, tu código es {codigo}.')
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(
    modal.getByText(
      'El mensaje tiene que llevar {codigo} y {clave}: sin ellos el cliente no puede entrar.',
    ),
  ).toBeVisible()

  await campo.fill(PROPIO)
  await expect(modal.getByRole('group', { name: 'Vista previa' })).toHaveText(
    `Hola Ana Pérez, entra a la web de ${empresa} con el código EJM-4F2K9 y la clave K7M2Q9XWPR. — ${empresa}`,
  )
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Mensaje del portal guardado.')).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(tarjetaDelPortal).not.toContainText('De fábrica')
  await expect(tarjetaDelPortal.getByText(/entra a/)).toBeVisible()
})

test('al dar acceso, el texto para WhatsApp sale del mensaje de la empresa', async ({
  page,
}, info) => {
  const empresa = await nombreDeLaEmpresa()
  // Pía da acceso a un lead suyo, con el mensaje que guardó la dueña en la prueba de arriba.
  const lead = await nuevoLead({
    corto: `Plantilla ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.pia.email,
  })
  await entrar(page, t.pia.email)
  await irAFicha(page, lead.id, '?seccion=portal')
  await esperarFichaHidratada(page)
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  await dialogoDeOtorgar(page).getByRole('button', { name: GENERAR }).click()
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const codigo = (await listo.getByLabel(/^Código:/).textContent()) ?? ''
  const clave = (await listo.getByLabel('Clave temporal').textContent()) ?? ''
  expect(codigo).not.toBe('')
  await expect(listo.getByLabel('Texto para WhatsApp')).toHaveText(
    `Hola ${lead.nombre}, entra a la web de ${empresa} con el código ${codigo} y la clave ${clave}. — ${empresa}`,
  )
})

test('la plantilla del embudo se guarda y se restablece', async ({ page }) => {
  await irA(page)
  const tarjetaDelEmbudo = tarjeta(page, 'Embudo')
  await expect(tarjetaDelEmbudo).toContainText('De fábrica')
  await expect(tarjetaDelEmbudo).toContainText('Contactado')

  const modal = await abrirModal(page, 'Embudo', 'Plantilla del embudo')
  await modal.getByLabel('Nombre de la etapa 2').fill('Llamado')
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Plantilla del embudo guardada.')).toBeVisible()
  await expect(modal).toBeHidden()
  await page.reload()
  await expect(tarjetaDelEmbudo).toContainText('Llamado')
  await expect(tarjetaDelEmbudo).not.toContainText('De fábrica')

  await page.getByRole('button', { name: 'Más acciones de Embudo' }).click()
  await page.getByRole('menuitem', { name: 'Restablecer' }).click()
  await expect(page).toHaveURL(/panel=restablecer-embudo/)
  const dialogo = page.getByRole('dialog', { name: 'Restablecer la plantilla del embudo' })
  await dialogo.getByRole('button', { name: 'Restablecer' }).click()
  await expect(page.getByText('La plantilla volvió a las etapas de fábrica.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(tarjetaDelEmbudo).toContainText('Contactado')
  await expect(tarjetaDelEmbudo).toContainText('De fábrica')
})
