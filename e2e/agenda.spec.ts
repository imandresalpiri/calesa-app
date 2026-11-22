import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { exigir } from './soporte/leads'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { meterRecordatorio } from './soporte/leads-seguimientos'
import {
  abrirVistaYOpciones,
  botonDeVistaYOpciones,
  cerrarVistaYOpciones,
  seccionDeVistaYOpciones,
} from './soporte/vista-y-opciones'

// Agenda (7.07-1, sólo lectura): la hoja del día. El evento «seleccionados» de la dueña lo ve la asesora invitada y no un tercero; la tarea
// de la asesora la ve ella en su día y la dueña, sólo con «Vista y opciones» › «De todos». `?de=todos` sin permiso no rompe ni dibuja el grupo.
// 7.07-2: la dueña crea, ve, edita y elimina un evento por la interfaz y le da una tarea a la asesora; la asesora los ve.
// 7.07-3: la asesora completa y reabre su tarea (sin poder cambiar de responsable), ve sus tareas sin fecha en los pendientes y completa un recordatorio; la bandeja lo refleja.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let eventoId = ''
let tareaId = ''
const rotulo = (proyecto: string) => `Agenda e2e ${proyecto}`
// Los chips: los de la hoja del día (una tarea vencida sale también en «Pendientes»).
const hojaDe = (page: Page) => page.getByRole('region', { name: 'Hoja del día' })

// La tecla N abre «Nuevo» y ahí se elige qué agendar. El atajo de la agenda existe recién cuando hidrató; antes, la «n» la toma el «Nuevo
// lead» del marco (de respaldo): se lo cierra y se insiste. Con el panel pedido (la URL lo dice) no se vuelve a pulsar.
async function nuevoEnLaAgenda(page: Page, que: 'Evento' | 'Tarea') {
  const modal = page.getByRole('dialog', { name: 'Nuevo', exact: true })
  await expect(async () => {
    const url = page.url()
    if (url.includes('panel=nuevo-lead')) await page.keyboard.press('Escape')
    else if (!url.includes('panel=nuevo-en-la-agenda')) await page.keyboard.press('n')
    await expect(modal).toBeVisible({ timeout: 1000 })
  }).toPass()
  await modal.getByRole('button', { name: new RegExp(`^${que}`) }).click()
}

// «Nuevo» › «Evento»: «Seleccionados» con la asesora de invitada.
async function crearEventoParaLaAsesora(page: Page, titulo: string, nombre: string) {
  const nuevo = page.getByRole('dialog', { name: 'Nuevo evento', exact: true })
  await nuevoEnLaAgenda(page, 'Evento')
  await expect(nuevo).toBeVisible()
  await nuevo.getByLabel('Título', { exact: true }).fill(titulo)
  await nuevo.getByRole('radio', { name: /Seleccionados/ }).check()
  await nuevo.getByLabel('¿Con quién?').fill(nombre)
  await nuevo.getByRole('button', { name: nombre, exact: true }).click()
  await expect(nuevo.getByRole('button', { name: `Quitar a ${nombre}` })).toBeVisible()
  await nuevo.getByRole('button', { name: 'Crear evento' }).click()
}

