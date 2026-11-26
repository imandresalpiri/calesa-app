// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { abrirLasVersiones } from './soporte/barra-de-la-formula'
import {
  cerrarLaInformacion,
  informacion,
  marcaDeLaInformacion,
  seccionDeLaInformacion,
} from './soporte/informacion-de-la-formula'
import { enLaPestana, esLaQueRecuerdaLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  borrarOrigenesDeCotizar,
  crearOrigenDeCotizar,
  publicarLaVersionSiguiente,
} from './soporte/cotizar-formula'
import { sembrarBorrador } from './soporte/formula-versiones'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// Publicar el borrador de la fórmula con nota desde la Planilla de un origen (Configuración › Orígenes) (4.20-2b, `docs/UX.md` › «Cotización: fórmula (estados propios)»): por
// `formula_publicar()` con la publicada que se leyó; la nota vacía se rechaza antes de pedir; el PT409 de la base se muestra tal cual (sin «Recargá», 4.20-1) con
// «Recargar»; la URL (`?panel=publicar-formula`) se revisa al llegar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let alDia = { id: '', nombre: '' }
let carrera = { id: '', nombre: '' }
let sinBorrador = { id: '', nombre: '' }
let primera = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-publicar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pía Publica' })
  alDia = await crearOrigenDeCotizar(proyecto, 'pubaldia', true)
  carrera = await crearOrigenDeCotizar(proyecto, 'pubcarrera', true)
  sinBorrador = await crearOrigenDeCotizar(proyecto, 'pubsinb', true)
  primera = await crearOrigenDeCotizar(proyecto, 'pubprimera', false)
  sembrarBorrador(alDia.id, { autor: duena, sobre: 'publicada', conDiseno: true })
  sembrarBorrador(carrera.id, { autor: duena, sobre: 'publicada', conDiseno: true })
  sembrarBorrador(primera.id, { autor: duena, sobre: 'ninguna', conDiseno: true })
  configuradora = correoDePrueba(`configura-publicar-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Configura',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Publica ${proyecto}`, clave: `e2e_publica_${proyecto}` },
    permisos: [alDia, carrera, sinBorrador].map((origen) => ({
      clave: 'cotizaciones.configurar',
      origenId: origen.id,
    })),
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrirFormula(page: Page, origenId: string, resto = '') {
  await abrirLaFormula(page, origenId, 'planilla', resto)
  await enLaPestana(page, 'Planilla')
}

const modal = (page: Page) => page.getByRole('dialog', { name: 'Publicar el borrador' })
const versiones = (page: Page) =>
  page.getByRole('list', { name: 'Versiones de la fórmula' }).getByRole('listitem')

test('quien configura el origen publica su borrador con nota; sin nota no se pide nada', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirFormula(page, alDia.id)
  const acciones: string[] = []
  page.on('request', (pedido) => {
    if (pedido.headers()['next-action'] && !esLaQueRecuerdaLaPestana(pedido)) {
      acciones.push(pedido.url())
    }
  })
  await page.getByRole('button', { name: 'Publicar…' }).click()
  await expect(modal(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=publicar-formula/)
  await modal(page).getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal(page).getByText('Publicar pide una nota.')).toBeVisible()
  expect(acciones).toEqual([])
  await modal(page).getByLabel('Nota').fill('Subo el flete')
  await modal(page).getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Se publicó el borrador.')).toBeVisible()
  await expect(modal(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  const publicada = await seccionDeLaInformacion(page, 'Publicada')
  await expect(publicada).toContainText('Publicada: versión 2')
  await expect(publicada).toContainText('Subo el flete')
  await expect(publicada).toContainText('Cleo Configura')
  await expect(informacion(page).getByRole('region', { name: 'Borrador' })).toHaveCount(0)
  await cerrarLaInformacion(page)
  await abrirLasVersiones(page)
  await expect(versiones(page).first()).toContainText('Versión 2')
  await expect(versiones(page).first()).toContainText('Publicada')
  await expect(versiones(page)).toHaveCount(2)
})

test('si otra persona publicó con el modal abierto, el conflicto dice quién sin «Recargá» y, al recargar, ya no se puede publicar', async ({
  page,
}) => {
  await entrar(page, configuradora)
  await abrirFormula(page, carrera.id)
  await page.getByRole('button', { name: 'Publicar…' }).click()
  await modal(page).getByLabel('Nota').fill('Mi nota')
  publicarLaVersionSiguiente(carrera.id, 7)
  await modal(page).getByRole('button', { name: 'Publicar', exact: true }).click()
  const conflicto = modal(page).getByText(/^Otra persona publicó la versión 2/)
  await expect(conflicto).toBeVisible()
  await expect(conflicto).not.toContainText('Recarg')
  await modal(page).getByRole('button', { name: 'Recargar', exact: true }).click()
  await expect(
    modal(page).getByText(
      'Después de que empezó este borrador se publicó la versión 2: ya no se puede publicar.',
      { exact: false },
    ),
  ).toBeVisible()
  await expect(modal(page).getByLabel('Nota')).toHaveValue('Mi nota')
  await expect(modal(page).getByRole('button', { name: 'Publicar', exact: true })).toBeDisabled()
})

test('la URL no abre publicar sin borrador, y un borrador sin diseño dice por qué no se publica', async ({
  page,
}) => {
  await entrar(page, configuradora)
  await abrirFormula(page, sinBorrador.id, '?panel=publicar-formula')
  await expect(page.getByText('No hay borrador para publicar.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(modal(page)).toHaveCount(0)
  sembrarBorrador(sinBorrador.id, { autor: duena, sobre: 'publicada', conDiseno: false })
  await abrirFormula(page, sinBorrador.id)
  await page.getByRole('button', { name: 'Publicar…' }).click()
  await modal(page).getByLabel('Nota').fill('Sin diseño')
  await modal(page).getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal(page).getByText('Publicar pide el diseño de la hoja.')).toBeVisible()
  await expect(modal(page).getByLabel('Nota')).toHaveValue('Sin diseño')
})

test('en un origen sin publicada, publicar el borrador da la versión 1 y la hoja ya cotiza', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, primera.id)
  // Sin publicada, el botón ⓘ lleva su marca y la sección «Publicada» del modal lo dice.
  await expect(marcaDeLaInformacion(page)).toBeVisible()
  await expect(await seccionDeLaInformacion(page, 'Publicada')).toContainText(
    'todavía no tiene una versión publicada',
  )
  await cerrarLaInformacion(page)
  await page.getByRole('button', { name: 'Publicar…' }).click()
  await modal(page).getByLabel('Nota').fill('La primera')
  await modal(page).getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Se publicó el borrador.')).toBeVisible()
  await expect(marcaDeLaInformacion(page)).toHaveCount(0)
  await expect(await seccionDeLaInformacion(page, 'Publicada')).toContainText(
    'Publicada: versión 1',
  )
  await page.goto(`/cotizaciones/nuevo?origen=${primera.id}`)
  await expect(page.locator('[data-nodo]').first()).toBeVisible()
  await expect(page.getByText('Falta publicar la fórmula')).toHaveCount(0)
})
