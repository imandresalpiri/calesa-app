// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { alternarActivo, filaDeCatalogo, nombreDeLaFila } from './soporte/lista-de-catalogo'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { drawerDe, origenPorClave, urlDelCatalogo } from './soporte/catalogos-en-fases'

// Los catálogos de logística en los drawers de la pestaña Fases de un origen (`docs/UX.md` › «Catálogos de logística (drawer)»): quien tiene
// `logistica.catalogos.gestionar` crea, renombra y desactiva una categoría «Sólo de <origen>» (no se eliminan) y su repetida se rechaza junto al nombre;
// crea una naviera, la ve en la oferta de transporte del flujo de ese origen y la desactiva; crea un puerto con país y código y su repetido se rechaza. La
// asesora de la semilla no abre el origen. Lo de la prueba se limpia por su nombre. La barra, «Para», tapar y los permisos los prueba
// `configuracion-fases-catalogos*.spec.ts`.
test.describe.configure({ mode: 'serial' })

let duena = ''
const NOMBRE = 'Maniobras e2e'
const NAVIERA = 'Naviera e2e 6.08'
const PUERTO = 'Puerto e2e 6.08'
const limpiarCatalogos = () => {
  sql(`delete from categorias_gasto where nombre like ${literal(`${NOMBRE}%`)}`)
  sql(
    `delete from flujos_transporte_oferta where naviera_id in (select id from navieras where nombre like ${literal('Naviera e2e 6.08%')})`,
  )
  sql(`delete from navieras where nombre like ${literal('Naviera e2e 6.08%')}`)
  sql(`delete from puertos where nombre like ${literal('Puerto e2e 6.08%')}`)
}
let asesora = ''
const a = () => origenPorClave('subasta_usa')

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conf-logistica-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logística' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  limpiarCatalogos()
})

test.afterAll(async () => {
  limpiarCatalogos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien gestiona los catálogos abre cada drawer desde arriba del diagrama y por la URL', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${a().id}/fases`)
  const catalogos = page.getByRole('group', { name: 'Catálogos' })
  await catalogos.getByRole('button', { name: 'Categorías de gasto' }).click()
  await expect(page).toHaveURL(/panel=categorias-de-gasto/)
  const drawer = drawerDe(page, 'Categorías de gasto')
  await expect(drawer.getByRole('button', { name: 'Nueva categoría' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  // El drawer y su modal se abren por la URL.
  await page.goto(urlDelCatalogo(a().id, 'puertos', '&accion=nuevo-puerto'))
  await expect(page.getByRole('dialog', { name: 'Nuevo puerto' })).toBeVisible()
})

test('crear, renombrar y desactivar una categoría de gasto «Sólo de» el origen', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'categorias-de-gasto'))
  const drawer = drawerDe(page, 'Categorías de gasto')
  const nueva = page.getByRole('dialog', { name: 'Nueva categoría' })

  await drawer.getByRole('button', { name: 'Nueva categoría' }).click()
  await nueva.getByLabel('Nombre').fill(NOMBRE)
  await nueva.getByLabel('Propósito').selectOption({ label: 'Otro' })
  await nueva.getByLabel('Orden').fill('90')
  await nueva.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(nueva).toBeHidden()
  const fila = filaDeCatalogo(page, NOMBRE)
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Otro')).toBeVisible()

  // Un nombre repetido lo dice la base junto al campo y no crea nada.
  await drawer.getByRole('button', { name: 'Nueva categoría' }).click()
  await nueva.getByLabel('Nombre').fill(NOMBRE)
  await nueva.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(nueva.getByText(`Ya hay una categoría «${NOMBRE}» en ${a().nombre}.`)).toBeVisible()
  // Con algo escrito, cancelar pregunta antes de tirarlo.
  await nueva.getByRole('button', { name: 'Cancelar' }).click()
  await nueva.getByRole('button', { name: 'Descartar' }).click()
  await expect(nueva).toBeHidden()
  await expect(nombreDeLaFila(page, NOMBRE)).toHaveCount(1)

  // Renombrar.
  const renombrada = `${NOMBRE} 2`
  await nombreDeLaFila(page, NOMBRE).click()
  const editar = page.getByRole('dialog', { name: 'Editar categoría' })
  await editar.getByLabel('Nombre').fill(renombrada)
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(nombreDeLaFila(page, renombrada)).toBeVisible()

  // Desactivar: se sigue nombrando, con «Desactivado».
  await alternarActivo(page, renombrada)
  await expect(filaDeCatalogo(page, renombrada).getByText('Desactivado')).toBeVisible()
})

