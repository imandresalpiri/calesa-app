import { expect, test } from './soporte/prueba'
import {
  BLOQUES,
  DE_LA_ASESORA,
  DE_LA_DUENA,
  DE_LOGISTICA,
  DE_REPUESTOS,
  DEL_MIXTO,
  ir,
  limpiarInicioPorRol,
  NOMBRE_SIN_ROL,
  prepararInicioPorRol,
  sinBloquesCaidos,
  titulos,
  type TerrenoPorRol,
} from './soporte/inicio-por-rol'
import { idDePersona } from './soporte/leads-alta'

// Inicio (`/`) por rol: cada persona ve exactamente los bloques que le dan sus permisos, en el orden de `BLOQUES_BANDEJA`; el «Ver todas» de cada bloque sólo
// existe en su tope (con una fila no hay) y sus destinos están en `inicio-ver-todos.spec.ts` y `entities/bandeja.test.ts`. Los roles de referencia de `docs/UX.md` › Roles: asesor, logística y repuestos (los de la semilla),
// la dueña, RRHH (sólo `equipo.*`), alguien sin permisos, alguien sin rol y alguien con dos roles (asesor + logística: la unión, sin repetir).
test.describe.configure({ mode: 'serial' })

let t: TerrenoPorRol

test.beforeAll(async ({}, info) => {
  t = await prepararInicioPorRol(info.project.name)
})

test.afterAll(async () => {
  await limpiarInicioPorRol(t)
})

test.describe('asesor', () => {
  test('ve sus bloques, ninguno de equipo ni de repuestos, y sin «Ver todas» por debajo del tope', async ({
    page,
  }) => {
    await ir(page, t.correo.asesor)
    await expect(titulos(page)).toHaveText(DE_LA_ASESORA)
    await sinBloquesCaidos(page)
    await expect(page.getByRole('link', { name: 'Ver el tablero' })).toHaveCount(0)

    const recordatorios = page.getByRole('region', { name: BLOQUES.recordatorios })
    await expect(recordatorios.getByText(`Recordar inicio por rol ${t.proyecto}`)).toBeVisible()
    await expect(recordatorios.getByText('1 recordatorio')).toBeVisible()
    await expect(recordatorios.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)

    const tareas = page.getByRole('region', { name: BLOQUES.tareas })
    await expect(
      tareas.getByRole('link', { name: new RegExp(`Tarea inicio por rol ${t.proyecto}`) }),
    ).toBeVisible()
    await expect(tareas.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)
  })
})

test.describe('logística', () => {
  test('ve vehículos trabados, documentos por aprobar y demoras, sin «Ver todas» por debajo del tope', async ({
    page,
  }) => {
    await ir(page, t.correo.logistica)
    await expect(titulos(page)).toHaveText(DE_LOGISTICA)
    await sinBloquesCaidos(page)

    for (const bloque of [BLOQUES.trabados, BLOQUES.porAprobar, BLOQUES.demoras]) {
      const region = page.getByRole('region', { name: bloque })
      await expect(
        region.getByRole('link', { name: new RegExp(t.terreno.enB.titulo) }),
      ).toBeVisible()
      await expect(region.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)
    }
  })
})

test.describe('repuestos', () => {
  test('ve ítems por mover y esperas, y ninguno de leads ni de documentos', async ({ page }) => {
    await ir(page, t.correo.repuestos)
    await expect(titulos(page)).toHaveText(DE_REPUESTOS)
    await sinBloquesCaidos(page)
    // Con un par de ítems no llegan al tope: sin «Ver todas». La fila abre el panel del ítem (`e2e/inicio-repuestos.spec.ts`).
    for (const bloque of [BLOQUES.repuestosPorMover, BLOQUES.esperas]) {
      await expect(
        page.getByRole('region', { name: bloque }).getByRole('link', { name: 'Ver todas' }),
      ).toHaveCount(0)
    }
  })
})

test.describe('dueña', () => {
  test('ve todos los bloques por su suma de permisos y «Ver el tablero»', async ({ page }) => {
    await ir(page, t.correo.duena)
    await expect(titulos(page)).toHaveText(DE_LA_DUENA)
    await sinBloquesCaidos(page)
    const personas = page.getByRole('region', { name: BLOQUES.sinRol })
    await expect(personas.getByRole('link', { name: NOMBRE_SIN_ROL })).toBeVisible()
    await page.getByRole('link', { name: 'Ver el tablero' }).click()
    await expect(page).toHaveURL(/\/tablero/)
  })
})

test.describe('RRHH', () => {
  test('ve sólo «Personas sin rol» y abre a la persona', async ({ page }) => {
    await ir(page, t.correo.rrhh)
    await expect(titulos(page)).toHaveText([BLOQUES.sinRol])
    await sinBloquesCaidos(page)
    await expect(page.getByRole('link', { name: 'Ver el tablero' })).toHaveCount(0)
    const personaId = await idDePersona(t.correo.sinRol)
    await page
      .getByRole('region', { name: BLOQUES.sinRol })
      .getByRole('link', { name: NOMBRE_SIN_ROL })
      .click()
    await expect(page).toHaveURL(new RegExp(`/configuracion/equipo\\?persona=${personaId}`))
  })
})

test.describe('sin permisos', () => {
  test('no ve ningún bloque: un vacío que dice qué hay y a quién pedir acceso, sin nada caído', async ({
    page,
  }) => {
    await ir(page, t.correo.sinPermisos)
    await expect(titulos(page)).toHaveCount(0)
    await sinBloquesCaidos(page)
    await expect(page.getByText('Tu rol todavía no tiene trabajo en la bandeja')).toBeVisible()
    await expect(page.getByText(/Acá aparecen recordatorios de hoy,/)).toBeVisible()
    await expect(page.getByText(/pídeselo a quien administra el equipo/)).toBeVisible()
  })
})

test.describe('sin rol', () => {
  test('dice que aún no tiene un rol y a quién avisar', async ({ page }) => {
    await ir(page, t.correo.sinRol)
    await expect(titulos(page)).toHaveCount(0)
    await expect(page.getByText('Aún no tienes un rol, avisa al dueño')).toBeVisible()
  })
})

test.describe('mixto (asesor + logística)', () => {
  test('ve la unión de los dos, sin repetir y en el orden de la bandeja', async ({ page }) => {
    await ir(page, t.correo.mixto)
    await expect(titulos(page)).toHaveText(DEL_MIXTO)
    await sinBloquesCaidos(page)
    await expect(page.getByRole('region', { name: BLOQUES.trabados })).toHaveCount(1)
  })
})
