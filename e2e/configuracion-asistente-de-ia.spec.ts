// @sin-celular-archivo: Configuración › Empresa › Integraciones se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { randomBytes } from 'node:crypto'
import { ATAJOS_POR_DEFECTO } from '../src/modules/empresa/entities/asistente-ia/config'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  contarUnUso,
  dejarElAsistenteComoEnLaMigracion,
  levantarServidorFalso,
  PREFIJO_DE_CLAVE_INVALIDA,
  type ServidorFalso,
} from './soporte/asistente-ia'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { otraPersona } from './soporte/inventario'

// La tarjeta «Asistente de IA» de Configuración › Empresa › Integraciones: el proveedor contra un servidor falso que levanta el spec, la
// clave (que no vuelve), el interruptor, «Probar conexión» con su error y su acción, los atajos y el contador del mes. La fila es global:
// corre en serie y la deja como en la migración antes y después. Generar y reescribir no tienen interfaz todavía: su recorrido lo prueban
// `proveedor.test.ts` y `generar-texto.test.ts` contra un servidor HTTP real.

test.describe.configure({ mode: 'serial' })

const NOMBRE_DE_LA_DUENA = 'Irene Asistente'
const MODELO = 'modelo-e2e'
const ATAJO = ATAJOS_POR_DEFECTO.find((a) => a.nombre === 'Más corto')

let servidor: ServidorFalso
let duena = ''
let sinAjustes = ''

