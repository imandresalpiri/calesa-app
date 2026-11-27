// @sin-celular-archivo: camino feliz de una función nueva, en escritorio (.claude/rules/e2e.md › «Pruebas: sólo lo clave»); el cuadro es de Configuración
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearVehiculoEn } from './soporte/listado-de-cotizaciones'
import { cabeceraDeLaGuardada, elegirEnElMenu } from './soporte/menu-de-la-guardada'
import { expect, test, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// La cotización privada (glosario: «Cotización privada», `docs/COTIZADOR.md` › «Cotizaciones privadas»): Ana la hace privada desde el «⋯» de su guardada; Luis
// (ve todas las del origen) no la ve en el listado ni por su URL; Marta (además, las privadas) la ve con la insignia en la tabla y en el resumen; en la ficha del vehículo
// su tarjeta lleva la insignia y «Aprobar esta» pregunta antes; la dueña la aprueba (la pregunta dice que deja de ser privada) y Luis ya la ve. Al final, el cuadro «Quién crea y quién ve» le da las privadas al rol de Luis. La base decide quién ve
// (`supabase/tests/areas/cotizaciones/privadas.sql`); esto recorre lo que la pantalla ofrece. El vehículo tiene dos: la de la dueña, más antigua, es la aprobada.
test.describe.configure({ mode: 'serial' })

const ROL_DE_LUIS = { nombre: `${PREFIJO_ROL_E2E}Privadas Luis`, clave: 'e2e_privadas_luis' }

type Terreno = {
  origen: { id: string; nombre: string }
  duena: string
  ana: string
  luis: string
  marta: string
  vehiculoId: string
  deAna: string
  deLaDuena: string
  titulo: string
}

let t: Terreno

test.beforeAll(async ({}, info) => {
  const p = info.project.name
  await borrarRolesDePrueba()
  const { origen, duena } = await prepararGuardado(p, 'privadas')
  const ana = correoDePrueba(`ana-privadas-${p}`)
  const luis = correoDePrueba(`luis-privadas-${p}`)
  const marta = correoDePrueba(`marta-privadas-${p}`)
  for (const [email, nombre] of [
    [ana, 'Ana Privadas'],
    [luis, 'Luis Privadas'],
    [marta, 'Marta Privadas'],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  }
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Privadas Ana`, clave: 'e2e_privadas_ana' },
    permisos: [{ clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' }],
  })
  await darRolDePrueba({
    email: luis,
    rol: ROL_DE_LUIS,
    permisos: [{ clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'todos' }],
  })
  await darRolDePrueba({
    email: marta,
    rol: { nombre: `${PREFIJO_ROL_E2E}Privadas Marta`, clave: 'e2e_privadas_marta' },
    permisos: [
      { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'todos' },
      { clave: 'cotizaciones.privadas.ver', origenId: origen.id },
    ],
  })
  const vehiculoId = crearVehiculoEn(origen.id, `Privadas ${p}`)
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId,
    creadoPor: idDePersona(duena),
    cuantas: 1,
    desde: 10,
  })
  sembrarCotizaciones({ origenId: origen.id, vehiculoId, creadoPor: idDePersona(ana), cuantas: 1 })
  const titulo = `Privada de Ana ${p}`
  const [deLaDuena = '', deAna = ''] = sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set titulo = case when creado_por = ${literal(idDePersona(ana))}::uuid then ${literal(titulo)} else ${literal(`Pública de la dueña ${p}`)} end
     where vehiculo_id = ${literal(vehiculoId)}::uuid;
    commit;
    select public._cotizaciones_aprobadas_rellenar();
    select id from public.cotizaciones where vehiculo_id = ${literal(vehiculoId)}::uuid order by creado_en, id;`)
    .split('\n')
    .filter((linea) => /^[0-9a-f-]{36}$/.test(linea))
  t = { origen, duena, ana, luis, marta, vehiculoId, deAna, deLaDuena, titulo }
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const privadaEnLaBase = (): string =>
  sql(`select privada::text from public.cotizaciones where id = ${literal(t.deAna)}::uuid`).trim()
const aprobadaDelVehiculo = (): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(t.vehiculoId)}::uuid), '')`,
  ).trim()
const numeroDe = (id: string): string =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`).trim()
const delVehiculo = (): string =>
  `/cotizaciones?origen=${t.origen.id}&vehiculo=${t.vehiculoId}&vista=tabla&agrupar=no`
const fila = (page: Page, titulo: string) => page.locator('tbody tr', { hasText: titulo })

async function abrir(page: Page, correo: string, ruta: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(ruta)
}

test('E2E Ana hace privada su cotización desde el «⋯» y aparece la insignia', async ({ page }) => {
  await abrir(page, t.ana, `/cotizaciones/${t.deAna}`)
  const cabecera = cabeceraDeLaGuardada(page)
  await expect(cabecera).toBeVisible()
  await expect(cabecera.getByText('Privada', { exact: true })).toHaveCount(0)
  await elegirEnElMenu(page, 'Hacer privada')
  await expect(page.getByText(`La n.º ${numeroDe(t.deAna)} es privada.`)).toBeVisible()
  await expect(cabecera.getByText('Privada', { exact: true })).toBeVisible()
  expect(privadaEnLaBase()).toBe('true')
})

