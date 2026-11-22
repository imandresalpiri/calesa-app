import { expect, test, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import { textoGrandeAlCargar } from './soporte/recorrido'

const CLAVE = 'una-clave-de-prueba-9'
let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-roles-pegado-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Pegado' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
}

// Desplaza la matriz y devuelve lo que cuenta: el borde de arriba del contenedor que se desplaza, el de la fila de los roles, el borde de
// abajo de esa fila y el borde de arriba del título del módulo pegado, y la barra superior de la app.
async function medir(page: Page) {
  return page.evaluate(() => {
    const contenedor = document.querySelector<HTMLElement>('[data-slot="table-container"]')!
    contenedor.scrollTop = contenedor.scrollHeight / 2
    const cabecera = document.querySelector<HTMLElement>('thead')!
    const barra = document.querySelector<HTMLElement>('header')!
    const titulos = [...document.querySelectorAll<HTMLElement>('th[scope="colgroup"]')]
    const abajo = cabecera.getBoundingClientRect().bottom
    const pegado = titulos
      .map((t) => t.getBoundingClientRect().top)
      .reduce((mejor, top) => (Math.abs(top - abajo) < Math.abs(mejor - abajo) ? top : mejor))
    // Entre el borde de arriba de la fila y el borde de abajo del título pegado, lo de arriba es la fila o el título: ningún permiso se cuela.
    const arriba = Math.max(
      cabecera.getBoundingClientRect().top,
      barra.getBoundingClientRect().bottom,
    )
    const tituloPegado = titulos.find((t) => Math.abs(t.getBoundingClientRect().top - abajo) <= 2)
    const hasta = tituloPegado?.getBoundingClientRect().bottom ?? abajo
    const colados: string[] = []
    const ancho = contenedor.getBoundingClientRect().width
    const izquierda = contenedor.getBoundingClientRect().left
    for (let y = Math.ceil(arriba) + 1; y < hasta - 1; y += 1) {
      for (let x = izquierda + 20; x < izquierda + ancho - 20; x += 40) {
        const dentro = document.elementFromPoint(x, y)
        if (
          dentro &&
          contenedor.contains(dentro) &&
          !dentro.closest('thead') &&
          !dentro.closest('th[scope="colgroup"]')
        ) {
          colados.push(`${String(Math.round(x))},${String(y)}: ${dentro.tagName}`)
        }
      }
    }
    return {
      colados,
      contenedor: contenedor.getBoundingClientRect().top,
      barra: barra.getBoundingClientRect().bottom,
      cabeceraArriba: cabecera.getBoundingClientRect().top,
      cabeceraAbajo: abajo,
      titulo: pegado,
      desplazaLaPagina: contenedor.scrollHeight <= contenedor.clientHeight,
    }
  })
}

// Desde 768 px la fila con los nombres de los roles queda a ras del borde de arriba de lo que se desplaza (la tarjeta; si la página, la
// barra superior), sin hueco, y el título del módulo a ras de la fila. El celular no tiene esa fila: su barra la cubre `roles-a-la-vista`.
for (const tamano of [
  { ancho: 1280, alto: 800 },
  { ancho: 1920, alto: 1080 },
]) {
  for (const menu of ['desplegado', 'plegado'] as const) {
    for (const zoom of ['100 %', '200 %'] as const) {
      test(`la fila de los roles queda a ras del borde, ${String(tamano.ancho)}×${String(tamano.alto)}, menú ${menu}, ${zoom}`, async ({
        page,
      }) => {
        test.skip(esMovil(page), 'el celular no tiene esa fila: su barra la cubre roles-a-la-vista')
        await page.setViewportSize({ width: tamano.ancho, height: tamano.alto })
        if (zoom === '200 %') await textoGrandeAlCargar(page)
        await entrar(page)
        if (menu === 'plegado') {
          await page.keyboard.press('ControlOrMeta+b')
          await page.waitForTimeout(400)
        }
        const m = await medir(page)
        await page.waitForTimeout(100)
        const despues = await medir(page)
        expect(Math.abs(despues.cabeceraArriba - m.cabeceraArriba)).toBeLessThanOrEqual(1)
        expect(despues.colados, 'permisos entre la fila, el título y el borde').toEqual([])
        expect(
          Math.abs(despues.cabeceraArriba - despues.contenedor),
          'fila ↔ contenedor',
        ).toBeLessThanOrEqual(1)
        expect(
          Math.abs(despues.titulo - despues.cabeceraAbajo),
          'título ↔ fila',
        ).toBeLessThanOrEqual(1)
      })
    }
  }

  // Si la que se desplaza es la página (la tarjeta ya llegó a lo más alto que puede): la fila queda a ras de la barra superior, ni tapada
  // por ella ni con un hueco.
  test(`con la página desplazada hasta el final, la fila queda a ras de la barra superior, ${String(tamano.ancho)}×${String(tamano.alto)}`, async ({
    page,
  }) => {
    test.skip(esMovil(page), 'el celular no tiene esa fila: su barra la cubre roles-a-la-vista')
    await page.setViewportSize({ width: tamano.ancho, height: tamano.alto })
    await entrar(page)
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await page.waitForTimeout(200)
    const m = await medir(page)
    expect(Math.abs(m.cabeceraArriba - m.barra), 'fila ↔ barra superior').toBeLessThanOrEqual(1)
    expect(m.colados).toEqual([])
  })
}
