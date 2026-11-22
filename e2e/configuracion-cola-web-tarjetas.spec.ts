// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
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
  exigirEquipoSinAjenos,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { literal, sql } from './soporte/sql'

// Cola web como tarjetas que se editan en un modal (T515): la política es una tarjeta con sus valores a la vista y su «⋯»; cada persona de la rueda, una
// tarjeta con su «⋯» («Editar…» y «Quitar de la rueda»); «Agregar a la rueda» va junto al título; las solicitudes sin asignar son tarjetas sin «⋯». La página
// ocupa todo el ancho del área. La política y la rueda se restauran al final (un solo worker).
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Tarjetas'
const ANA = 'Ana Tarjetas'
const BRUNO = 'Bruno Tarjetas'
const SIN_PERMISO = 'Sara Sinpermiso'
const POLITICA = 'Política de la cola'

type Politica = {
  cola_activa: boolean
  ttl_contacto_minutos: number
  dias_pegajoso: number
  max_abiertas_default: number
  max_intentos: number
}

let duena = ''
let sinPermiso = ''
let anaId = ''
let brunoId = ''
let codigo = ''
let antes: Politica | null = null

async function idDe(correo: string) {
  const { data } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', correo)
    .single<{ id: string }>()
  return data?.id ?? ''
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-cola-tarjetas-${proyecto}`)
  sinPermiso = correoDePrueba(`sinpermiso-cola-tarjetas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  const asesoras = [
    { nombre: ANA, correo: correoDePrueba(`ana-cola-tarjetas-${proyecto}`) },
    { nombre: BRUNO, correo: correoDePrueba(`bruno-cola-tarjetas-${proyecto}`) },
  ]
  for (const [i, { nombre, correo }] of asesoras.entries()) {
    await crearPersona({ email: correo, contrasena: CLAVE, nombre, invitada: true })
    await darRolDePrueba({
      email: correo,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Cola tarjetas ${String(i)} ${proyecto}`,
        clave: `e2e_cola_t${String(i)}_${proyecto}`,
      },
      permisos: [{ clave: 'leads.ver', alcance: 'propios' }, 'web.cola.participar'],
    })
  }
  await crearPersona({ email: sinPermiso, contrasena: CLAVE, nombre: SIN_PERMISO, invitada: true })
  await darRolDePrueba({
    email: sinPermiso,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Cola tarjetas sin ${proyecto}`,
      clave: `e2e_cola_ts_${proyecto}`,
    },
    permisos: [{ clave: 'leads.ver', alcance: 'propios' }],
  })
  anaId = await idDe(asesoras[0]?.correo ?? '')
  brunoId = await idDe(asesoras[1]?.correo ?? '')
  codigo = `#WEB-TAR-${proyecto.slice(0, 4).toUpperCase()}`
  antes = JSON.parse(
    sql(
      `select row_to_json(t) from (select cola_activa, ttl_contacto_minutos, dias_pegajoso, max_abiertas_default, max_intentos
         from public.ajustes_web where id = 1) t`,
    ),
  ) as Politica
  sql(`
    update public.perfiles set whatsapp_web = '+59175550201' where id = ${literal(anaId)};
    update public.perfiles set whatsapp_web = '+59175550202' where id = ${literal(brunoId)};
    update public.cola_web_asesores set habilitado = true, disponible = true, max_abiertas = null, prioridad = 0, orden = 0
      where usuario_id in (${literal(anaId)}, ${literal(brunoId)});
    delete from public.solicitudes_contacto_web where token_visitante like 'e2ecolatarjetas%';
    insert into public.solicitudes_contacto_web (codigo, token_visitante, estado, fuente)
      values (${literal(codigo)}, ${literal(`e2ecolatarjetas${proyecto}0001`)}, 'sin_asignar', 'boton_general');
  `)
})