test('E2E Luis no la ve: ni en el listado del vehículo ni por su URL', async ({ page }) => {
  await abrir(page, t.luis, delVehiculo())
  await expect(fila(page, `Pública de la dueña`)).toBeVisible()
  await expect(fila(page, t.titulo)).toHaveCount(0)
  await page.goto(`/cotizaciones/${t.deAna}`)
  await expect(
    page.getByText('Esta cotización ya no está disponible: no existe o ya no tienes acceso.'),
  ).toBeVisible()
})

test('E2E Marta la ve, con la insignia en la tabla y en el resumen', async ({ page }) => {
  await abrir(page, t.marta, delVehiculo())
  const deAna = fila(page, t.titulo)
  await expect(deAna).toBeVisible()
  await expect(deAna.getByText('Privada', { exact: true })).toBeVisible()
  await expect(fila(page, 'Pública de la dueña').getByText('Privada', { exact: true })).toHaveCount(
    0,
  )
  await deAna.getByText(t.titulo).click()
  const resumen = page.getByRole('dialog', { name: `Cotización n.º ${numeroDe(t.deAna)}` })
  await expect(resumen).toBeVisible()
  await expect(resumen.getByText('Privada', { exact: true })).toBeVisible()
})

test('E2E en la ficha del vehículo su tarjeta lleva la insignia y «Aprobar esta» pregunta antes', async ({
  page,
}) => {
  await abrir(page, t.duena, `/vehiculos/${t.vehiculoId}?seccion=cotizaciones`)
  const tarjeta = page
    .getByRole('list', { name: 'Cotizaciones de este vehículo' })
    .locator('article', { hasText: t.titulo })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByText('Privada', { exact: true })).toBeVisible()
  // La tarjeta no pregunta por la marca leída: la base rechaza sin el aviso y la ficha abre su pregunta (`desde=ficha`). Cancelar la deja como estaba.
  await tarjeta.getByRole('button', { name: 'Aprobar esta' }).click()
  const pregunta = page.getByRole('dialog', {
    name: `Aprobar la cotización n.º ${numeroDe(t.deAna)}`,
  })
  await expect(pregunta).toBeVisible()
  await expect(page).toHaveURL(/panel=aprobar-privada.*desde=ficha/)
  await expect(pregunta.getByText(/Al aprobarla deja de ser privada/)).toBeVisible()
  await pregunta.getByRole('button', { name: 'Cancelar' }).click()
  await expect(pregunta).toBeHidden()
  expect(privadaEnLaBase()).toBe('true')
  expect(aprobadaDelVehiculo()).toBe(t.deLaDuena)
})

test('E2E la dueña la aprueba: la pregunta avisa, la insignia se va y Luis ya la ve', async ({
  page,
}) => {
  expect(aprobadaDelVehiculo()).toBe(t.deLaDuena)
  await abrir(page, t.duena, `/cotizaciones/${t.deAna}`)
  const cabecera = cabeceraDeLaGuardada(page)
  await expect(cabecera.getByText('Privada', { exact: true })).toBeVisible()
  await cabecera.getByRole('button', { name: 'Aprobar…' }).click()
  const pregunta = page.getByRole('dialog', {
    name: `Aprobar la cotización n.º ${numeroDe(t.deAna)}`,
  })
  await expect(pregunta).toBeVisible()
  await expect(pregunta.getByText(/Al aprobarla deja de ser privada/)).toBeVisible()
  await pregunta.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect(pregunta).toBeHidden()
  await expect(page.getByText(/Ya no es privada\./)).toBeVisible()
  await expect(cabecera.getByText('Aprobada', { exact: true })).toBeVisible()
  await expect(cabecera.getByText('Privada', { exact: true })).toHaveCount(0)
  expect(privadaEnLaBase()).toBe('false')
  expect(aprobadaDelVehiculo()).toBe(t.deAna)

  await abrir(page, t.luis, delVehiculo())
  await expect(fila(page, t.titulo)).toBeVisible()
})

test('E2E el modal «Quién crea y quién ve» de Roles le da las privadas al rol de Luis en el origen', async ({
  page,
}) => {
  const privadasDeLuis = (): string =>
    sql(`
      select count(*) from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
       where r.clave = ${literal(ROL_DE_LUIS.clave)} and rp.permiso_clave = 'cotizaciones.privadas.ver'
         and rp.origen_id = ${literal(t.origen.id)}::uuid`).trim()
  expect(privadasDeLuis()).toBe('0')
  // `?panel=quien-crea-y-quien-ve` abre el modal de la matriz de Roles y `?origen=` elige el lugar.
  await abrir(
    page,
    t.duena,
    `/configuracion/roles?bloque=cotizaciones&panel=quien-crea-y-quien-ve&origen=${t.origen.id}`,
  )
  const ve = page.getByRole('combobox', { name: `Ve: ${ROL_DE_LUIS.nombre}` })
  await expect(ve).toHaveValue('sin_privadas')
  await ve.selectOption({ label: 'Todas, también las privadas' })
  await expect.poll(privadasDeLuis).toBe('1')
  await expect(ve).toHaveValue('todas')
})
