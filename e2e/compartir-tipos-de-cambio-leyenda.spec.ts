import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  esperarEdicionApagada,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'

// La leyenda de los tipos de cambio compartidos (Configuración › Empresa › Monedas y tipos de cambio, `/configuracion/empresa/monedas`): se escribe en el modal
// de «Al compartir» con `empresa.tipos_cambio.gestionar`, con su tope de 120 y su conflicto de versión; sin el permiso, «Editar» se ve apagado con su motivo. La empresa es una
// fila única: se guarda cómo estaba y se deja así al terminar.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const LEYENDA = 'Valores referenciales de hoy'

let duena = ''
let ajustista = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-leyenda-${proyecto}`)
  ajustista = correoDePrueba(`ajustista-leyenda-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Leyenda' })
  // Gestiona los ajustes de la empresa, no los tipos de cambio: ve Monedas con el campo apagado.
  await crearPersona({
    email: ajustista,
    contrasena: CLAVE,
    nombre: 'Aldo Ajustes',
    invitada: true,
  })
  await darRolDePrueba({
    email: ajustista,
    rol: { nombre: `${PREFIJO_ROL_E2E}Ajustes ${proyecto}`, clave: `e2e_ajustes_ley_${proyecto}` },
    permisos: ['empresa.ajustes.gestionar'],
  })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// «Editar» de la tarjeta «Al compartir» abre el modal de la leyenda.
const editar = (page: Page) =>
  page
    .getByRole('region', { name: 'Al compartir', exact: true })
    .getByRole('button', { name: 'Editar la leyenda', exact: true })

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

test('la empresa escribe la leyenda y el campo cuenta sus caracteres', async ({ page }, info) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  await expect(page.getByRole('region', { name: 'Al compartir', exact: true })).toContainText(
    'Sin leyenda',
  )
  await editar(page).click()
  const modal = page.getByRole('dialog', { name: 'Al compartir' })
  const campo = modal.getByLabel('Leyenda', { exact: true })
  await expect(campo).toBeEnabled()
  await expect(modal.getByText('0 de 120. Vacía, no se muestra.')).toBeVisible()

  // Pasada del tope: se dice junto al campo y no se guarda (sin `maxLength`: el tope no corta lo que se pega).
  await campo.fill('x'.repeat(121))
  await expect(modal.getByText('121 de 120.')).toBeVisible()
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText('La leyenda admite hasta 120 caracteres.')).toBeVisible()
  await capturar(page, info, 'leyenda-pasada')

  await campo.fill(LEYENDA)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Leyenda guardada')).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(page.getByRole('region', { name: 'Al compartir', exact: true })).toContainText(
    LEYENDA,
  )
  await capturar(page, info, 'leyenda-guardada')
})

test('dos versiones de la fila dan el conflicto y lo escrito queda', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  await editar(page).click()
  const modal = page.getByRole('dialog', { name: 'Al compartir' })
  const campo = modal.getByLabel('Leyenda', { exact: true })
  await expect(campo).toHaveValue(LEYENDA)
  // Otra persona guarda la fila mientras esta pantalla sigue abierta.
  const { error } = await admin()
    .from('ajustes_empresa')
    .update({ leyenda_tipos_cambio: 'La de otra persona' })
    .eq('id', 1)
  expect(error).toBeNull()
  await campo.fill('Mi leyenda tardía')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    modal.getByText('Otra persona cambió los ajustes de la empresa mientras los editabas.'),
  ).toBeVisible()
  await expect(campo).toHaveValue('Mi leyenda tardía')
  // Se deja la leyenda de prueba para los que siguen.
  const vuelta = await admin()
    .from('ajustes_empresa')
    .update({ leyenda_tipos_cambio: LEYENDA })
    .eq('id', 1)
  expect(vuelta.error).toBeNull()
})

test('sin permiso para los tipos de cambio «Editar» está apagado y el motivo a la vista', async ({
  page,
}) => {
  await entrar(page, ajustista)
  await page.goto('/configuracion/empresa/monedas')
  await esperarEdicionApagada(page, 'Al compartir', 'Editar la leyenda…')
  await expect(
    page
      .getByText(
        'Puedes ver las monedas y los tipos de cambio, pero no tienes permiso para cambiarlos.',
      )
      .first(),
  ).toBeVisible()
  // Un `?panel=` a mano no abre el modal: se avisa y se limpia.
  await page.goto('/configuracion/empresa/monedas?panel=leyenda')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL('/configuracion/empresa/monedas')
})