// «Nuevo en la agenda» › «Tarea» para la asesora, que vence hoy al final del día.
async function crearTareaParaLaAsesora(page: Page, tarea: string, nombre: string, hoy: string) {
  await page.getByRole('button', { name: 'Nuevo en la agenda' }).click()
  await page
    .getByRole('dialog', { name: 'Nuevo', exact: true })
    .getByRole('button', { name: /^Tarea/ })
    .click()
  const nueva = page.getByRole('dialog', { name: 'Nueva tarea', exact: true })
  await nueva.getByLabel('Título', { exact: true }).fill(tarea)
  await nueva.getByLabel('Vence').fill(`${hoy}T23:59`)
  await nueva.getByLabel('Para otra persona (opcional)').fill(nombre)
  await nueva.getByRole('button', { name: nombre, exact: true }).click()
  await nueva.getByRole('button', { name: 'Crear tarea' }).click()
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  const duena = await idDePersona(t.personas.duena)
  const berta = await idDePersona(t.personas.berta)
  const ahora = new Date().toISOString()
  // Recibir tareas: el rol de la asesora del terreno sólo trae permisos de leads; sin esto no sale entre quienes pueden recibir una tarea.
  const rol = await admin()
    .from('usuarios_roles')
    .select('rol_id')
    .eq('usuario_id', berta)
    .single<{ rol_id: string }>()
  exigir(rol.error, 'leer el rol de la asesora')
  exigir(
    (
      await admin()
        .from('roles_permisos')
        .insert({ rol_id: rol.data?.rol_id ?? '', permiso_clave: 'agenda.tareas.recibir' })
    ).error,
    'dar a la asesora el permiso de recibir tareas',
  )

  const evento = await admin()
    .from('eventos')
    .insert({
      titulo: `${rotulo(info.project.name)} reunión`,
      inicia_en: ahora,
      visibilidad: 'seleccionados',
      creado_por: duena,
    })
    .select('id')
    .single()
  exigir(evento.error, 'sembrar el evento')
  eventoId = evento.data?.id ?? ''
  exigir(
    (await admin().from('eventos_destinatarios').insert({ evento_id: eventoId, usuario_id: berta }))
      .error,
    'invitar a la asesora',
  )

  const tarea = await admin()
    .from('tareas')
    .insert({
      titulo: `${rotulo(info.project.name)} llamar`,
      vence_en: ahora,
      creado_por: duena,
      responsable_id: berta,
    })
    .select('id')
    .single()
  exigir(tarea.error, 'sembrar la tarea')
  tareaId = tarea.data?.id ?? ''
})

test.afterAll(async ({}, info) => {
  await admin().from('eventos').delete().eq('id', eventoId)
  await admin().from('tareas').delete().eq('id', tareaId)
  // Lo que crea la prueba de la interfaz (se borra por su rótulo; el evento eliminado sigue ahí, sólo marcado).
  await admin()
    .from('eventos')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} nuevo%`)
  await admin()
    .from('tareas')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} nueva%`)
  await admin()
    .from('tareas')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} sin fecha%`)
  await admin()
    .from('recordatorios')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} recordar%`)
  await limpiarListado(t)
})

test('la asesora ve el evento y su tarea en el día; un tercero no ve el evento', async ({
  page,
}, info) => {
  const evento = new RegExp(`${rotulo(info.project.name)} reunión`)
  const tarea = new RegExp(`${rotulo(info.project.name)} llamar`)

  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  // La tarea vence «ahora»: sale también en «Pendientes»; los chips son los de la hoja.
  const dia = hojaDe(page)
  await expect(
    dia.getByRole('listitem').filter({ hasText: evento }).getByText('Evento'),
  ).toBeVisible()
  await expect(
    dia.getByRole('listitem').filter({ hasText: tarea }).getByText('Tarea'),
  ).toBeVisible()
  // Sin `agenda.ver_todo` no hay «Qué agenda ver», y pedir la de todos por la URL no rompe: se ve la suya.
  await abrirVistaYOpciones(page)
  await expect(seccionDeVistaYOpciones(page, 'Qué ver')).toBeVisible()
  await expect(seccionDeVistaYOpciones(page, 'Qué agenda ver')).toHaveCount(0)
  await cerrarVistaYOpciones(page)
  await page.goto('/agenda?vista=dia&de=todos')
  await expect(dia.getByText(evento)).toBeVisible()

  // Un tercero (otra asesora, no invitada): ni el evento ni la tarea.
  await page.context().clearCookies()
  await entrar(page, t.personas.carlos)
  await page.goto('/agenda?vista=dia')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(evento)).toBeHidden()
  await expect(page.getByText(tarea)).toBeHidden()
})

