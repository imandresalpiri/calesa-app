// Las rutas que recorre el barrido de accesibilidad (9.12): salen del árbol de `src/app` (cada `page.tsx`), no de una lista a mano ni de
// `docs/MAPA.md`, que no se versiona. Cada segmento dinámico (`[id]`) tiene su entrada en `DINAMICAS`: o arma la URL con lo que
// `sembrarTerreno` dejó en la base, o queda pendiente con la parte que lo resuelve. Una página dinámica nueva sin entrada hace caer la
// prueba de cobertura del spec.
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { codigoDePaisDeLaEmpresa, telefonoAlAzar } from './leads-alta'
import { origenPorClave } from './origenes'
import { limpiarEspera, sembrarEspera } from './repuestos-espera'
import { urlDeLaFormula } from './rutas-de-la-formula'
import { literal, sql } from './sql'

export type Grupo = 'acceso' | 'app'
export type Ruta = { plantilla: string; grupo: Grupo }

const APP = join(process.cwd(), 'src', 'app')

function paginas(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return paginas(ruta)
    return entrada.name === 'page.tsx' ? [ruta] : []
  })
}

// `(app)/leads/[id]/page.tsx` → `/leads/[id]`, en el grupo `app`. Las de fuera de `(acceso)` y `(app)` (no hay hoy) irían a `app`.
export function rutasDeLaApp(): Ruta[] {
  return paginas(APP)
    .map((archivo) => {
      const segmentos = relative(APP, archivo).split(sep).slice(0, -1)
      const grupo: Grupo = segmentos[0] === '(acceso)' ? 'acceso' : 'app'
      const visibles = segmentos.filter((s) => !/^\(.*\)$/.test(s))
      return { plantilla: `/${visibles.join('/')}`, grupo }
    })
    .sort((a, b) => a.plantilla.localeCompare(b.plantilla))
}

export const esDinamica = (plantilla: string) => plantilla.includes('[')

// Lo que se siembra para que las rutas dinámicas tengan a qué apuntar.
export type Terreno = {
  lead: string
  vehiculo: string
  origen: string
  proyectoDeRepuestos: string
  cotizacion: string
  cotizacionDeRepuestos: string
  guia: string
  embarque: string
}

export type Destino = { url: string } | { pendiente: string; motivo: string }

export const DINAMICAS: Record<string, (t: Terreno) => Destino> = {
  '/leads/[id]': (t) => ({ url: `/leads/${t.lead}` }),
  '/vehiculos/[id]': (t) => ({ url: `/vehiculos/${t.vehiculo}` }),
  '/logistica/vehiculo/[id]': (t) => ({ url: `/logistica/vehiculo/${t.vehiculo}` }),
  '/logistica/bandeja/[grupo]': (t) => ({ url: `/logistica/bandeja/demorados?origen=${t.origen}` }),
  '/logistica/fase/[fase]': (t) => ({ url: `/logistica/fase/sin_fase?origen=${t.origen}` }),
  '/logistica/embarques/[id]': (t) => ({
    url: `/logistica/embarques/${t.embarque}?origen=${t.origen}`,
  }),
  // La página de un origen sin parte es un `route.ts` (308 a la última pestaña que se abrió): no es una página y no se barre. Se barren sus pestañas; las de la
  // fórmula, con la de trabajo elegida (sin `?formula=` la escribe el navegador con `replace`).
  '/configuracion/origenes/[id]/fases': (t) => ({
    url: `/configuracion/origenes/${t.origen}/fases`,
  }),
  '/configuracion/origenes/[id]/planilla': (t) => ({
    url: urlDeLaFormula(t.origen, 'planilla'),
  }),
  '/configuracion/origenes/[id]/hoja': (t) => ({
    url: urlDeLaFormula(t.origen, 'hoja'),
  }),
  '/configuracion/origenes/[id]/tarjeta': (t) => ({
    url: urlDeLaFormula(t.origen, 'tarjeta'),
  }),
  '/configuracion/origenes/[id]/campos': (t) => ({
    url: `/configuracion/origenes/${t.origen}/campos`,
  }),
  '/configuracion/origenes/[id]/categorias': (t) => ({
    url: `/configuracion/origenes/${t.origen}/categorias`,
  }),
  // La puesta en marcha (su raíz es un `route.ts`, 307 al paso que falta: no se barre): cada paso con el origen del barrido, que no tiene fórmula activa;
  // «Listo» sin ella vuelve a la raíz, así que va con la subasta de la semilla, que la tiene.
  '/configuracion/origenes/[id]/puesta-en-marcha/datos': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/datos`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/campos': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/campos`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/flujo': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/flujo`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/formula': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/formula`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/tarjeta': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/tarjeta`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/publicar': (t) => ({
    url: `/configuracion/origenes/${t.origen}/puesta-en-marcha/publicar`,
  }),
  '/configuracion/origenes/[id]/puesta-en-marcha/listo': () => ({
    url: `/configuracion/origenes/${sql("select id from public.origenes where clave = 'subasta_usa'")}/puesta-en-marcha/listo`,
  }),
  '/repuestos/[id]': (t) => ({ url: `/repuestos/${t.proyectoDeRepuestos}` }),
  '/cotizaciones/[id]': (t) => ({ url: `/cotizaciones/${t.cotizacion}` }),
  '/repuestos/[id]/cotizaciones/[cotizacion]': (t) => ({
    url: `/repuestos/${t.proyectoDeRepuestos}/cotizaciones/${t.cotizacionDeRepuestos}`,
  }),
  '/configuracion/web/guias/[id]': (t) => ({ url: `/configuracion/web/guias/${t.guia}` }),
}

