import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import {
  PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB,
  PRESUPUESTO_DE_JS_EN_KB,
} from './soporte/presupuestos'
import { expect, test } from './soporte/prueba'
import { crearLead } from './soporte/leads'
import { literal, sql } from './soporte/sql'

// El JS que paga quien llega por primera vez a una pantalla (`e2e/soporte/js-en-frio.ts`), contra el build.
// Falla por encima del presupuesto de la ruta (`e2e/soporte/presupuestos.ts`): el shell (el layout de
// `(app)`) importa sólo lo que dibuja el marco, y lo que no se ve al abrir (la ficha, un modal) llega con
// `import()` (`.claude/rules/escala.md`).
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}

// La hoja de cotizar se mide con la subasta de la semilla: sin `?origen=` abriría el primero, que puede no tener fórmula y pesar menos. La página de una cotización guardada, con
// una sembrada en esa misma subasta (4.15-3), que el spec crea y quita.
const TITULO_DEL_VEHICULO_MEDIDO = 'E2E JS de una cotización guardada'
let cotizacionMedida = ''
// «Comparar cotizaciones» (T311) se mide con dos cotizaciones de OTRO vehículo de la subasta: con dos en el vehículo medido, `/cotizaciones/[id]` dibujaría «De este
// vehículo» y movería su medición.
const TITULO_DEL_VEHICULO_COMPARADO = 'E2E JS de comparar cotizaciones'
let cotizacionesComparadas: string[] = []
// La ficha de un lead de la dueña de la prueba (`/leads/[id]`), con todos sus bloques: lo crea el spec.
let leadMedido = ''
// La página de un embarque de la subasta (`/logistica/embarques/[id]`), vacío: lo crea el spec y lo quita.
const BOOKING_MEDIDO = 'E2E-JS-EMBARQUE'
const subasta = (): string => sql("select id from public.origenes where clave = 'subasta_usa'")
const destinoDe = (ruta: string): string => {
  if (ruta === '/cotizaciones/nuevo') {
    return `${ruta}?origen=${sql("select id from public.origenes where clave = 'subasta_usa'")}`
  }
  // La puesta en marcha y las pestañas de la página del origen, con la subasta de la semilla (la Planilla, Hoja y Tarjeta, con su fórmula activa).
  if (ruta.startsWith('/configuracion/origenes/[id]/')) {
    return ruta.replace('[id]', sql("select id from public.origenes where clave = 'subasta_usa'"))
  }
  if (ruta === '/logistica/fase/[fase]') {
    // La lista de la primera fase de logística de la subasta de la semilla, con su origen.
    const origen = sql("select id from public.origenes where clave = 'subasta_usa'")
    const fase = sql(
      `select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = ${literal(origen)}::uuid and f.es_logistica and f.activa order by f.orden, f.id limit 1`,
    )
    return `/logistica/fase/${fase}?origen=${origen}`
  }
  if (ruta === '/vehiculos/[id]') {
    // La ficha del vehículo medido (de la subasta de la semilla, con una cotización).
    return `/vehiculos/${sql(`select id from public.vehiculos where titulo = ${literal(TITULO_DEL_VEHICULO_MEDIDO)}`)}`
  }
  if (ruta === '/logistica/vehiculo/[id]') {
    // La unidad del vehículo medido (de la subasta de la semilla: la dueña la ve).
    return `/logistica/vehiculo/${sql(`select id from public.vehiculos where titulo = ${literal(TITULO_DEL_VEHICULO_MEDIDO)}`)}`
  }
  if (ruta === '/leads/[id]') {
    return `/leads/${leadMedido}`
  }
  // Embarques y aduana, en la subasta de la semilla (con sus reglas encendidas).
  if (ruta === '/logistica/embarques' || ruta === '/logistica/aduana') {
    return `${ruta}?origen=${subasta()}`
  }
  if (ruta === '/logistica/embarques/[id]') {
    return `/logistica/embarques/${sql(`select id from public.embarques where booking = ${literal(BOOKING_MEDIDO)}`)}`
  }
  if (ruta === '/cotizaciones/comparar') {
    return `/cotizaciones/comparar?ids=${cotizacionesComparadas.join(',')}`
  }
  return ruta === '/cotizaciones/[id]' ? `/cotizaciones/${cotizacionMedida}` : ruta
}

// `cuantas` cotizaciones de la subasta de la semilla sobre un vehículo suyo con ese título, creadas por la dueña de la prueba; sus ids, de la más nueva a la más vieja.
function sembrarEnUnVehiculo(titulo: string, creadoPor: string, cuantas: number): string[] {
  const origen = sql("select id from public.origenes where clave = 'subasta_usa'")
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen)}::uuid, ${literal(titulo)})`,
  )
  const vehiculo = sql(`select id from public.vehiculos where titulo = ${literal(titulo)}`)
  sembrarCotizaciones({ origenId: origen, vehiculoId: vehiculo, creadoPor, cuantas })
  return sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid order by creado_en desc, id`,
  )
    .split('\n')
    .filter((id) => id !== '')
}

