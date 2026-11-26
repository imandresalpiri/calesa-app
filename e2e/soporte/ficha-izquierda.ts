import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { sembrarCotizaciones } from './cotizaciones-sembradas'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { literal, sql } from './sql'
import { borrarVehiculosDe } from './vehiculos'
import { sembrarFotos } from './vehiculos-lista'

// El terreno de `e2e/vehiculos-ficha-izquierda.spec.ts`: un origen de subasta con «Subasta» → «Comprado», el campo «Tono de pintura» y el de la compra directa,
// sus datos clave (enlace, tono de pintura, año y lote) y cuatro vehículos, uno por situación; el principal con 3 fotos, su aprobada y su proyecto de repuestos.

const HORA = 3_600_000

export type VehiculoDelTerreno = { id: string; titulo: string }
export type TerrenoDeLaIzquierda = {
  origen: string
  principal: VehiculoDelTerreno
  sinResolver: VehiculoDelTerreno
  ganada: VehiculoDelTerreno
  noGanada: VehiculoDelTerreno
  cotizacion: string
  proyecto: { id: string; numero: string }
}

const claveDe = (p: string) => `${PREFIJO_CLAVE_E2E}ficha_izq_${p}`
const enHoras = (horas: number) => new Date(Date.now() + horas * HORA).toISOString()

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

export async function borrarTerrenoDeLaIzquierda(p: string): Promise<void> {
  const deEsteOrigen = `select v.id from public.vehiculos v join public.origenes o on o.id = v.origen_id where o.clave = ${literal(claveDe(p))}`
  sql(`
    delete from public.cotizaciones_aprobadas where vehiculo_id in (${deEsteOrigen});
    delete from public.cotizaciones where vehiculo_id in (${deEsteOrigen});
    delete from public.repuestos_proyectos where vehiculo_id in (${deEsteOrigen});
    delete from public.vehiculos_imagenes where vehiculo_id in (${deEsteOrigen});`)
  await borrarVehiculosDe([claveDe(p)])
  await borrarOrigenes([claveDe(p)])
}