test('la dueña ve la tarea de la asesora con «De todos» y lo elegido queda en la URL', async ({
  page,
}, info) => {
  const tarea = new RegExp(`${rotulo(info.project.name)} llamar`)
  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await expect(page.getByText(tarea)).toBeHidden()
  await expect(botonDeVistaYOpciones(page)).toContainText('Mi agenda')
  await abrirVistaYOpciones(page)
  await seccionDeVistaYOpciones(page, 'Qué agenda ver')
    .getByRole('button', { name: 'De todos', exact: true })
    .click()
  await expect(page).toHaveURL(/de=todos/)
  await cerrarVistaYOpciones(page)
  await expect(botonDeVistaYOpciones(page)).toContainText('De todos')
  // La tarea de la asesora en la hoja; los pendientes siguen siendo los de la dueña.
  await expect(hojaDe(page).getByText(tarea)).toBeVisible()

  // Navegar guarda lo elegido en la URL.
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page).toHaveURL(/vista=semana/)
  await expect(page).toHaveURL(/de=todos/)

  // El mes (grilla en el escritorio, lista en el celular) trae lo mismo.
  await page.getByRole('tab', { name: 'Mes' }).click()
  await expect(page).toHaveURL(/vista=mes/)
  await expect(page.getByText(tarea)).toBeVisible()
})