test('crear una naviera, verla ofrecida en la oferta de un flujo y desactivarla', async ({
  page,
}) => {
  // Las reglas del flujo del mismo origen (cada flujo nace con «Transporte» encendida, que es la que ofrece navieras).
  const reglas = `/configuracion/origenes/${a().id}/fases?seccion=reglas`
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'navieras'))
  const drawer = drawerDe(page, 'Navieras')
  const nueva = page.getByRole('dialog', { name: 'Nueva naviera' })
  await drawer.getByRole('button', { name: 'Nueva naviera' }).click()
  await nueva.getByLabel('Nombre').fill(NAVIERA)
  await nueva.getByRole('button', { name: 'Crear naviera' }).click()
  await expect(nueva).toBeHidden()
  const fila = filaDeCatalogo(page, NAVIERA)
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Activa', { exact: true })).toBeVisible()

  // El mismo nombre no se repite: la base lo dice junto al campo.
  await drawer.getByRole('button', { name: 'Nueva naviera' }).click()
  await nueva.getByLabel('Nombre').fill(NAVIERA)
  await nueva.getByRole('button', { name: 'Crear naviera' }).click()
  await expect(nueva.getByText(`Ya hay una naviera «${NAVIERA}» en ${a().nombre}.`)).toBeVisible()
  await nueva.getByRole('button', { name: 'Cancelar' }).click()
  await nueva.getByRole('button', { name: 'Descartar' }).click()
  await expect(nueva).toBeHidden()

  // La oferta de transporte del flujo de ese origen la ofrece.
  await page.goto(reglas)
  await expect(page.getByRole('group', { name: 'Navieras' })).toContainText(NAVIERA)

  // Desactivarla: sigue en la lista, «Inactiva», y ya no se ofrece.
  await page.goto(urlDelCatalogo(a().id, 'navieras'))
  await alternarActivo(page, NAVIERA)
  await expect(filaDeCatalogo(page, NAVIERA).getByText('Inactiva')).toBeVisible()
  await page.goto(reglas)
  await expect(page.getByRole('group', { name: 'Navieras' })).not.toContainText(NAVIERA)
})

test('crear un puerto con país y código y ver rechazado el repetido junto al nombre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'puertos'))
  const drawer = drawerDe(page, 'Puertos')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo puerto' })
  await drawer.getByRole('button', { name: 'Nuevo puerto' }).click()
  await nuevo.getByLabel('Nombre').fill(PUERTO)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByLabel('Código (opcional)').fill('cl e2e')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo).toBeHidden()
  await expect(filaDeCatalogo(page, PUERTO).getByText('Chile · CLE2E')).toBeVisible()

  await drawer.getByRole('button', { name: 'Nuevo puerto' }).click()
  await nuevo.getByLabel('Nombre').fill(PUERTO)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo.getByText(`Ya hay un puerto «${PUERTO}» en ${a().nombre}.`)).toBeVisible()
  await nuevo.getByRole('button', { name: 'Cancelar' }).click()
  await nuevo.getByRole('button', { name: 'Descartar' }).click()
  await expect(nuevo).toBeHidden()
  await expect(nombreDeLaFila(page, PUERTO)).toHaveCount(1)
})

test('la asesora de la semilla no abre los catálogos de un origen', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'puertos'))
  await expect(page.getByText(/^No puedes abrir este (origen|pestaña)$/)).toBeVisible()
  await expect(drawerDe(page, 'Puertos')).toHaveCount(0)
})