// Sin sesión de recuperación, elegir la contraseña manda a pedir otro enlace: se barre lo que dibuja ese destino. Sitio web de
// Configuración no dibuja nada sin sub-ruta: abre la primera que la dueña puede (`/ajustes`), que el barrido recorre con su propia
// entrada. Las raíces que redirigen con un `route.ts` (un origen, la configuración de la logística) no son páginas y no se barren.
export const REDIRECCIONES: Record<string, string> = {
  '/auth/nueva-contrasena': '/recuperar',
  '/configuracion/web': '/configuracion/web/ajustes',
}

// Las páginas estáticas que sólo redirigen en el navegador, tras el esqueleto: al cambiar la URL todavía se ve el esqueleto del destino,
// no lo que dibuja. No se barren; su destino se barre como su propia ruta.
export const SOLO_REDIRIGEN: Record<string, string> = {}

const claveDelOrigen = (proyecto: string) => `a11y_${proyecto}`
const tituloDeLaCotizada = (proyecto: string) => `A11y cotizada ${proyecto}`
const slugDeLaGuia = (proyecto: string) => `e2e-guia-a11y-${proyecto}`

// Una cotización guardada para `/cotizaciones/[id]` (9.12-2): pide la fórmula publicada de su origen, así que va en la subasta de la semilla
// (como `presupuesto-js.spec.ts`), sobre un vehículo propio y creada por la dueña del barrido. Antes de sembrar, quita lo que dejó una corrida cortada.
function sembrarLaCotizada(proyecto: string, duena: string): string {
  quitarLaCotizada(proyecto)
  const origen = sql("select id from public.origenes where clave = 'subasta_usa'")
  const titulo = literal(tituloDeLaCotizada(proyecto))
  const vehiculo = sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen)}::uuid, ${titulo}) returning id`,
  )
  sembrarCotizaciones({
    origenId: origen,
    vehiculoId: vehiculo,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  return sql(`select id from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
}

function quitarLaCotizada(proyecto: string): void {
  const titulo = literal(tituloDeLaCotizada(proyecto))
  sql(`
    delete from public.cotizaciones where vehiculo_id in (select id from public.vehiculos where titulo = ${titulo});
    delete from public.vehiculos where titulo = ${titulo}`)
}

