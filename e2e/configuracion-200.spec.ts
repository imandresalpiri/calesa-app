import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { ingresar } from './soporte/pasos'
import {
  aLaVistaAlAcomodarse,
  aLaVistaSinDesplazar,
  recibeElClic,
  sinScrollHorizontal,
  sinTextoCortado,
  textoGrandeAlCargar,
} from './soporte/recorrido'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'

// Configuración al 200 % del texto (5a-18 y c.1/c.2 de la sesión de defectos al 200 %): cada pantalla de Configuración, en el celular y en
// escritorio, no ensancha la página (`sinScrollHorizontal`), deja a la vista su título, su pestaña activa y lo que pone al borde derecho
// (`aLaVistaSinDesplazar`). El texto crece **antes** de cargar, como lo tiene quien lo configuró en su navegador: lo que se mide es lo
// que esa persona ve al entrar. Una prueba por pantalla y sin `serial`: cuando una cae, las demás siguen y dicen cuáles más fallan.

const CLAVE = 'una-clave-de-prueba-9'
const LARGO =
  'Subasta internacional de vehículos livianos y pesados de Norteamérica y del Asia oriental'

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-200-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Doscientos' })
  origen = await crearOrigenDePrueba(LARGO, `largo_${info.project.name}`)
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

type Pantalla = {
  titulo: string
  url: () => string
  // El título que tiene que verse: el de la página, o el de un drawer que la URL abre (en el celular va a todo lo ancho y la página queda inerte).
  encabezado?: (page: Page) => Locator
  // Lo que se pega al borde derecho y tiene que verse sin desplazar nada, con cómo se llama en el mensaje.
  controles?: (page: Page) => [Locator, string][]
}

const DE_UN_ORIGEN = (seccion: string) => () => `/configuracion/origenes/${origen.id}/${seccion}`

const PANTALLAS: Pantalla[] = [
  { titulo: 'el centro de Configuración', url: () => '/configuracion/inicio' },
  { titulo: 'Empresa › Datos de la empresa', url: () => '/configuracion/empresa' },
  {
    titulo: 'Empresa › Monedas y tipos de cambio',
    url: () => '/configuracion/empresa/monedas',
    controles: (page) => [
      [
        page
          .getByText(/^1 [A-Z]{3} =$/)
          .first()
          .locator('..'),
        'el valor de la primera tarjeta de tipo de cambio',
      ],
    ],
  },
  { titulo: 'Empresa › Integraciones', url: () => '/configuracion/empresa/integraciones' },
  { titulo: 'Empresa › Comprobantes', url: () => '/configuracion/empresa/comprobantes' },
  {
    titulo: 'Orígenes',
    url: () => '/configuracion/origenes',
    controles: (page) => [
      [
        page.getByRole('button', { name: 'Más acciones de Colores' }),
        'el «⋯» de la tarjeta Colores',
      ],
      [
        page.getByRole('button', { name: 'Más acciones de Vigencia' }),
        'el «⋯» de la tarjeta Vigencia',
      ],
    ],
  },
  {
    titulo: 'la página de un origen › Fases',
    url: DE_UN_ORIGEN('fases'),
    controles: (page) => [
      [page.getByRole('button', { name: `Más acciones de ${origen.nombre}` }), 'el «⋯» del origen'],
      [
        page
          .getByRole('group', { name: 'Catálogos' })
          .getByRole('button', { name: 'Tipos de documento' }),
        'el último catálogo de arriba del diagrama',
      ],
    ],
  },
  {
    titulo: 'la página de un origen › Fases › Puertos',
    url: DE_UN_ORIGEN('fases?panel=puertos'),
    encabezado: (page) =>
      page
        .getByRole('dialog', { name: 'Puertos' })
        .getByRole('heading', { name: 'Puertos', exact: true }),
    controles: (page) => [
      [
        page.getByRole('dialog', { name: 'Puertos' }).getByRole('button', { name: 'Nuevo puerto' }),
        '«Nuevo puerto» del drawer',
      ],
    ],
  },
  {
    titulo: 'la página de un origen › Fases › Tipos de documento',
    url: DE_UN_ORIGEN('fases?panel=tipos-de-documento'),
    encabezado: (page) =>
      page
        .getByRole('dialog', { name: 'Tipos de documento' })
        .getByRole('heading', { name: 'Tipos de documento', exact: true }),
    controles: (page) => [
      [
        page
          .getByRole('dialog', { name: 'Tipos de documento' })
          .getByRole('button', { name: 'Nuevo tipo de documento' }),
        '«Nuevo tipo de documento» del drawer',
      ],
    ],
  },
  {
    titulo: 'la página de un origen › Planilla',
    url: () => urlDeLaFormula(origen.id, 'planilla'),
  },
  {
    titulo: 'la página de un origen › Hoja',
    url: () => urlDeLaFormula(origen.id, 'hoja'),
  },
  { titulo: 'la página de un origen › Campos', url: DE_UN_ORIGEN('campos') },
  { titulo: 'la página de un origen › Categorías', url: DE_UN_ORIGEN('categorias') },
  { titulo: 'Leads › Campos', url: () => '/configuracion/leads/campos' },
  { titulo: 'Leads', url: () => '/configuracion/leads' },
  { titulo: 'Repuestos › Flujo de repuestos', url: () => '/repuestos/configuracion/flujo' },
  {
    titulo: 'Equipo',
    url: () => '/configuracion/equipo',
    controles: (page) => [
      [
        page.getByRole('button', { name: /^(Acciones sobre|Más acciones de) / }).first(),
        'el «⋯» de la primera persona',
      ],
    ],
  },
  { titulo: 'Roles', url: () => '/configuracion/roles' },
]