test.beforeAll(async ({}, info) => {
  servidor = await levantarServidorFalso()
  dejarElAsistenteComoEnLaMigracion()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-asistente-${info.project.name}`)
  sinAjustes = correoDePrueba(`cambista-asistente-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE_DE_LA_DUENA })
  // Entra a Empresa (gestiona los tipos de cambio) pero no edita sus ajustes.
  await crearPersona({
    email: sinAjustes,
    contrasena: CONTRASENA,
    nombre: 'Carla Cambios',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinAjustes,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Cambios asistente ${info.project.name}`,
      clave: `e2e_cambios_asistente_${info.project.name}`,
    },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
})

test.afterAll(async () => {
  dejarElAsistenteComoEnLaMigracion()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await servidor.cerrar()
})

function tarjeta(page: Page) {
  return page.getByRole('region', { name: 'Asistente de IA', exact: true })
}

async function elegirDelMenu(page: Page, accion: string) {
  await tarjeta(page).getByRole('button', { name: 'Más acciones de Asistente de IA' }).click()
  await page.getByRole('menuitem', { name: accion }).click()
}

// DeepSeek llena la dirección y el modelo; «Otro proveedor» los deja escribir: se guarda el servidor falso.
async function configurarElProveedor(page: Page) {
  await tarjeta(page)
    .getByRole('button', { name: 'Configurar el asistente de IA', exact: true })
    .click()
  const configurar = page.getByRole('dialog', { name: 'Configurar el asistente de IA' })
  const proveedor = configurar.getByLabel('Proveedor', { exact: true })
  await proveedor.selectOption({ label: 'Otro proveedor' })
  await configurar.getByLabel('Dirección base').fill('https://otro.ejemplo.com/v1')
  await proveedor.selectOption({ label: 'DeepSeek' })
  await expect(configurar.getByText('https://api.deepseek.com', { exact: true })).toBeVisible()
  await expect(configurar.getByText('deepseek-chat', { exact: true })).toBeVisible()
  await proveedor.selectOption({ label: 'Otro proveedor' })
  await configurar.getByLabel('Dirección base').fill(servidor.urlBase)
  await configurar.getByLabel('Modelo', { exact: true }).fill(MODELO)
  await configurar.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Proveedor del asistente guardado')).toBeVisible()
  await expect(configurar).toBeHidden()
}

// Un solo pedido, `POST <url_base>/chat/completions` con la clave en la cabecera, el modelo y los topes.
function comprobarElPedido(clave: string) {
  expect(servidor.pedidos).toHaveLength(1)
  expect(servidor.pedidos[0]).toMatchObject({
    metodo: 'POST',
    ruta: '/v1/chat/completions',
    cabeceras: { authorization: `Bearer ${clave}` },
    cuerpo: {
      model: MODELO,
      max_tokens: expect.any(Number),
      temperature: expect.any(Number),
    },
  })
}

// Un atajo editado se guarda con el prompt base y sigue ahí al recargar.
async function editarUnAtajo(page: Page, id: string) {
  await elegirDelMenu(page, 'Editar el prompt base y los atajos…')
  const indicaciones = page.getByRole('dialog', { name: 'Prompt base y atajos' })
  const nombre = indicaciones.locator(`#atajo-${id}-nombre`)
  const instruccion = indicaciones.locator(`#atajo-${id}-instruccion`)
  await nombre.fill('Más breve')
  await instruccion.fill('Resume en dos frases.')
  await indicaciones.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Prompt base y atajos guardados')).toBeVisible()
  await expect(indicaciones).toBeHidden()
  await page.reload()
  await elegirDelMenu(page, 'Editar el prompt base y los atajos…')
  await expect(nombre).toHaveValue('Más breve')
  await expect(instruccion).toHaveValue('Resume en dos frases.')
  await page.keyboard.press('Escape')
  await expect(indicaciones).toBeHidden()
}

async function guardarLaClave(page: Page, titulo: string, etiqueta: string, clave: string) {
  const modal = page.getByRole('dialog', { name: titulo })
  await modal.getByLabel(etiqueta, { exact: true }).fill(clave)
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Clave del asistente guardada')).toBeVisible()
  await expect(modal).toBeHidden()
}

test('E2E escritorio · configurar el proveedor, cargar la clave, encender y probar el asistente de IA', async ({
  page,
}) => {
  if (!ATAJO) throw new Error('Falta el atajo «Más corto» de fábrica.')
  const clave = `sk-e2e-${randomBytes(8).toString('hex')}`
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa/integraciones')
  const asistente = tarjeta(page)
  const activa = asistente.getByRole('switch', { name: 'Activa' })

  // 1. De fábrica: apagado, sin clave y sin poder encenderlo.
  await expect(asistente.getByText('Falta la clave', { exact: true }).first()).toBeVisible()
  await expect(activa).toBeDisabled()
  await expect(asistente.getByText('Carga la clave para activarlo.')).toBeVisible()

  // 2. El proveedor.
  await configurarElProveedor(page)
  await expect(asistente.getByText(servidor.urlBase, { exact: true })).toBeVisible()
  await expect(asistente.getByText(MODELO, { exact: true })).toBeVisible()

  // 3. La clave entra una vez: de ella se ven la fecha y sus últimos 4, nunca el resto.
  await elegirDelMenu(page, 'Cargar la clave')
  await guardarLaClave(page, 'Cargar la clave', 'Clave', clave)
  await expect(asistente.getByText(`termina en ····${clave.slice(-4)}`)).toBeVisible()
  expect(await page.content()).not.toContain(clave)

  // 4. Con clave, se enciende.
  await expect(activa).toBeEnabled()
  await activa.click()
  await expect(page.getByText('Asistente de IA activado')).toBeVisible()
  await expect(activa).toBeChecked()

  // 5. «Probar conexión»: la respuesta reemplaza a la pista (el lugar reservado lo fija `tarjetas-de-integraciones.test.tsx`: un spec sin
  // celular no mide cajas).
  await expect(
    asistente.getByText('Prueba la conexión desde el «⋯»', { exact: false }),
  ).toBeVisible()
  await elegirDelMenu(page, 'Probar conexión')
  await expect(asistente.getByText(`Respondió el modelo ${MODELO}.`)).toBeVisible()
  expect(await page.content()).not.toContain(clave)
  comprobarElPedido(clave)

  // 6. Un atajo.
  await editarUnAtajo(page, ATAJO.id)

  // 7. Con una clave que el proveedor rechaza, la prueba lo dice y ofrece reemplazarla.
  await elegirDelMenu(page, 'Reemplazar la clave')
  await guardarLaClave(
    page,
    'Reemplazar la clave',
    'Clave nueva',
    `${PREFIJO_DE_CLAVE_INVALIDA}-${randomBytes(4).toString('hex')}`,
  )
  await elegirDelMenu(page, 'Probar conexión')
  const error = asistente
    .getByRole('alert')
    .filter({ hasText: 'La clave del asistente no es válida.' })
  await expect(error).toBeVisible()
  await expect(error.getByRole('button', { name: 'Reemplazar la clave' })).toBeVisible()

  // 8. El contador: dos usos de la dueña este mes.
  contarUnUso(duena)
  contarUnUso(duena)
  await page.reload()
  await expect(
    asistente.getByRole('list', { name: 'Usos de este mes' }).getByRole('listitem'),
  ).toHaveText([`${NOMBRE_DE_LA_DUENA}·2`])
})

test('E2E escritorio · sin el permiso de ajustes, el panel del asistente de IA no se abre', async ({
  page,
  browser,
}) => {
  await page.goto('/ingreso')
  const suya = await otraPersona(browser, page)
  await entrar(suya, sinAjustes, { fresco: true })
  await suya.goto('/configuracion/empresa/integraciones?panel=asistente-ia')
  await expect(tarjeta(suya)).toBeVisible()
  await expect(suya.getByRole('dialog')).toBeHidden()
  await expect(suya).toHaveURL('/configuracion/empresa/integraciones')
  await expect(
    tarjeta(suya).getByRole('button', { name: 'Configurar el asistente de IA', exact: true }),
  ).toHaveCount(0)
  await suya.context().close()
})