test.afterAll(async () => {
  if (antes) {
    const { error } = await admin().from('ajustes_web').update(antes).eq('id', 1)
    if (error) {
      throw new Error(`No se pudo restaurar la política de la cola: ${error.message}`)
    }
  }
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2ecolatarjetas%'`)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrir(page: Page, correo: string, ruta = '/configuracion/cola-web') {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto(ruta)
}

const tarjetaDe = (page: Page, nombre: string) =>
  page.getByRole('region', { name: 'En la rueda' }).locator('article').filter({ hasText: nombre })

test('la política es una tarjeta con sus valores a la vista, sin botón suelto, y tocarla abre su modal', async ({
  page,
}) => {
  await abrir(page, duena)
  const tarjeta = page.getByRole('region', { name: POLITICA, exact: true })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta).toContainText('Minutos para contactar')
  await expect(tarjeta).toContainText(String(antes?.ttl_contacto_minutos))
  await expect(tarjeta.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
  await expect(tarjeta.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(tarjeta.getByRole('button', { name: `Más acciones de ${POLITICA}` })).toBeVisible()

  await tarjeta.getByText('Minutos para contactar').click()
  await expect(page).toHaveURL(/panel=politica/)
  await expect(page.getByRole('dialog', { name: POLITICA, exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: POLITICA, exact: true })).toBeHidden()

  await tarjeta.getByRole('button', { name: `Más acciones de ${POLITICA}` }).click()
  await page.getByRole('menuitem', { name: 'Editar política…' }).click()
  await expect(page.getByRole('dialog', { name: POLITICA, exact: true })).toBeVisible()
})

test('la política se guarda desde su modal y la tarjeta muestra el valor nuevo', async ({
  page,
}) => {
  await abrir(page, duena, '/configuracion/cola-web?panel=politica')
  const dialogo = page.getByRole('dialog', { name: POLITICA, exact: true })
  const minutos = dialogo.getByLabel('Minutos para contactar')
  await expect(minutos).toBeVisible()
  const nuevo = (antes?.ttl_contacto_minutos ?? 10) + 7
  await minutos.fill(String(nuevo))
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('region', { name: POLITICA, exact: true })).toContainText(
    String(nuevo),
  )
  expect(sql('select ttl_contacto_minutos from public.ajustes_web where id = 1')).toBe(
    String(nuevo),
  )
})

test('PT409: si otra persona guardó antes, «Recargar» conserva lo tipeado y «Guardar» guarda', async ({
  page,
}) => {
  await abrir(page, duena, '/configuracion/cola-web?panel=politica')
  const dialogo = page.getByRole('dialog', { name: POLITICA, exact: true })
  const dias = dialogo.getByLabel('Días con el mismo asesor')
  await expect(dias).toBeVisible()
  const nuevo = (antes?.dias_pegajoso ?? 5) + 3
  await dias.fill(String(nuevo))

  sql('update public.ajustes_web set actualizado_en = clock_timestamp() where id = 1')
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  const recargar = dialogo.getByRole('button', { name: 'Recargar' })
  await expect(recargar).toBeVisible()
  await recargar.click()
  await expect(recargar).toBeHidden()
  await expect(dias).toHaveValue(String(nuevo))

  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  expect(sql('select dias_pegajoso from public.ajustes_web where id = 1')).toBe(String(nuevo))
})

test('cerrar el modal con cambios pregunta: «Seguir editando» los conserva y «Descartar» los tira', async ({
  page,
}) => {
  await abrir(page, duena, '/configuracion/cola-web?panel=politica')
  const dialogo = page.getByRole('dialog', { name: POLITICA, exact: true })
  const intentos = dialogo.getByLabel('Intentos por solicitud')
  await expect(dialogo).toBeVisible()
  const valor = await intentos.inputValue()
  await intentos.fill(String(Number(valor) + 1))
  await page.keyboard.press('Escape')
  await dialogo.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(intentos).toHaveValue(String(Number(valor) + 1))
  await page.keyboard.press('Escape')
  await dialogo.getByRole('button', { name: 'Descartar' }).click()
  await expect(dialogo).toBeHidden()
  expect(sql('select max_intentos from public.ajustes_web where id = 1')).toBe(valor)
})

test('cada persona es una tarjeta con su «⋯»: «Editar…» cambia cupo y prioridad', async ({
  page,
}) => {
  await abrir(page, duena)
  const tarjeta = tarjetaDe(page, ANA)
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByRole('button', { name: `Más acciones de ${ANA}` })).toBeVisible()

  await tarjeta.getByRole('button', { name: `Más acciones de ${ANA}` }).click()
  await page.getByRole('menuitem', { name: 'Editar…' }).click()
  const dialogo = page.getByRole('dialog', { name: `Editar a ${ANA} en la rueda` })
  await expect(dialogo).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`panel=editar-en-la-rueda.*para=${anaId}`))
  await dialogo.getByLabel('Cupo de abiertas').fill('4')
  await dialogo.getByLabel('Prioridad').fill('7')
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  await expect(tarjetaDe(page, ANA)).toContainText('Prioridad 7')
  await expect(tarjetaDe(page, ANA)).toContainText('de 4 abiertas')
  expect(
    sql(
      `select max_abiertas || ':' || prioridad from public.cola_web_asesores where usuario_id = ${literal(anaId)}`,
    ),
  ).toBe('4:7')
})