// Una cotización de repuestos aceptada con una línea de cada bloque (9.12-5), para `/repuestos/[id]/cotizaciones/[cotizacion]`: se inserta por SQL como
// `repuestos-cotizaciones.spec.ts` (la hoja de lectura no pide un snapshot válido). La quita `limpiarTerreno` antes de borrar el proyecto.
function sembrarLaCotizacionDeRepuestos(proyecto: string, duena: string): string {
  const id = sql(`
    insert into public.repuestos_cotizaciones (proyecto_id, moneda, estado, config_snapshot, total, aceptada_en, creado_por)
      values (${literal(proyecto)}::uuid, 'USD', 'aceptada', '{}'::jsonb, 375, now(), ${literal(idDePersona(duena))}::uuid)
      returning id`)
  sql(`
    insert into public.repuestos_cotizaciones_lineas (cotizacion_id, descripcion, bloque, cantidad, costo, logistica_sugerida, caja, total, orden) values
      (${literal(id)}::uuid, 'Filtro importado', 'importado', 1, 80, 15, 10, 133, 0),
      (${literal(id)}::uuid, 'Aceite local', 'local', 2, 90, 15, 5, 242, 1)`)
  return id
}

// Una guía de la web en borrador (9.12-5), para `/configuracion/web/guias/[id]`.
function sembrarLaGuia(proyecto: string): string {
  const slug = literal(slugDeLaGuia(proyecto))
  sql(`delete from public.web_guias where slug = ${slug}`)
  return sql(
    `insert into public.web_guias (slug, titulo, cuerpo_html) values (${slug}, 'A11y guía ${proyecto}', '<p>Texto de la guía</p>') returning id`,
  )
}

export async function sembrarTerreno(proyecto: string, duena: string): Promise<Terreno> {
  const espera = await sembrarEspera(`A11y ${proyecto}`, claveDelOrigen(proyecto))
  const origen = await origenPorClave(`e2e_${claveDelOrigen(proyecto)}`)
  if (!origen) throw new Error('No quedó el origen sembrado del barrido')
  const lead = await crearLead({
    nombre: `Barrido ${proyecto}`,
    telefono: `${await codigoDePaisDeLaEmpresa()}${telefonoAlAzar()}`,
    deQuien: duena,
  })
  return {
    lead,
    vehiculo: espera.vehiculo,
    origen: origen.id,
    proyectoDeRepuestos: espera.proyectoDeRepuestos,
    cotizacion: sembrarLaCotizada(proyecto, duena),
    cotizacionDeRepuestos: sembrarLaCotizacionDeRepuestos(espera.proyectoDeRepuestos, duena),
    guia: sembrarLaGuia(proyecto),
    embarque: sembrarElEmbarque(origen.id, proyecto),
  }
}

// Un embarque vacío del origen del barrido, para su página (`/logistica/embarques/[id]`).
const bookingDelBarrido = (proyecto: string) => `A11Y-${proyecto.toUpperCase()}`
function sembrarElEmbarque(origenId: string, proyecto: string): string {
  const booking = literal(bookingDelBarrido(proyecto))
  sql(
    `insert into public.embarques (origen_id, booking) values (${literal(origenId)}::uuid, ${booking}) on conflict do nothing`,
  )
  return sql(
    `select id from public.embarques where origen_id = ${literal(origenId)}::uuid and booking = ${booking}`,
  )
}

export async function limpiarTerreno(proyecto: string): Promise<void> {
  quitarLaCotizada(proyecto)
  sql(`delete from public.web_guias where slug = ${literal(slugDeLaGuia(proyecto))}`)
  sql(`
    delete from public.repuestos_cotizaciones where proyecto_id in (
      select p.id from public.repuestos_proyectos p join public.vehiculos v on v.id = p.vehiculo_id
        join public.origenes o on o.id = v.origen_id where o.clave like ${literal(`e2e_${claveDelOrigen(proyecto)}%`)})`)
  await borrarLeadsDePrueba()
  sql(`
    delete from public.embarques where origen_id in (
      select o.id from public.origenes o where o.clave like ${literal(`e2e_${claveDelOrigen(proyecto)}%`)})`)
  await limpiarEspera(claveDelOrigen(proyecto))
}
