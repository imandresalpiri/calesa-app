// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio.
import { expect, test, type Page } from './soporte/prueba'
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
  publicarFormulaDePrueba,
} from './soporte/cotizar-formula'
import { guardarConElAtajo, tarjetaGuardada, tipearEnLaHoja } from './soporte/cotizar-guardar'
import { escribirElTitulo } from './soporte/cotizar-titulo'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  abrirElSelector,
  accionDeLaFormula,
  filaDelSelector,
  listaDeFormulas,
  popoverDelSelector,
  selectorDeFormula,
} from './soporte/barra-de-la-formula'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { enElEditor } from './soporte/rutas-de-la-formula'
import { literal, sql } from './soporte/sql'

// Las fórmulas de un origen en el selector de la barra de la fórmula (`docs/UX.md` › «Cotización: fórmulas del origen»): la lista con la activa primero,
// «Nueva fórmula» en blanco o copiando una de este u otro origen (con los avisos de la copia), renombrar, activar con nota (y su PT409) desde el «⋯» de cada
// fila (`?panel=…-formula&cual=<id>`), cotizar con la activa, eliminar la que nunca estuvo activa, archivar la que sí y el tope de 50.

test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let soloA = ''
let lead = ''
// A: el origen que se configura, sin fórmulas al empezar. C: el del tope.
let a = { id: '', nombre: '' }
let c = { id: '', nombre: '' }
// La fuente de otro origen: una fórmula de la subasta de la semilla con un dato del vehículo que A no tiene (y sus tablas propias).
let subasta = ''
let fuente = ''
const FUENTE = 'E2E Fuente con millas'

const modal = (page: Page, nombre: string | RegExp) => page.getByRole('dialog', { name: nombre })
const idDe = (nombre: string) =>
  sql(
    `select id from public.formulas_del_origen where origen_id = ${literal(a.id)}::uuid and nombre = ${literal(nombre)}`,
  )

// La Planilla del origen (con la de trabajo) y el selector de la barra abierto.
async function abrirLaLista(page: Page, origenId = a.id) {
  await page.goto(`/configuracion/origenes/${origenId}/planilla`)
  await enLaPestana(page, 'Planilla')
  await abrirElSelector(page)
}