test('«Quitar de la rueda» confirma nombrando a la persona y ofrece «Deshacer»', async ({
  page,
}) => {
  await abrir(page, duena)
  const tarjeta = tarjetaDe(page, BRUNO)
  await tarjeta.getByRole('button', { name: `Más acciones de ${BRUNO}` }).click()
  await page.getByRole('menuitem', { name: 'Quitar de la rueda' }).click()
  const confirmar = page.getByRole('dialog', { name: `Quitar a ${BRUNO} de la rueda` })
  await expect(confirmar).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`panel=quitar-de-la-rueda.*para=${brunoId}`))
  await confirmar.getByRole('button', { name: 'Quitar de la rueda' }).click()
  await expect(confirmar).toBeHidden()
  await expect(tarjetaDe(page, BRUNO)).toHaveCount(0)
  expect(
    sql(`select habilitado from public.cola_web_asesores where usuario_id = ${literal(brunoId)}`),
  ).toBe('f')

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(`${BRUNO} volvió a la rueda.`)).toBeVisible()
  await expect(tarjetaDe(page, BRUNO)).toBeVisible()
  expect(
    sql(`select habilitado from public.cola_web_asesores where usuario_id = ${literal(brunoId)}`),
  ).toBe('t')
})

test('«Agregar a la rueda» va junto al título de su bloque y la solicitud sin asignar no tiene «⋯»', async ({
  page,
}) => {
  await abrir(page, duena)
  const rueda = page.getByRole('region', { name: 'En la rueda' })
  await expect(rueda.getByRole('heading', { name: 'En la rueda', level: 2 })).toBeVisible()
  await expect(rueda.getByRole('button', { name: 'Agregar a la rueda' })).toBeVisible()
  const solicitud = page
    .getByRole('region', { name: /^Sin asignar/ })
    .locator('article')
    .filter({ hasText: codigo })
  await expect(solicitud).toBeVisible()
  await expect(solicitud.getByRole('button')).toHaveCount(0)
})

test('a 1920 px la página ocupa el ancho del área y las tarjetas van en más de una columna', async ({
  browser,
}) => {
  const contexto = await browser.newContext({ viewport: { width: 1920, height: 1000 } })
  const page = await contexto.newPage()
  try {
    await abrir(page, duena)
    await expect(tarjetaDe(page, ANA)).toBeVisible()
    await expect(tarjetaDe(page, BRUNO)).toBeVisible()
    const medidas = await page.evaluate(() => {
      const principal = document.querySelector('main')
      const seccion = document.querySelector('section[aria-labelledby="rueda-titulo"]')
      return {
        principal: principal?.clientWidth ?? 0,
        seccion: seccion?.getBoundingClientRect().width ?? 0,
        ancho: window.innerWidth,
        desborde: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    // Sin tope de ancho: el bloque llena el área (menos el relleno del `main`) y no desborda.
    expect(medidas.seccion).toBeGreaterThan(medidas.principal * 0.8)
    expect(medidas.seccion).toBeGreaterThan(768)
    expect(medidas.desborde).toBeLessThanOrEqual(0)
    // Dos tarjetas de la rueda en la misma fila: la rejilla tiene más de una columna.
    const filas = await page.evaluate(
      ({ uno, otro }) => {
        const cajas = [
          ...document.querySelectorAll('section[aria-labelledby="rueda-titulo"] article'),
        ]
        const de = (nombre: string) =>
          cajas.find((caja) => caja.textContent.includes(nombre))?.getBoundingClientRect()
        const a = de(uno)
        const b = de(otro)
        return a && b
          ? { mismaFila: Math.abs(a.top - b.top) < 4, distintaColumna: a.left !== b.left }
          : null
      },
      { uno: ANA, otro: BRUNO },
    )
    expect(filas).toEqual({ mismaFila: true, distintaColumna: true })
  } finally {
    await contexto.close()
  }
})

test('sin web.cola.gestionar la página dice que no hay permiso', async ({ page }) => {
  await abrir(page, sinPermiso)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('region', { name: POLITICA, exact: true })).toHaveCount(0)
})