function sembrarLaCotizacionMedida(creadoPor: string): void {
  cotizacionMedida = sembrarEnUnVehiculo(TITULO_DEL_VEHICULO_MEDIDO, creadoPor, 1)[0] ?? ''
  cotizacionesComparadas = sembrarEnUnVehiculo(TITULO_DEL_VEHICULO_COMPARADO, creadoPor, 2)
}

function sembrarElEmbarqueMedido(): void {
  sql(
    `insert into public.embarques (origen_id, booking) values (${literal(subasta())}::uuid, ${literal(BOOKING_MEDIDO)}) on conflict do nothing`,
  )
}

function quitarElEmbarqueMedido(): void {
  sql(`delete from public.embarques where booking = ${literal(BOOKING_MEDIDO)}`)
}

function quitarLaCotizacionMedida(): void {
  for (const titulo of [TITULO_DEL_VEHICULO_MEDIDO, TITULO_DEL_VEHICULO_COMPARADO]) {
    sql(`
      delete from public.cotizaciones where vehiculo_id in (select id from public.vehiculos where titulo = ${literal(titulo)});
      delete from public.vehiculos where titulo = ${literal(titulo)}`)
  }
}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-js`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  quitarLaCotizacionMedida()
  sembrarLaCotizacionMedida(idDePersona(personas.duena))
  quitarElEmbarqueMedido()
  sembrarElEmbarqueMedido()
  leadMedido = await crearLead({
    nombre: `JS de la ficha ${info.project.name}`,
    telefono: info.project.name === 'escritorio' ? '59170990011' : '59170990012',
    deQuien: personas.duena,
  })
})

test.afterAll(async () => {
  quitarLaCotizacionMedida()
  quitarElEmbarqueMedido()
  if (leadMedido !== '') {
    sql(`delete from public.leads where id = ${literal(leadMedido)}::uuid`)
  }
  await limpiarAlta(restaurar)
})

for (const [ruta, presupuesto] of Object.entries(PRESUPUESTO_DE_JS_EN_KB)) {
  test(`${ruta}: el JS en frío cabe en ${String(presupuesto)} KB`, async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: el JS no depende del viewport.')
    await entrar(page, personas.duena)
    const { bytes, chunks } = await medirJsEnFrio(page.context(), destinoDe(ruta))
    info.annotations.push({
      type: 'JS en frío',
      description: `${ruta}: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks (presupuesto ${String(presupuesto)})`,
    })
    console.warn(
      `[js] ${ruta}: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks (presupuesto ${String(presupuesto)})`,
    )
    expect(enKB(bytes), `${ruta}: ${String(enKB(bytes))} KB de JS en frío`).toBeLessThanOrEqual(
      presupuesto,
    )
  })
}

test('el shell no trae la ficha ni el listado de leads a `/perfil`', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: el JS no depende del viewport.')
  await entrar(page, personas.duena)
  const perfil = await medirJsEnFrio(page.context(), '/perfil')
  const leads = await medirJsEnFrio(page.context(), '/leads')
  // Con el shell cargando por los barriles de los módulos, `/perfil` pesaba lo mismo que `/leads`.
  expect(enKB(leads.bytes) - enKB(perfil.bytes)).toBeGreaterThan(50)
})

// 5b-3: el documento de cada pantalla no lleva los catálogos del alta de lead. El shell los mandaba (orígenes, tipos de lead, tipos de
// seguimiento y el layout de campos, a un Client Component) en toda pantalla, también `/perfil`: con 100 orígenes y 100 tipos eran
// ~26 KB de más en cada visita, se abriera o no «Nuevo lead». Ahora el drawer los lee al primer clic.
const PREFIJO_DEL_CATALOGO = 'e2e_cat_perfil_'

test('el documento de `/perfil` pesa lo mismo con 100 orígenes, 100 tipos de lead y 100 de seguimiento, con sus iconos, que con la semilla', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  const documento = async () => (await (await page.goto('/perfil'))?.body())?.length ?? 0
  const antes = await documento()
  try {
    sql(`
      insert into public.origenes_lead (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil origen ' || n, 'casa', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.origenes_lead)) n;
      insert into public.tipos_lead (clave, nombre, clase, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil tipo ' || n, 'prospecto', 'persona', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_lead)) n;
      insert into public.tipos_seguimiento (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil seguimiento ' || n, 'nota', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_seguimiento)) n;
    `)
    const despues = await documento()
    const resumen = `/perfil pesa ${String(antes)} bytes con la semilla y ${String(despues)} con 100 orígenes, 100 tipos de lead y 100 de seguimiento (${String(despues - antes)} de diferencia)`
    console.warn(`[perfil] ${info.project.name}: ${resumen}`)
    info.annotations.push({ type: 'documento de /perfil', description: resumen })
    expect(Math.abs(despues - antes), resumen).toBeLessThanOrEqual(1024)
    expect(despues / 1024, resumen).toBeLessThanOrEqual(PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB)
  } finally {
    sql(`
      delete from public.origenes_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_seguimiento where clave like '${PREFIJO_DEL_CATALOGO}%';
    `)
  }
})
