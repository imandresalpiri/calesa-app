import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarQueFalta, sembrarQueFalta, type TerrenoDeQueFalta } from './soporte/que-falta'
import { capturar } from './soporte/recorrido'

// Las acciones de «Qué falta» en la página de la unidad: un documento que falta ofrece «Subir» con su tipo y, subido, «Revisar» lleva a aprobarlo mirando el
// archivo hasta «Cumplido»; un dato lleva a su campo; quien no puede ve «Pedirlo» y le da una tarea a quien puede, que la ve en su agenda; y sin poder dar tareas
// dice a quién pedírselo. La regla por tipo y permiso tiene sus pruebas en `entities/`; la lista de quién puede, su prueba SQL.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeQueFalta

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarQueFalta(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-que-falta-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Que Falta',
  })
  terreno = await sembrarQueFalta(proyecto)
})

test.afterAll(async () => {
  await borrarQueFalta(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const destino = (page: Page) => page.locator('[data-destino]').filter({ hasText: terreno.b.nombre })
const requisito = (page: Page, texto: string) =>
  destino(page).locator('[data-requisito]').filter({ hasText: texto })

test('E2E que falta · un documento que falta ofrece «Subir» con su tipo; subido y aprobado pasa a «Cumplido»', async ({
  page,
}, info) => {
  await entrar(page, terreno.recibe.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.uno.id}`)
  const bl = requisito(page, terreno.tipoDeBl.nombre)
  await expect(bl).toHaveAttribute('data-requisito', 'falta')
  await capturar(page, info, 'acciones')
  await bl.getByRole('button', { name: `Subir «${terreno.tipoDeBl.nombre}»` }).click()

  // La subida es un drawer sobre el de Documentos, con el tipo ya elegido.
  const bandeja = page.getByRole('form', { name: 'Subir documentos' })
  await expect(bandeja.getByLabel('Tipo de documento')).toHaveValue(terreno.tipoDeBl.id)
  await capturar(page, info, 'subir-con-el-tipo')
  await bandeja.locator('input[type="file"]:not([capture])').setInputFiles({
    name: 'bl.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 que falta'),
  })
  await bandeja.getByRole('button', { name: 'Subir 1 documento' }).click()

  // Subido, falta aprobarlo. La subida se cierra sola y queda el drawer de Documentos con lo subido; al cerrarlo, «Revisar» lleva al grupo del tipo (no se aprueba sin mirar
  // el archivo).
  const documentos = page.locator('[data-hueco="documentos"]')
  await expect(documentos.getByText('Subido', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(documentos).toBeHidden()
  const revisar = bl.getByRole('button', { name: `Revisar «${terreno.tipoDeBl.nombre}»` })
  await expect(revisar).toBeVisible()
  await revisar.click()
  const grupo = page.locator(`[data-tipo-de-documento-id="${terreno.tipoDeBl.id}"]`)
  await expect(grupo).toBeFocused()
  await grupo.getByRole('button', { name: 'Más acciones de bl.pdf' }).click()
  await page.getByRole('menuitem', { name: 'Aprobar' }).click()
  await expect(grupo.getByText('Aprobado', { exact: true })).toBeVisible()
  await expect.poll(() => bl.getAttribute('data-requisito')).toBe('cumplido')
})

test('E2E que falta · un dato que falta lleva a su campo para completarlo', async ({ page }) => {
  await entrar(page, terreno.recibe.correo)
  await page.goto(`/logistica/vehiculo/${terreno.uno.id}`)
  const contenedor = requisito(page, 'Contenedor')
  await contenedor.getByRole('button', { name: 'Completar «Contenedor»' }).click()
  const hueco = page.locator('[data-hueco="transporte"]')
  const campo = hueco.getByLabel('Contenedor', { exact: true })
  await expect(campo).toBeFocused()
  await campo.fill('ecmu 765432')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(() => contenedor.getAttribute('data-requisito')).toBe('cumplido')
})

test('E2E que falta · quien no puede ve «Pedirlo» y crea una tarea a quien puede, que la ve en su agenda', async ({
  page,
}, info) => {
  await entrar(page, terreno.pide.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.dos.id}`)
  const bl = requisito(page, terreno.tipoDeBl.nombre)
  await expect(bl.getByRole('button', { name: `Subir «${terreno.tipoDeBl.nombre}»` })).toHaveCount(
    0,
  )
  await bl.getByRole('button', { name: `Pedirlo: «${terreno.tipoDeBl.nombre}»` }).click()

  const modal = page.getByRole('dialog', { name: 'Pedírselo a alguien' })
  const titulo = `Falta: ${terreno.tipoDeBl.nombre} aprobado para pasar a «${terreno.b.nombre}»`
  await expect(modal.getByText(titulo)).toBeVisible()
  const quienes = modal.getByRole('radiogroup', { name: 'Quién puede hacerlo' })
  await expect(quienes.getByRole('radio', { name: terreno.recibe.nombre })).toBeVisible()
  await expect(quienes.getByRole('radio', { name: terreno.sinAsignar.nombre })).toHaveCount(0)
  await expect(quienes.getByRole('radio', { name: terreno.pide.nombre })).toHaveCount(0)
  await quienes.getByRole('radio', { name: terreno.recibe.nombre }).check()
  await capturar(page, info, 'pedirlo')
  await modal.getByRole('button', { name: `Pedírselo a ${terreno.recibe.nombre}` }).click()
  await expect(modal).toBeHidden()
  await expect(
    page.getByText(`Se lo pediste a ${terreno.recibe.nombre}: tiene una tarea en su agenda.`),
  ).toBeVisible()

  await expect
    .poll(async () => {
      const { data } = await admin()
        .from('tareas')
        .select('titulo, responsable_id')
        .eq('vehiculo_id', terreno.dos.id)
        .limit(2)
      return data
    })
    .toEqual([{ titulo, responsable_id: terreno.recibe.id }])

  await entrar(page, terreno.recibe.correo)
  await page.goto('/agenda?vista=dia')
  // La tarea pedida no tiene fecha: está en el grupo «Sin fecha» de los pendientes.
  const sinFecha = page
    .getByRole('region', { name: 'Pendientes' })
    .getByRole('region', { name: 'Sin fecha' })
  await expect(sinFecha.getByRole('link', { name: titulo })).toBeVisible()
})

test('E2E que falta · sin poder dar tareas dice a quién pedírselo', async ({ page }) => {
  await entrar(page, terreno.sinAsignar.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.dos.id}`)
  const bl = requisito(page, terreno.tipoDeBl.nombre)
  await expect(bl).toHaveAttribute('data-requisito', 'falta')
  await expect(destino(page).getByRole('button', { name: /^Pedirlo/ })).toHaveCount(0)
  // Puede ir a Documentos a mirar; lo que no puede hacer se lo pide a quien administra los roles (en el «⋯» del requisito).
  await expect(
    bl.getByRole('button', { name: `Ir a Documentos por «${terreno.tipoDeBl.nombre}»` }),
  ).toBeVisible()
  await bl.getByRole('button', { name: `Más acciones de «${terreno.tipoDeBl.nombre}»` }).click()
  await expect(
    page.getByRole('menu').getByText('Pídeselo a quien administra los roles.'),
  ).toBeVisible()
})
