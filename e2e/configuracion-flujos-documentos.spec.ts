// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
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
  elegirDelMenuConTeclado,
  lineaApagada,
  masAccionesDe,
  menuDe,
} from './soporte/lista-de-catalogo'
import {
  PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E,
  abrirDocumentos,
  borrarTiposDeDocumentoDePrueba,
  drawerDeTipos,
  modalDeTipo,
  nombreDelOrigen,
  nombresDelGrupo,
  origenDeLaSubasta,
  seccionDelGrupo,
  sembrarTipoCompartido,
  sembrarTipoDelFlujo,
  tipoEnLaBase,
  usarEnUnRequisito,
} from './soporte/tipos-de-documento'

// Los tipos de documento (5.09, `docs/UX.md` › «Flujos: tipos de documento (estados propios)»): en el drawer «Tipos de documento» de la pestaña Fases de un
// origen la dueña crea un tipo «Sólo de <origen>» con vencimiento, lo edita, lo sube de orden, desactiva uno en uso (y lee por qué no se elimina) y elimina
// uno sin uso; quien sólo configura el flujo ve los compartidos deshabilitados, con el motivo, y cambia los de su flujo; un propio tapa al compartido de su
// nombre y el drawer lo marca. Un solo recorrido del camino feliz: la base ya tiene sus pruebas de cada regla.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarTiposDeDocumentoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-documentos-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-documentos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Documentos' })
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Documentos ${proyecto}`,
      clave: `e2e_documentos_${proyecto}`,
    },
    permisos: ['flujos.configurar'],
  })
})

test.afterAll(async () => {
  borrarTiposDeDocumentoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña crea un tipo del flujo con vencimiento, lo edita y lo sube de orden', async ({
  page,
}) => {
  const primero = nombre('Seguro')
  const renombrado = nombre('Seguro marítimo')
  const segundo = nombre('Factura')
  await entrar(page, duena, { fresco: true })
  // En el drawer, los suyos («De <origen>») y debajo los compartidos de la semilla, cada grupo con su título.
  await abrirDocumentos(page)
  await expect(drawerDeTipos(page)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compartidos', level: 3 })).toBeVisible()
  await expect(
    seccionDelGrupo(page, 'compartido').getByRole('button', { name: 'Editar BL', exact: true }),
  ).toBeVisible()
  const flujo = seccionDelGrupo(page, 'origen')

  // Crear con vencimiento «renovar»: 365 días de vigencia y aviso a los 30.
  await drawerDeTipos(page).getByRole('button', { name: 'Nuevo tipo de documento' }).click()
  const nuevo = modalDeTipo(page, 'Nuevo tipo de documento')
  await expect(nuevo).toBeVisible()
  await expect(page).toHaveURL(/accion=nuevo-tipo&de=origen/)
  // «Para» empieza en «Sólo de <origen>».
  await expect(
    nuevo.getByRole('radio', { name: `Sólo de ${nombreDelOrigen(origenDeLaSubasta())}` }),
  ).toBeChecked()
  await nuevo.getByLabel('Nombre').fill(primero)
  await nuevo.getByLabel('Vencimiento').selectOption('renovar')
  await nuevo.getByLabel('Días de vigencia').fill('365')
  await nuevo.getByLabel('Días de aviso (opcional)').fill('30')
  await nuevo.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(nuevo).toBeHidden()
  const fila = flujo
    .locator('tr, li')
    .filter({ has: page.getByRole('button', { name: `Abrir ${primero}`, exact: true }) })
  await expect(fila).toContainText('Renueva cada 365 días')
  expect(tipoEnLaBase(primero)).toMatchObject({
    modo: 'renovar',
    vigencia: '365',
    aviso: '30',
    activo: true,
  })

  // Editar: un clic en la fila, nuevo nombre.
  await page.getByRole('button', { name: `Abrir ${primero}`, exact: true }).click()
  const edicion = modalDeTipo(page, 'Editar tipo de documento')
  await expect(edicion).toBeVisible()
  await expect(page).toHaveURL(/accion=editar-tipo&tipo=/)
  await expect(edicion.getByLabel('Días de vigencia')).toHaveValue('365')
  await edicion.getByLabel('Nombre').fill(renombrado)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion).toBeHidden()
  await expect(page.getByRole('button', { name: `Abrir ${renombrado}`, exact: true })).toBeVisible()
  expect(tipoEnLaBase(renombrado)).toMatchObject({ vigencia: '365' })

  // Subir de orden: uno sembrado queda debajo; «Subir» lo pone antes.
  sembrarTipoDelFlujo(segundo)
  await abrirDocumentos(page)
  const antes = await nombresDelGrupo(page, 'origen')
  expect(antes.indexOf(renombrado)).toBeLessThan(antes.indexOf(segundo))
  await elegirDelMenuConTeclado(page, segundo, 'Subir')
  await expect(
    page.getByRole('status').filter({ hasText: `«${segundo}» subió un lugar.` }),
  ).toBeAttached()
  await expect
    .poll(async () => {
      const despues = await nombresDelGrupo(page, 'origen')
      return despues.indexOf(segundo) < despues.indexOf(renombrado)
    })
    .toBe(true)
  // Llegó al extremo: «Subir» se apagó en su «⋯», donde el foco se queda.
  await expect(masAccionesDe(page, segundo)).toBeFocused()
  expect(await lineaApagada(page, segundo, 'Subir')).toBe(true)
  expect(tipoEnLaBase(segundo)?.orden).toBeLessThan(tipoEnLaBase(renombrado)?.orden ?? 0)
})

test('desactiva uno en uso (y lee por qué no se elimina) y elimina uno sin uso', async ({
  page,
}) => {
  const enUso = nombre('Póliza')
  const sinUso = nombre('Recibo')
  sembrarTipoDelFlujo(enUso)
  sembrarTipoDelFlujo(sinUso)
  usarEnUnRequisito(enUso)
  await entrar(page, duena, { fresco: true })
  await abrirDocumentos(page)
  const flujo = seccionDelGrupo(page, 'origen')
  // Uno en uso: se ve cuánto, no se elimina (se dice por qué) y sí se desactiva.
  const filaEnUso = flujo
    .locator('tr, li')
    .filter({ has: page.getByRole('button', { name: `Abrir ${enUso}`, exact: true }) })
  await expect(filaEnUso).toContainText('Lo usa 1 requisito')
  await masAccionesDe(page, enUso).click()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(menuDe(page, enUso)).toContainText('se desactiva en lugar de eliminarse')
  await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click()
  await expect(filaEnUso.getByText('Desactivado')).toBeVisible()
  expect(tipoEnLaBase(enUso)).toMatchObject({ activo: false })

  // Uno sin uso: «Eliminar» pide confirmar nombrándolo y lo borra.
  await masAccionesDe(page, sinUso).click()
  await page.getByRole('menuitem', { name: 'Eliminar', exact: true }).click()
  await expect(page).toHaveURL(/accion=eliminar-tipo&tipo=/)
  const confirmar = page.getByRole('dialog', {
    name: `Eliminar el tipo de documento «${sinUso}»`,
  })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar tipo' }).click()
  await expect(confirmar).toBeHidden()
  await expect(page.getByRole('button', { name: `Abrir ${sinUso}`, exact: true })).toBeHidden()
  expect(tipoEnLaBase(sinUso)).toBeNull()
})

test('quien sólo configura el flujo ve los tipos compartidos deshabilitados, con el motivo', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirDocumentos(page)
  const compartidos = seccionDelGrupo(page, 'compartido')
  const motivo = 'Pídele a quien administra los roles el permiso de configurar la logística.'
  await expect(compartidos.getByText(motivo)).toBeVisible()
  expect(await lineaApagada(page, 'BL', 'Subir')).toBe(true)
  expect(await lineaApagada(page, 'BL', 'Editar')).toBe(true)
  // Lo de su flujo sí lo puede cambiar: «Nuevo tipo de documento» abre con «Sólo de <origen>» y «Compartido» apagado con el motivo.
  await drawerDeTipos(page).getByRole('button', { name: 'Nuevo tipo de documento' }).click()
  const nuevo = modalDeTipo(page, 'Nuevo tipo de documento')
  await expect(nuevo).toBeVisible()
  await expect(
    nuevo.getByRole('radio', { name: 'Compartido con todos los orígenes' }),
  ).toBeDisabled()
  await expect(nuevo.getByText(motivo)).toBeVisible()
  // Escribir a mano `de=compartido` no lo deja crear compartido: abre en «Sólo de <origen>».
  // (con el modal abierto el drawer queda inerte: se espera el modal, no el título del grupo)
  await page.goto(
    `/configuracion/origenes/${origenDeLaSubasta()}/fases?panel=tipos-de-documento&accion=nuevo-tipo&de=compartido`,
  )
  await expect(
    modalDeTipo(page, 'Nuevo tipo de documento').getByRole('radio', {
      name: `Sólo de ${nombreDelOrigen(origenDeLaSubasta())}`,
    }),
  ).toBeChecked()
})

test('un tipo propio tapa al compartido de su nombre: el drawer lo marca en la misma línea', async ({
  page,
}) => {
  const compartido = nombre('Tapado')
  const otro = nombre('Sin tapar')
  sembrarTipoCompartido(compartido)
  sembrarTipoCompartido(otro)
  // El mismo nombre sin importar mayúsculas: lo tapa en este origen.
  sembrarTipoDelFlujo(compartido.toUpperCase())
  await entrar(page, duena, { fresco: true })
  await abrirDocumentos(page)
  const compartidos = seccionDelGrupo(page, 'compartido')
  // La celda del nombre: la insignia va ahí, en la misma línea que él (la celda no parte la línea).
  const celdaDelNombre = (cual: string) =>
    compartidos
      .locator('td')
      .filter({ has: page.getByRole('button', { name: `Editar ${cual}`, exact: true }) })
  const insignia = `Tapado por el de ${nombreDelOrigen(origenDeLaSubasta())}`
  await expect(celdaDelNombre(compartido).getByText(insignia, { exact: true })).toBeVisible()
  await expect(celdaDelNombre(otro).getByText(insignia, { exact: true })).toHaveCount(0)
  // El propio no lleva insignia.
  await expect(seccionDelGrupo(page, 'origen').getByText(insignia)).toHaveCount(0)
})