for (const pantalla of PANTALLAS) {
  test(`al 200 %: ${pantalla.titulo} no ensancha la página y deja a la vista lo suyo`, async ({
    page,
  }) => {
    await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto(pantalla.url())
    const encabezado = pantalla.encabezado?.(page) ?? page.getByRole('heading', { level: 1 })
    await expect(encabezado).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('200%')
    await sinScrollHorizontal(page)
    await aLaVistaSinDesplazar(encabezado, 'el título')
    const activa = page.getByRole('tab', { selected: true })
    if ((await activa.count()) > 0) {
      // La barra se desplaza hasta la pestaña abierta recién al hidratar (CI-3).
      await aLaVistaAlAcomodarse(activa.first(), 'la pestaña activa')
    }
    for (const [lugar, que] of pantalla.controles?.(page) ?? []) {
      await aLaVistaSinDesplazar(lugar, que)
    }
  })
}

// Lo que cabe en el relleno de su contenedor: el borde derecho de `lugar` no pasa el del contenido de su ancestro `selector` más cercano (5a-29).
async function dentroDe(lugar: Locator, selector: string, que: string): Promise<void> {
  const m = await lugar.evaluate((e, sel) => {
    const contenedor = e.closest(sel)
    if (!contenedor) return null
    const estilo = getComputedStyle(contenedor)
    const limite =
      contenedor.getBoundingClientRect().right -
      Number.parseFloat(estilo.borderRightWidth) -
      Number.parseFloat(estilo.paddingRight)
    return { derecha: e.getBoundingClientRect().right, limite }
  }, selector)
  expect(m, `${que}: no está dentro de ${selector}`).not.toBeNull()
  expect(m?.derecha ?? 0, `${que}: pasa el relleno de ${selector}`).toBeLessThanOrEqual(
    (m?.limite ?? 0) + 0.5,
  )
}

// 5a-29: los datos de un origen al 200 %: la clave interna cabe en su drawer (se parte, no se corta).
test('al 200 %: en los datos de un origen la clave interna cabe', async ({ page }, info) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  // Una clave de 28 caracteres en monoespaciada: al 200 % no cabe en una línea.
  const conClaveLarga = await crearOrigenDePrueba(
    'Origen de clave larga',
    `clave_interna_${info.project.name}`,
  )
  await page.goto(`/configuracion/origenes/${conClaveLarga.id}/campos?panel=datos`)
  const datos = page.getByRole('dialog', { name: 'Datos del origen' })
  await expect(datos).toBeVisible()
  await dentroDe(datos.locator('dd.font-mono').first(), '[role="dialog"]', 'la clave interna')
})