// «Nueva fórmula» del selector (o, sin fórmulas, «Empezar en blanco» del cuerpo de la pestaña) y el modal hasta crearla: queda elegida en la Planilla.
async function crear(
  page: Page,
  como: string,
  nombre: string,
  fuenteDeLaCopia?: () => Promise<void>,
) {
  if (await popoverDelSelector(page).isVisible()) {
    await popoverDelSelector(page).getByRole('button', { name: 'Nueva fórmula' }).click()
  } else {
    await page.getByRole('button', { name: 'Empezar en blanco' }).click()
  }
  const nueva = modal(page, 'Nueva fórmula')
  await expect(nueva).toBeVisible()
  // El radio es `sr-only` y, con las opciones en dos renglones, cae bajo otra etiqueta: se elige por su texto, como la persona.
  await nueva.getByText(como, { exact: true }).click()
  await expect(nueva.getByRole('radio', { name: como })).toBeChecked()
  if (fuenteDeLaCopia) await fuenteDeLaCopia()
  await nueva.getByLabel('Nombre', { exact: true }).fill(nombre)
  await nueva.getByRole('button', { name: 'Crear fórmula' }).click()
  await expect(nueva).toBeHidden()
  await expect(page).toHaveURL(enElEditor(a.id, 'planilla', idDe(nombre)))
  await expect(selectorDeFormula(page, true)).toHaveText(new RegExp(`^Fórmula: ${nombre}`))
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  a = await crearOrigenDeCotizar(proyecto, 'fdo_a', false)
  c = await crearOrigenDeCotizar(proyecto, 'fdo_tope', false)
  duena = correoDePrueba(`duena-fdo-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Fórmulas' })
  soloA = correoDePrueba(`solo-a-fdo-${proyecto}`)
  await crearPersona({
    email: soloA,
    contrasena: CONTRASENA,
    nombre: 'Saúl Sólo A',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloA,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo A ${proyecto}`, clave: `e2e_fdo_solo_a_${proyecto}` },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: a.id }],
  })
  lead = await crearLead({
    nombre: `fórmulas ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  sql(
    `delete from public.formulas_del_origen where origen_id = ${literal(subasta)}::uuid and nombre = ${literal(FUENTE)}`,
  )
  fuente = sql(`
    with f as (
      insert into public.formulas_del_origen (origen_id, nombre) values (${literal(subasta)}::uuid, ${literal(FUENTE)}) returning id
    ), p as (
      select * from public.formulas where id = public._publicada_de_la_activa(${literal(subasta)}::uuid)
    ), b as (
      insert into public.formulas (origen_id, formula_del_origen_id, estado, definicion, params, diseno, nota)
      select p.origen_id, f.id, 'borrador',
             jsonb_set(p.definicion, '{nodos}', (p.definicion -> 'nodos') || '[{"id": "col", "tipo": "campo_vehiculo", "campo": "odometro_millas", "formato": "raw", "etiqueta": "Millas"}]'),
             p.params, p.diseno, 'con millas'
        from p, f
      returning formula_del_origen_id
    )
    select formula_del_origen_id from b`)
})

test.afterAll(async () => {
  sql(`delete from public.formulas_del_origen where id = ${literal(fuente)}::uuid`)
  borrarOrigenesDeCotizar()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio · sin fórmulas, el vacío y el ⚠ de la Planilla; se crea una en blanco', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${a.id}/planilla`)
  await expect(
    page.getByRole('tab', { name: 'Planilla. Sin fórmula activa: no se puede cotizar' }),
  ).toBeVisible()
  await expect(
    page.getByText('Este origen todavía no tiene fórmula.', { exact: true }),
  ).toBeVisible()
  await expect(selectorDeFormula(page)).toHaveText(/^Sin fórmulas/)

  await crear(page, 'En blanco', 'Prueba blanco')
  await enLaPestana(page, 'Planilla')
  await expect(page.getByText('Borrador', { exact: true }).first()).toBeVisible()
})

test('E2E escritorio · copiar la publicada de este origen y una de otro origen, con los avisos de la copia', async ({
  page,
}) => {
  // «Prueba blanco» queda con la fórmula de prueba publicada y activa (lo que se copia y lo que después se desactiva).
  publicarFormulaDePrueba(a.id)
  sql(
    `update public.formulas_del_origen set activa = true, activada_en = now() where id = ${literal(idDe('Prueba blanco'))}::uuid`,
  )
  await entrar(page, duena)
  await abrirLaLista(page)
  await expect(filaDelSelector(page, 'Prueba blanco')).toContainText('Activa · v1')
  await expect(filaDelSelector(page, 'Prueba blanco').getByLabel('Activa')).toBeVisible()

  await crear(page, 'Copia de este origen', 'Prueba flete', async () => {
    const nueva = modal(page, 'Nueva fórmula')
    await nueva.getByLabel('Fórmula', { exact: true }).selectOption({ label: 'Prueba blanco' })
    await nueva.getByLabel('Versión', { exact: true }).selectOption({ label: 'Publicada' })
  })

  await abrirLaLista(page)
  await crear(page, 'Copia de otro origen', 'Prueba traída', async () => {
    const nueva = modal(page, 'Nueva fórmula')
    await nueva.getByLabel('Origen', { exact: true }).selectOption({ value: subasta })
    await nueva.getByLabel('Fórmula', { exact: true }).selectOption({ label: FUENTE })
    // De otro origen no se elige la versión: copia su publicada y, sin ella (la fuente), su borrador.
    await expect(nueva.getByLabel('Versión', { exact: true })).toHaveCount(0)
    await expect(nueva.getByText('No tiene versión publicada: se copia su borrador.')).toBeVisible()
  })
  const avisos = page.locator('[data-avisos-de-la-copia]')
  await expect(avisos).toContainText('Lo que cambió al copiar la fórmula')
  await expect(avisos).toContainText(/Se creó la tabla «[^»]+» con las filas de la copia\./)
  await expect(avisos).toContainText(
    'El dato «odometro_millas» no existe en este origen: elige otro o créalo.',
  )
  await expect(avisos.getByRole('link', { name: 'Abrir Tablas' })).toHaveAttribute(
    'href',
    `/configuracion/origenes/${a.id}/planilla?formula=${idDe('Prueba traída')}&panel=tablas`,
  )
  await expect(page.locator('[data-falta-el-campo="odometro_millas"]').first()).toBeVisible()
  await avisos.getByRole('button', { name: 'Ocultar' }).click()
  await expect(avisos).toHaveCount(0)
})