// @sin-celular: el camino feliz de crear, editar y eliminar es el mismo en el celular; los paneles se miden aparte en la Fase 9
test('E2E la dueña crea, ve, edita y elimina un evento y le da una tarea a la asesora', async ({
  page,
}, info) => {
  const titulo = `${rotulo(info.project.name)} nuevo evento`
  const editado = `${titulo} editado`
  const tarea = `${rotulo(info.project.name)} nueva tarea`
  const berta = await admin()
    .from('perfiles')
    .select('nombre')
    .eq('id', await idDePersona(t.personas.berta))
    .single()
  exigir(berta.error, 'leer el nombre de la asesora')
  const nombre = berta.data?.nombre ?? ''
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date())

  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await crearEventoParaLaAsesora(page, titulo, nombre)

  // Crear lleva al detalle del evento nuevo, con la asesora entre los invitados.
  const detalle = page.getByRole('dialog', { name: 'Evento', exact: true })
  await expect(detalle.getByRole('heading', { name: titulo })).toBeVisible()
  await expect(detalle.getByText(nombre)).toBeVisible()
  await expect(page).toHaveURL(/evento=/)
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()
  await expect(hojaDe(page).getByRole('link', { name: new RegExp(titulo) })).toBeVisible()

  // La tarea para la asesora, que vence hoy al final del día.
  await crearTareaParaLaAsesora(page, tarea, nombre, hoy)
  const detalleDeTarea = page.getByRole('dialog', { name: 'Tarea', exact: true })
  await expect(detalleDeTarea.getByRole('heading', { name: tarea })).toBeVisible()
  await expect(detalleDeTarea.getByText(nombre)).toBeVisible()
  // Quien la creó con `agenda.tareas.asignar` puede cambiarla de responsable.
  await expect(detalleDeTarea.getByRole('button', { name: 'Cambiar de responsable' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalleDeTarea).toBeHidden()

  // Editar el título del evento desde su panel.
  await hojaDe(page)
    .getByRole('link', { name: new RegExp(titulo) })
    .click()
  await detalle.getByRole('button', { name: 'Editar' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar evento', exact: true })
  await edicion.getByLabel('Título', { exact: true }).fill(editado)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(detalle.getByRole('heading', { name: editado })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()

  // La asesora ve el evento y la tarea con sus palabras, y no puede editar ni eliminar lo que no creó.
  await page.context().clearCookies()
  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  const dia = hojaDe(page)
  // El chip dice su clase con texto, además del título.
  await expect(
    dia.getByRole('link', { name: new RegExp(`^Evento [0-9]+:[0-9]+ ${editado}`) }),
  ).toBeVisible()
  await expect(
    dia.getByRole('link', { name: new RegExp(`^Tarea [0-9]+:[0-9]+ ${tarea}`) }),
  ).toBeVisible()
  // Completa su tarea y la reabre; no puede cambiarla de responsable ni editarla (no la creó).
  await dia.getByRole('link', { name: new RegExp(`^Tarea [0-9]+:[0-9]+ ${tarea}`) }).click()
  await expect(detalleDeTarea.getByRole('heading', { name: tarea })).toBeVisible()
  await expect(detalleDeTarea.getByRole('button', { name: 'Cambiar de responsable' })).toBeHidden()
  await expect(detalleDeTarea.getByRole('button', { name: 'Editar' })).toBeHidden()
  await detalleDeTarea.getByRole('button', { name: 'Marcar como hecha' }).click()
  await expect(detalleDeTarea.getByText(/^Hecha el /)).toBeVisible()
  await detalleDeTarea.getByRole('button', { name: 'Reabrir' }).click()
  await expect(detalleDeTarea.getByText('Pendiente', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalleDeTarea).toBeHidden()

  await dia.getByRole('link', { name: new RegExp(editado) }).click()
  await expect(detalle.getByRole('heading', { name: editado })).toBeVisible()
  await expect(detalle.getByRole('button', { name: 'Editar' })).toBeHidden()
  await expect(detalle.getByRole('button', { name: 'Eliminar' })).toBeHidden()

  // La dueña elimina el evento (confirma por URL) y deja de verse.
  await page.context().clearCookies()
  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await hojaDe(page)
    .getByRole('link', { name: new RegExp(editado) })
    .click()
  await detalle.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page).toHaveURL(/eliminar=evento/)
  await page.getByRole('button', { name: 'Eliminar evento' }).click()
  await expect(page).not.toHaveURL(/evento=/)
  await expect(page.getByRole('main').getByText(editado)).toBeHidden()
})

// @sin-celular: el camino feliz del grupo «Sin fecha» y del recordatorio es el mismo en el celular; los paneles se miden aparte en la Fase 9
test('E2E la asesora ve sus tareas sin fecha y completa un recordatorio', async ({
  page,
}, info) => {
  const sinFecha = `${rotulo(info.project.name)} sin fecha`
  const recordar = `${rotulo(info.project.name)} recordar`
  const berta = await idDePersona(t.personas.berta)
  exigir(
    (
      await admin()
        .from('tareas')
        .insert({ titulo: sinFecha, creado_por: berta, responsable_id: berta })
    ).error,
    'sembrar la tarea sin fecha',
  )
  const lead = await nuevoLead({
    corto: `Agenda Recordatorio ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  // Hace un minuto: es de hoy (o vencido, si cruzó la medianoche) sin depender de la hora a la que corra.
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: recordar,
    recordarEn: new Date(Date.now() - 60_000).toISOString(),
  })

  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  // Las tareas sin fecha son el grupo «Sin fecha» de los pendientes.
  await expect(
    page
      .getByRole('region', { name: 'Pendientes' })
      .getByRole('region', { name: 'Sin fecha' })
      .getByRole('link', { name: new RegExp(sinFecha) }),
  ).toBeVisible()

  // El recordatorio abre su panel desde la hoja y se completa.
  await hojaDe(page)
    .getByRole('link', { name: new RegExp(`^Recordatorio [0-9]+:[0-9]+ ${recordar}`) })
    .click()
  const panel = page.getByRole('dialog', { name: 'Recordatorio', exact: true })
  await expect(panel.getByRole('heading', { name: recordar })).toBeVisible()
  await expect(page).toHaveURL(/recordatorio=/)
  await panel.getByRole('button', { name: 'Completar' }).click()
  await expect(panel.getByText('Completado', { exact: true })).toBeVisible()

  // La bandeja de inicio: «Mis tareas» trae la tarea sin fecha y «Recordatorios de hoy» ya no trae el recordatorio.
  await page.goto('/')
  const misTareas = page.getByRole('region', { name: 'Mis tareas' })
  await expect(misTareas.getByRole('link', { name: new RegExp(sinFecha) })).toBeVisible()
  // Con una sola tarea el bloque no llega a su tope: «Ver todas» sólo se dibuja con tope (lo cubre `inicio-ver-todos.spec.ts`).
  await expect(misTareas.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)
  await expect(page.getByText(recordar)).toBeHidden()
})
