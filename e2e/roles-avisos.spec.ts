import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { CLAVE, entrar, esMovil } from './soporte/inventario'
import { literal, sql } from './soporte/sql'

// Los avisos de la matriz de Roles no se dibujan en línea: un «!» junto al nombre de cada rol que los tiene (en el celular, en la barra «Rol a la vista») y
// otro junto al título abren un modal por URL (`?panel=avisos&rol=`, `?panel=avisos`). Un rol sin avisos no lleva botón.
test.describe.configure({ mode: 'serial' })

const MOTIVO_NO_DOMINADO =
  'Este rol tiene permisos que tú no tienes: no puedes cambiarlo ni asignarlo.'
const AVISO_CON_PERMISO = 'Cada cambio se guarda solo.'
const AVISO_SIN_PERMISO = 'Para cambiarlo hace falta el permiso de gestionar roles.'

let proyecto = ''
let duena = ''
let gestora = ''
let lectora = ''
let dueno = ''
const rolVacio = () => `${PREFIJO_ROL_E2E}Vacío ${proyecto}`
const rolPoderoso = () => `${PREFIJO_ROL_E2E}Poderoso ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-roles-avisos-${proyecto}`)
  gestora = correoDePrueba(`gestora-roles-avisos-${proyecto}`)
  lectora = correoDePrueba(`lectora-roles-avisos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Avisos' })
  await crearPersona({ email: gestora, contrasena: CLAVE, nombre: 'Gema Avisos', invitada: true })
  await darRolDePrueba({
    email: gestora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Gestiona ${proyecto}`,
      clave: `e2e_avisos_gestiona_${proyecto}`,
    },
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
  })
  await crearPersona({ email: lectora, contrasena: CLAVE, nombre: 'Lola Avisos', invitada: true })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lee ${proyecto}`, clave: `e2e_avisos_lee_${proyecto}` },
    permisos: ['equipo.roles.ver'],
  })
  sql(`
    insert into public.roles (nombre, clave) values (${literal(rolVacio())}, ${literal(`e2e_avisos_vacio_${proyecto}`)});
    with r as (insert into public.roles (nombre, clave) values (${literal(rolPoderoso())}, ${literal(`e2e_avisos_poderoso_${proyecto}`)}) returning id)
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      select id, 'leads.ver', null, 'todos' from r;
  `)
  dueno = sql(`select nombre from public.roles where clave = 'dueno'`)
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Abre la matriz con el rol dado a la vista (en el celular se elige en «Rol a la vista»; en escritorio las columnas están todas).
async function abrirMatriz(page: Page, rolAVer?: string, consulta = '') {
  await page.goto(`/configuracion/roles${consulta}`)
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  if (rolAVer && esMovil(page) && !consulta) {
    await page.getByLabel('Rol a la vista').selectOption({ label: rolAVer })
  }
}

const botonDe = (page: Page, nombre: string) =>
  page.getByRole('button', { name: `Avisos de ${nombre}`, exact: true })
const modalDe = (page: Page, titulo: string) => page.getByRole('dialog', { name: titulo })

test('sin avisos en línea: ni bajo el título ni bajo el nombre de un rol; el «!» de la página los trae', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirMatriz(page)
  await expect(page.getByText(AVISO_CON_PERMISO)).toHaveCount(0)
  await expect(page.getByText(MOTIVO_NO_DOMINADO)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Roles y permisos', level: 1 })).toHaveText(
    'Roles y permisos',
  )
  await botonDe(page, 'Roles y permisos').click()
  const modal = modalDe(page, 'Avisos de Roles y permisos')
  await expect(modal).toBeVisible()
  await expect(modal.getByText(AVISO_CON_PERMISO)).toBeVisible()
  await expect(page).toHaveURL(/panel=avisos-de-la-pagina/)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
})

test('un rol sin avisos no tiene botón; el de sistema avisa que no se elimina', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirMatriz(page, rolVacio())
  await expect(botonDe(page, rolVacio())).toHaveCount(0)
  await abrirMatriz(page, dueno)
  await botonDe(page, dueno).click()
  await expect(
    modalDe(page, `Avisos de ${dueno}`).getByText('Un rol de sistema no se elimina.'),
  ).toBeVisible()
})

test('quien no domina un rol lo ve en su «!»: con cantidad, por URL, con teclado y el foco vuelve', async ({
  page,
}) => {
  await entrar(page, gestora)
  await abrirMatriz(page, rolPoderoso())
  await expect(page.getByText(MOTIVO_NO_DOMINADO)).toHaveCount(0)

  const boton = botonDe(page, rolPoderoso())
  // Con teclado: foco al «!», Enter abre, Esc cierra y el foco vuelve.
  await boton.focus()
  await page.keyboard.press('Enter')
  const modal = modalDe(page, `Avisos de ${rolPoderoso()}`)
  await expect(modal.getByText(MOTIVO_NO_DOMINADO)).toBeVisible()
  await expect(page).toHaveURL(/panel=avisos/)
  await expect(page).toHaveURL(/rol=/)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(boton).toBeFocused()
  await expect(page).not.toHaveURL(/panel=/)
  if (!esMovil(page)) {
    // En escritorio `rol` no cambia nada a la vista: se quita con el modal. En el celular es el rol a la vista y se queda.
    await expect(page).not.toHaveURL(/rol=/)
  }

  // El de sistema que no domina: dos avisos y la cantidad en el nombre.
  await abrirMatriz(page, dueno)
  await botonDe(page, `${dueno} (2)`).click()
  const delDueno = modalDe(page, `Avisos de ${dueno}`)
  await expect(delDueno.getByRole('listitem')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(delDueno).toHaveCount(0)
})

test('la URL abre el modal al recargar: el de un rol y el de la página; un rol que no existe no abre nada', async ({
  page,
}) => {
  await entrar(page, gestora)
  const id = sql(`select id from public.roles where nombre = ${literal(rolPoderoso())}`)
  await abrirMatriz(page, undefined, `?panel=avisos&rol=${id}`)
  await expect(modalDe(page, `Avisos de ${rolPoderoso()}`)).toBeVisible()
  await page.reload()
  await expect(
    modalDe(page, `Avisos de ${rolPoderoso()}`).getByText(MOTIVO_NO_DOMINADO),
  ).toBeVisible()

  await abrirMatriz(page, undefined, '?panel=avisos')
  await expect(
    modalDe(page, 'Avisos de Roles y permisos').getByText(AVISO_CON_PERMISO),
  ).toBeVisible()

  await abrirMatriz(page, undefined, '?panel=avisos&rol=00000000-0000-4000-8000-000000000000')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
})

test('quien sólo ve roles: la página explica por qué no cambia nada y ningún rol lleva «!»', async ({
  page,
}) => {
  await entrar(page, lectora)
  await abrirMatriz(page)
  await expect(page.getByText(AVISO_SIN_PERMISO)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Avisos de E2E/ })).toHaveCount(0)
  await botonDe(page, 'Roles y permisos').click()
  await expect(
    modalDe(page, 'Avisos de Roles y permisos').getByText(AVISO_SIN_PERMISO),
  ).toBeVisible()
})