test('E2E escritorio · quien configura sólo este origen no copia de otro', async ({ page }) => {
  await entrar(page, soloA, { fresco: true })
  await abrirLaLista(page)
  await popoverDelSelector(page).getByRole('button', { name: 'Nueva fórmula' }).click()
  const nueva = modal(page, 'Nueva fórmula')
  await expect(nueva.getByRole('radio', { name: 'Copia de este origen' })).toBeVisible()
  await expect(nueva.getByRole('radio', { name: 'Copia de otro origen' })).toHaveCount(0)
  await expect(nueva.getByText('No configuras el cotizador de otro origen.')).toBeVisible()
})

test('E2E escritorio · renombrar: un nombre repetido se dice junto al campo; otro, entra', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${a.id}/planilla`)
  await accionDeLaFormula(page, 'Prueba traída', 'Renombrar')
  await expect(page).toHaveURL(
    new RegExp(`[?&]panel=renombrar-formula&cual=${idDe('Prueba traída')}(&|$)`),
  )
  const renombrar = modal(page, 'Renombrar «Prueba traída»')
  const nombre = renombrar.getByLabel('Nombre', { exact: true })
  await nombre.fill('Prueba flete')
  await renombrar.getByRole('button', { name: 'Renombrar' }).click()
  await expect(nombre).toHaveAttribute('aria-invalid', 'true')
  await nombre.fill('Prueba de otro origen')
  await renombrar.getByRole('button', { name: 'Renombrar' }).click()
  await expect(renombrar).toBeHidden()
  await abrirElSelector(page)
  await expect(filaDelSelector(page, 'Prueba de otro origen')).toBeVisible()
})

test('E2E escritorio · activar con nota: primero un PT409 con «Recargar», después queda primera y activa', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto(`/configuracion/origenes/${a.id}/planilla`)
  await accionDeLaFormula(page, 'Prueba flete', 'Activar…')
  const activar = modal(page, 'Activar «Prueba flete»')
  await expect(activar).toBeVisible()
  await activar.getByLabel('Nota', { exact: true }).fill('Flete nuevo')
  // Otra persona desactiva la que estaba activa mientras el modal está abierto.
  sql(
    `update public.formulas_del_origen set activa = false, desactivada_en = now() where id = ${literal(idDe('Prueba blanco'))}::uuid`,
  )
  await activar.getByRole('button', { name: 'Activar «Prueba flete»' }).click()
  await expect(activar.getByRole('button', { name: /Recargar/ })).toBeVisible()
  await activar.getByRole('button', { name: /Recargar/ }).click()
  await expect(activar.getByLabel('Nota', { exact: true })).toHaveValue('Flete nuevo')
  await activar.getByRole('button', { name: 'Activar «Prueba flete»' }).click()
  await expect(activar).toBeHidden()
  await abrirElSelector(page)
  await expect(listaDeFormulas(page).getByRole('listitem').first()).toContainText('Prueba flete')
  await expect(filaDelSelector(page, 'Prueba flete')).toContainText('Activa · v1')
  await expect(filaDelSelector(page, 'Prueba flete').getByLabel('Activa')).toBeVisible()
  await expect(filaDelSelector(page, 'Prueba blanco')).toContainText('v1 publicada, no activa')
})

test('E2E escritorio · se cotiza con la publicada de la nueva activa', async ({ page }) => {
  const publicada = sql(
    `select id from public.formulas where formula_del_origen_id = ${literal(idDe('Prueba flete'))}::uuid and estado = 'publicada'`,
  )
  await entrar(page, duena)
  await page.goto(`/cotizaciones/nuevo?origen=${a.id}&lead=${lead}`)
  await escribirElTitulo(page)
  await tipearEnLaHoja(page, 'pub', '100')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(
    sql(
      `select formula_id from public.cotizaciones where origen_id = ${literal(a.id)}::uuid order by creado_en desc limit 1`,
    ),
  ).toBe(publicada)
})

test('E2E escritorio · eliminar la que nunca estuvo activa y archivar la que sí', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto(`/configuracion/origenes/${a.id}/planilla`)
  await accionDeLaFormula(page, 'Prueba de otro origen', 'Eliminar')
  const eliminar = page.getByRole('dialog', { name: 'Eliminar «Prueba de otro origen»' })
  await eliminar.getByRole('button', { name: 'Eliminar' }).click()
  await expect(eliminar).toBeHidden()
  await abrirElSelector(page)
  await expect(filaDelSelector(page, 'Prueba blanco')).toBeVisible()
  await expect(filaDelSelector(page, 'Prueba de otro origen')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(popoverDelSelector(page)).toBeHidden()

  await accionDeLaFormula(page, 'Prueba blanco', 'Archivar')
  const archivar = page.getByRole('dialog', { name: 'Archivar «Prueba blanco»' })
  await archivar.getByRole('button', { name: 'Archivar' }).click()
  await expect(archivar).toBeHidden()
  await abrirElSelector(page)
  await expect(listaDeFormulas(page).getByRole('link', { name: /Prueba blanco/ })).toHaveCount(0)
  await popoverDelSelector(page).getByRole('button', { name: 'Archivadas' }).click()
  const archivadas = popoverDelSelector(page).getByRole('list', { name: 'Fórmulas archivadas' })
  await expect(archivadas.getByRole('link', { name: /Prueba blanco/ })).toBeVisible()
  await expect(archivadas).toContainText('Archivada')

  // Renombrarla desde su «⋯»: la pantalla se vuelve a leer y las archivadas también.
  await archivadas.getByRole('button', { name: 'Más acciones de Prueba blanco' }).click()
  await page.getByRole('menuitem', { name: 'Renombrar' }).click()
  const renombrar = modal(page, 'Renombrar «Prueba blanco»')
  await renombrar.getByLabel('Nombre', { exact: true }).fill('Prueba guardada')
  await renombrar.getByRole('button', { name: 'Renombrar' }).click()
  await expect(renombrar).toBeHidden()
  await abrirElSelector(page)
  await popoverDelSelector(page).getByRole('button', { name: 'Archivadas' }).click()
  await expect(archivadas.getByRole('link', { name: /Prueba guardada/ })).toBeVisible()
})

test('E2E escritorio · con 50 fórmulas «Nueva fórmula» queda apagada con su aviso', async ({
  page,
}) => {
  sql(
    `insert into public.formulas_del_origen (origen_id, nombre) select ${literal(c.id)}::uuid, 'Tope ' || n from generate_series(1, 50) n`,
  )
  await entrar(page, duena)
  await abrirLaLista(page, c.id)
  await expect(
    popoverDelSelector(page).getByRole('button', { name: 'Nueva fórmula' }),
  ).toBeDisabled()
  await expect(
    popoverDelSelector(page).getByText(
      'Este origen ya tiene 50 fórmulas: archiva o elimina alguna para crear otra.',
    ),
  ).toBeVisible()
})
