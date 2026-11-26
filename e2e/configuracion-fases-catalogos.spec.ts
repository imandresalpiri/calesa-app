// @sin-celular-archivo: Configuración se usa en escritorio; la disposición en el celular la mira configuracion-fases-catalogos-disposicion
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  PREFIJO_T570,
  borrarCatalogosT570,
  botonesDeLosCatalogos,
  drawerDe,
  grupoDe,
  idDelTipo,
  origenPorClave,
  urlDelCatalogo,
} from './soporte/catalogos-en-fases'
import { filaDeCatalogo, masAccionesDe, menuDe, nombreDeLaFila } from './soporte/lista-de-catalogo'
import { abrirForma, abrirInspector, faseSinRequisitos } from './soporte/requisitos'

// Los catálogos de logística en la pestaña Fases de cada origen (T570, `docs/UX.md` › «Catálogos de logística (drawer)»): arriba del diagrama, un botón
// por catálogo abre su drawer (`?panel=`), con los de ese origen («De <origen>») y los compartidos. Un solo «Nuevo …» pregunta para quién; un propio tapa
// al compartido de su clave; editar un compartido avisa que cambia para todos; se desactiva y no se elimina (los tipos sin uso, sí). Un requisito crea
// su tipo sin salir de la fase. Repuestos sólo tiene Tipos. Los permisos, en `-permisos.spec.ts`; la disposición (una fila, 200 %, celular), en
// `-disposicion.spec.ts`.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
const a = () => origenPorClave('subasta_usa')
const nombre = (resto: string) => `${PREFIJO_T570} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarCatalogosT570()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-fases-catalogos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Celia Catálogos' })
})

test.afterAll(async () => {
  borrarCatalogosT570()
  await borrarPersonasDePrueba()
})

test('E2E Puertos: «Sólo de A» por defecto, uno compartido, un propio lo tapa, editar el compartido avisa y se desactiva sin eliminar', async ({
  page,
}) => {
  const compartido = nombre('Arica')
  const propio = compartido.toUpperCase()
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'puertos'))
  const drawer = drawerDe(page, 'Puertos')
  await expect(drawer).toBeVisible()

  // Compartido: «Para» se cambia a «Compartido con todos los orígenes».
  await drawer.getByRole('button', { name: 'Nuevo puerto' }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo puerto' })
  await expect(nuevo.getByRole('radio', { name: `Sólo de ${a().nombre}` })).toBeChecked()
  await nuevo.getByText('Compartido con todos los orígenes', { exact: true }).click()
  await nuevo.getByLabel('Nombre').fill(compartido)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo).toBeHidden()
  const compartidos = grupoDe(page, 'puerto', 'compartido')
  await expect(compartidos.getByRole('button', { name: `Editar ${compartido}` })).toBeVisible()

  // Propio: el mismo nombre y país en mayúsculas, «Sólo de A» (por defecto); tapa al compartido en A.
  await drawer.getByRole('button', { name: 'Nuevo puerto' }).click()
  await nuevo.getByLabel('Nombre').fill(propio)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo).toBeHidden()
  const propios = grupoDe(page, 'puerto', 'origen')
  await expect(propios.getByRole('button', { name: `Editar ${propio}` })).toBeVisible()
  await expect(
    filaDeCatalogo(page, compartido).getByText(`Tapado por el de ${a().nombre}`),
  ).toBeVisible()
  await expect(propios.getByText(`Tapado por el de ${a().nombre}`)).toHaveCount(0)

  // Editar el compartido avisa que cambia para todos.
  await compartidos.getByRole('button', { name: `Editar ${compartido}` }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar puerto' })
  await expect(edicion.getByText('Cambia para todos los orígenes que lo usan.')).toBeVisible()
  await edicion.getByRole('button', { name: 'Cancelar' }).click()
  await expect(edicion).toBeHidden()

  // El «⋯»: Editar y Desactivar, sin «Eliminar».
  await masAccionesDe(page, propio).click()
  await expect(menuDe(page, propio).getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click()
  await expect(filaDeCatalogo(page, propio).getByText('Desactivado')).toBeVisible()
})

test('E2E Categorías de gasto: sin «Eliminar» en el «⋯» y el grupo vacío lo dice', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'categorias-de-gasto'))
  await expect(drawerDe(page, 'Categorías de gasto')).toBeVisible()
  await expect(grupoDe(page, 'categoria-de-gasto', 'origen')).toContainText(
    `Ninguna sólo de ${a().nombre}.`,
  )
  const primera = grupoDe(page, 'categoria-de-gasto', 'compartido')
    .getByRole('button', { name: /^Más acciones de / })
    .first()
  await primera.click()
  await expect(page.getByRole('menuitem', { name: 'Editar', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0)
})

test('E2E Tipos: se crea compartido por la URL, se elimina sin uso y las URL viejas no abren nada', async ({
  page,
}) => {
  const tipo = nombre('Póliza')
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'tipos-de-documento', '&accion=nuevo-tipo&de=compartido'))
  const nuevo = page.getByRole('dialog', { name: 'Nuevo tipo de documento' })
  await expect(
    nuevo.getByRole('radio', { name: 'Compartido con todos los orígenes' }),
  ).toBeChecked()
  await nuevo.getByLabel('Nombre').fill(tipo)
  await nuevo.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(nuevo).toBeHidden()
  const compartidos = grupoDe(page, 'tipos', 'compartido')
  await expect(compartidos.getByRole('button', { name: `Editar ${tipo}` })).toBeVisible()

  await masAccionesDe(page, tipo).click()
  await page.getByRole('menuitem', { name: 'Eliminar', exact: true }).click()
  const confirmar = page.getByRole('dialog', { name: `Eliminar el tipo de documento «${tipo}»` })
  await confirmar.getByRole('button', { name: 'Eliminar tipo' }).click()
  await expect(confirmar).toBeHidden()
  await expect(nombreDeLaFila(page, tipo)).toHaveCount(0)
  expect(idDelTipo(tipo)).toBe('')

  // `?seccion=documentos` ya no es una sección del panel: no abre nada.
  await page.goto(`/configuracion/origenes/${a().id}/fases?seccion=documentos`)
  await expect(botonesDeLosCatalogos(page).first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // `?panel=nuevo-tipo` no es un catálogo del drawer: se limpia.
  await page.goto(`/configuracion/origenes/${a().id}/fases?panel=nuevo-tipo`)
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('E2E un requisito de documento crea su tipo «Sólo de A» y queda elegido', async ({ page }) => {
  const tipo = nombre('Certificado')
  await entrar(page, duena, { fresco: true })
  const inspector = await abrirInspector(page, faseSinRequisitos().id)
  await abrirForma(inspector, 'Documento')
  const documento = inspector.getByRole('form', { name: 'Agregar requisito de documento' })
  await documento.getByRole('button', { name: 'Crear tipo de documento' }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo tipo de documento' })
  await expect(nuevo.getByRole('radio', { name: `Sólo de ${a().nombre}` })).toBeChecked()
  await nuevo.getByLabel('Nombre').fill(tipo)
  await nuevo.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(nuevo).toBeHidden()
  await expect.poll(() => idDelTipo(tipo)).not.toBe('')
  await expect(documento.getByLabel('Tipo de documento')).toHaveValue(idDelTipo(tipo))
})

test('E2E Repuestos sólo tiene Tipos de documento: otro catálogo se limpia y un panel ajeno se ignora', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos/configuracion/flujo?panel=tipos-de-documento')
  await expect(botonesDeLosCatalogos(page)).toHaveText(['Tipos de documento'])
  await expect(drawerDe(page, 'Tipos de documento')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compartidos', level: 3 })).toBeVisible()

  await page.goto('/repuestos/configuracion/flujo?panel=puertos')
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.goto('/repuestos/configuracion/flujo?panel=xyz')
  await expect(botonesDeLosCatalogos(page)).toHaveText(['Tipos de documento'])
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