// Las dos fases del origen: «Subasta» (inicial, la de la subasta) y «Comprado».
async function fasesDe(origen: string): Promise<{ subasta: string; comprado: string }> {
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo')
  const fases = await cliente
    .from('fases')
    .insert([
      {
        flujo_id: flujo.data?.id,
        nombre: 'Subasta',
        orden: 1,
        es_inicial: true,
        es_subasta: true,
        es_logistica: true,
      },
      {
        flujo_id: flujo.data?.id,
        nombre: 'Comprado',
        orden: 2,
        es_inicial: false,
        es_subasta: false,
        es_logistica: true,
      },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(fases.error, 'crear las fases')
  const id = (nombre: string) => fases.data?.find((f) => f.nombre === nombre)?.id ?? ''
  return { subasta: id('Subasta'), comprado: id('Comprado') }
}

// El campo «Tono de pintura», el de la puja y el de la compra directa (la clave de apibara del «Buy it now»), y los datos clave: enlace, tono de pintura, año y lote.
function camposYDatosClave(origen: string): void {
  // Un origen de subasta nace con los campos del catálogo de apibara (entre ellos `compra_inmediata`): se encienden, no se repiten.
  sql(`
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, grupo_id, orden)
      values (${literal(origen)}::uuid, 'tono_de_pintura', 'Tono de pintura', 'texto',
              public._origen_campo_grupo_asegurar(${literal(origen)}::uuid, 'Aspecto E2E'), 1);
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, grupo_id, orden, clave_apibara)
      values (${literal(origen)}::uuid, 'compra_inmediata', 'Compra inmediata (USD)', 'moneda',
              public._origen_campo_grupo_asegurar(${literal(origen)}::uuid, 'Precios'), 2, 'pricing.buy_now_usd')
      on conflict (origen_id, clave) do update set activo = true, clave_apibara = 'pricing.buy_now_usd';
    update public.origenes_campos set activo = true where origen_id = ${literal(origen)}::uuid and clave = 'puja_actual';
    update public.origenes set datos_clave = '[{"comun":"url_origen"},{"campo":"tono_de_pintura"},{"comun":"anio"},{"comun":"lote"}]'::jsonb
      where id = ${literal(origen)}::uuid;`)
}

// Cada fila con sus columnas: las que no nombra toman su valor por defecto (`defaultToNull: false`).
// Los cuatro vehículos: el principal en subasta (cierre en 52 h, puja y compra directa), uno sin resolver, uno ganado (ya en «Comprado») y uno no ganado.
async function cargarVehiculos(
  p: string,
  origen: string,
  fase: { subasta: string; comprado: string },
): Promise<{
  titulos: Record<'principal' | 'sinResolver' | 'ganada' | 'noGanada', string>
  vehiculos: VehiculoDelTerreno[]
}> {
  const titulos = {
    principal: `E2E Izquierda principal ${p}`,
    sinResolver: `E2E Izquierda sin resolver ${p}`,
    ganada: `E2E Izquierda ganada ${p}`,
    noGanada: `E2E Izquierda no ganada ${p}`,
  }
  const base = { origen_id: origen, fase_desde: enHoras(-48) }
  const insertados = await admin()
    .from('vehiculos')
    .insert(
      [
        {
          ...base,
          titulo: titulos.principal,
          fase_id: fase.subasta,
          estado_subasta: 'abierta',
          subasta_en: enHoras(52),
          url_origen: 'https://www.copart.com/lot/58540656',
          anio: 2021,
          lote: '58540656',
          plataforma: 'copart',
          atributos: { tono_de_pintura: 'Rojo', puja_actual: 4100, compra_inmediata: 15000 },
          apibara_sync_en: enHoras(-2),
          apibara_raw: { pricing: { current_bid_usd: 4100, buy_now_usd: 15000 } },
        },
        {
          ...base,
          titulo: titulos.sinResolver,
          fase_id: fase.subasta,
          estado_subasta: 'terminada',
          subasta_en: enHoras(-3),
        },
        { ...base, titulo: titulos.ganada, fase_id: fase.comprado, subasta_en: enHoras(-48) },
        {
          ...base,
          titulo: titulos.noGanada,
          fase_id: fase.subasta,
          estado_subasta: 'terminada',
          subasta_en: enHoras(-24),
        },
      ],
      { defaultToNull: false },
    )
    .select('id, titulo')
    .returns<VehiculoDelTerreno[]>()
  exigir(insertados.error, 'cargar los vehículos')
  return { titulos, vehiculos: insertados.data ?? [] }
}

export async function sembrarLaIzquierda(p: string, duena: string): Promise<TerrenoDeLaIzquierda> {
  const origen = await crearOrigenDePrueba(`E2E Ficha izquierda ${p}`, `ficha_izq_${p}`, {
    tipo: 'subasta',
    plataformas: ['copart'],
  })
  const fase = await fasesDe(origen.id)
  camposYDatosClave(origen.id)
  const { titulos, vehiculos } = await cargarVehiculos(p, origen.id, fase)
  const de = (titulo: string): VehiculoDelTerreno => ({
    id: vehiculos.find((v) => v.titulo === titulo)?.id ?? '',
    titulo,
  })
  const noGanada = de(titulos.noGanada)
  sql(`update public.vehiculos set subasta_resultado = 'no_ganada', subasta_resuelta_en = now()
    where id = ${literal(noGanada.id)}::uuid`)
  const principal = de(titulos.principal)
  await sembrarFotos(principal.id, 3)
  sembrarCotizaciones({
    origenId: sql("select id from public.origenes where clave = 'subasta_usa'"),
    vehiculoId: principal.id,
    creadoPor: sql(`select id from public.perfiles where email = ${literal(duena)}`),
    cuantas: 1,
  })
  sql('select public._cotizaciones_aprobadas_rellenar()')
  const [proyectoId = '', numero = ''] = sql(
    `insert into public.repuestos_proyectos (vehiculo_id) values (${literal(principal.id)}::uuid) returning id || '|' || numero`,
  ).split('|')
  return {
    origen: origen.id,
    principal,
    sinResolver: de(titulos.sinResolver),
    ganada: de(titulos.ganada),
    noGanada,
    cotizacion: sql(
      `select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = ${literal(principal.id)}::uuid`,
    ),
    proyecto: { id: proyectoId, numero: numero.trim() },
  }
}

const idDeLaCotizacion = (numero: string): string =>
  sql(`select id from public.cotizaciones where numero::text = ${literal(numero)}`)

// El «Costo estimado» de la izquierda abre Compartir de la aprobada. La izquierda se lee en el servidor: tras aprobar otra, la página
// termina de leerse sola, así que se prueba hasta que el botón apunte a la cotización pedida y se cierra el panel al salir.
export async function compartirApuntaA(page: Page, boton: Locator, numero: string): Promise<void> {
  const id = idDeLaCotizacion(numero)
  await expect(async () => {
    await boton.click()
    await expect(page).toHaveURL(/panel=compartir/)
    const apunta = page.url().includes(`para=${id}`)
    // Con el diálogo ya dibujado: un Escape que llega antes de que se monte no lo cierra y el botón queda tapado.
    const dialogo = page.getByRole('dialog', { name: 'Compartir cotización' })
    await expect(dialogo).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).not.toHaveURL(/panel=compartir/)
    if (!apunta) throw new Error('El costo estimado sigue en la aprobada anterior.')
  }).toPass()
}