// 5a-28: el modal de apibara (la dirección del servicio y las plataformas) no pasa del relleno de su cuerpo con el texto al 200 % desde la carga.
test('al 200 %: nada del modal de apibara pasa del relleno de su cuerpo', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  await page.goto('/configuracion/empresa/integraciones')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page
    .getByRole('region', { name: 'apibara', exact: true })
    .getByRole('button', { name: 'Configurar apibara', exact: true })
    .click()
  const dialogo = page.getByRole('dialog', { name: 'Configurar apibara' })
  await expect(dialogo).toBeVisible()
  const pasan = await dialogo.evaluate((modal) => {
    const limite = modal.getBoundingClientRect().right
    return [...modal.querySelectorAll('*')].flatMap((e) => {
      const c = e.getBoundingClientRect()
      return c.width > 0 && c.right > limite + 0.5
        ? [
            `${e.tagName.toLowerCase()} «${e.textContent.trim().slice(0, 30)}» llega a ${String(Math.round(c.right))} de ${String(Math.round(limite))}`,
          ]
        : []
    })
  })
  expect(pasan, 'descendientes que pasan del borde del modal').toEqual([])
})

// Empresa › Monedas: con el texto al 200 % en 412 px cada tarjeta de tipo de cambio se lee entera (nombre, valor, quién y cuándo, «En la barra») y las
// fichas de las monedas no se salen de su tarjeta.
test('al 200 %: en Monedas se leen enteras las tarjetas de los tipos de cambio y las monedas', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  await page.goto('/configuracion/empresa/monedas')
  await expect(page.getByRole('heading', { name: /^[A-Z]{3} a [A-Z]{3}$/ }).first()).toBeVisible()
  const tarjetas = page.getByRole('region').filter({ has: page.getByText(/^1 [A-Z]{3} =$/) })
  expect(await tarjetas.count()).toBeGreaterThan(0)
  for (const tarjeta of await tarjetas.all()) {
    await sinTextoCortado(tarjeta)
  }
  await sinTextoCortado(page.getByRole('region', { name: 'Monedas activas', exact: true }))
  await sinTextoCortado(page.getByRole('region', { name: 'Moneda base', exact: true }))
})

// c.1: Configuración › Leads es una página de tarjetas y «Campos» su sub-ruta. Con el texto al 200 % el menú pasa al selector de sección, que dice cuál se
// ve, y el título de la página queda a la vista: antes de cargar y al ampliar con la página abierta.
const SECCIONES_DE_LEADS = ['/configuracion/leads/campos', '/configuracion/leads'] as const

for (const ruta of SECCIONES_DE_LEADS) {
  test(`al 200 % antes de cargar: el selector dice «${ruta}» y su título está a la vista`, async ({
    page,
  }) => {
    await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto(ruta)
    await expect(page.getByLabel('Sección')).toHaveValue(ruta)
    await aLaVistaSinDesplazar(page.getByRole('heading', { level: 1 }), `el título de «${ruta}»`)
  })

  test(`al ampliar el texto con la página abierta: el título de «${ruta}» sigue a la vista`, async ({
    page,
  }) => {
    await entrar(page)
    await page.goto(ruta)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await aLaVistaAlAcomodarse(page.getByRole('heading', { level: 1 }), `el título de «${ruta}»`)
  })
}

// c.2: con el texto al 200 % se llega a «Sin icono» y a cada una de las 24 claves del selector desplazando el cuerpo del modal, con el pie
// fijo: cada opción recibe el clic y no cae bajo el pie.
for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: el selector de iconos llega a «Sin icono» y a las 24 claves con el pie fijo`, async ({
    page,
  }) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto('/configuracion/leads?panel=seguimientos')
    await page.getByRole('button', { name: 'Nuevo tipo' }).click()
    const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
    await expect(modal).toBeVisible()
    const opciones = modal.getByRole('group', { name: 'Icono' }).locator('label')
    expect(await opciones.count(), 'Sin icono más las 24 claves').toBe(25)
    const pie = modal.locator('[data-slot=dialog-footer]')
    await expect(pie).toBeVisible()
    for (let i = 0; i < 25; i++) {
      const opcion = opciones.nth(i)
      await opcion.scrollIntoViewIfNeeded()
      await recibeElClic(opcion)
      const [caja, cajaDelPie] = await Promise.all([opcion.boundingBox(), pie.boundingBox()])
      expect(
        caja && cajaDelPie && caja.y + caja.height <= cajaDelPie.y + 0.5,
        `la opción ${String(i)} cae bajo el pie`,
      ).toBe(true)
    }
  })
}
