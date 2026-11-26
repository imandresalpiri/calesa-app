'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, type ReactNode } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../entities/apertura'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import { hayPisadas } from '../../../entities/binding-pisado'
import type { HojaLista } from '../../../entities/hoja'
import {
  eleccionesDeUnaGuardada,
  type EleccionesDeLaHoja,
  type ObligatoriosAlCotizar,
} from '../../../entities/obligatorios-al-cotizar'
import { useBotonesDeGuardar } from '../hooks/use-botones-de-guardar'
import type { EdicionDeLaHoja } from '../hooks/use-guardar-la-guardada'
import { totalSuelto } from '../../../entities/presentacion-de-la-hoja'
import { useDelTotal } from '../hooks/use-del-total'
import type { Guardado } from '../hooks/use-nucleo-del-guardado'
import { useHoja, type AperturaDeHoja } from '../hooks/use-hoja'
import { CierreDeLaHoja, hayCierre } from './cierre-de-la-hoja'
import { ColumnaDeLaHoja } from './columna-de-la-hoja'
import { ContextoDelTotal } from './contexto-del-total'
import { ListaDePisadasDiferida } from './pisadas'
import { RegionDelTotal } from './region-del-total'
import { VistaPreviaDeLaHojaViva } from './vista-previa-de-la-hoja'

type Props = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // El vehículo de la URL que la base no dejó usar: se calculó sin él.
  vehiculoSoltado: boolean
  leadId: string | null
  // Lo que el rol pide elegir antes de guardar en este origen y cómo se elige (`obligatoriosAlCotizar()` y `eleccionesDeLaHoja()`, calculados en el servidor). Sin ellos, la hoja no
  // pide nada: una guardada no los trae.
  obligatorios?: ObligatoriosAlCotizar
  elecciones?: EleccionesDeLaHoja
  // Nulo: la hoja no guarda (una guardada de sólo lectura, o todavía sin «Guardar»).
  guardado: Guardado | null
  // El borrador de lo tipeado: su clave en la pestaña (de quien cotiza) y «Descartar», con el que el marco vuelve a montar la hoja vacía. Sin él, no hay borrador.
  borrador?: { clave: string; alDescartar: () => void } | undefined
  // Quien sólo ve una cotización guardada: los modos y «Ver total Bs» se ven y no se tocan, y la hoja lo dice (P13).
  soloLectura?: boolean
  // El total con que se guardó, cuando lo de hoy no es lo guardado (C11): va bajo la tarjeta del total, fuera de ella.
  totalGuardado?: ReactNode
  // Los campos del vehículo que quien mira elige en el panel del vehículo (4.14-2c3): la celda sin valor por uno de ellos dice dónde se elige.
  seEligen?: ReadonlySet<string> | undefined
  // Los datos del vehículo con que casa una tabla de la ayuda («Tu vehículo»), que manda la página. Sin ellos, la ayuda no marca la fila del vehículo por sus datos.
  valoresDelVehiculo?: Readonly<Record<string, number | string>> | undefined
  // De dónde calcula y con qué abre (C1, C2). Sin nada, la hoja nueva.
  abre?: AperturaDeHoja
  // Una cotización guardada que quien mira puede guardar (4.15-3): su guardado, su versión y si lo de hoy no es lo guardado. Con ella, `guardado` va nulo.
  edicion?: EdicionDeLaHoja
  // «Recargar»: sin nada, vuelve a pedir la página al servidor; el marco de una guardada lo suma para volver a montar la hoja con lo que llegue (4.15-3).
  alRecargar?: () => void
  // Lo que el marco de una guardada pone sobre la hoja (el aviso de versión, 4.15-3b); recibe si hay cambios sin guardar. La hoja nueva no lo llena.
  encima?: (hayCambios: boolean) => ReactNode
  // Lo que dibuja la vista previa de una guardada: lo guardado (P5 a, `calculoDeLoGuardado`) y si lo de hoy no lo es (`difiereAlAbrir`: la vista previa lo dice fuera de la
  // tarjeta). Sin él, la tarjeta dibuja lo que la hoja calcula ahora (la hoja nueva).
  deLoGuardado?: { calculo: CalculoDeLaTarjeta; difiere: boolean }
  // La marca de privada de la hoja nueva (glosario: «Cotización privada»): lo que va en el pedido y su interruptor, que va en los pasos de la hoja. Sin ella, pública.
  privada?: { valor: boolean; interruptor: ReactNode }
}

// Las salidas del aviso de guardado: las de la hoja nueva o, en una guardada, «Escribir el título» y, si puede cambiarlo, «Elegir otro vehículo» (abren el panel del vehículo).
const eleccionesDelAviso = (
  elecciones: EleccionesDeLaHoja | undefined,
  edicion: EdicionDeLaHoja | undefined,
): EleccionesDeLaHoja | undefined =>
  elecciones ??
  (edicion?.panelDelTitulo === undefined
    ? undefined
    : eleccionesDeUnaGuardada(edicion.panelDelTitulo, { cambiaVehiculo: edicion.cambiaVehiculo }))

// Puede cotizar en el origen pero su rol no ve ningún dato de la hoja (`cotizaciones.ver`): no hay nada que dibujar ni un total que dar.
function SinDatosQueVer() {
  return (
    <EstadoSinPermiso
      titulo="No puedes ver esta hoja"
      descripcion="Tu rol puede cotizar en este origen, pero no ve los datos de su hoja. Pídeselo a quien administra los roles."
    />
  )
}

// Lo que ven las celdas: el índice, lo tipeado, la última respuesta, los campos que se eligen en el panel del vehículo, y los datos del vehículo y el origen para la ayuda.
function useContextoDeLaHoja(
  h: ReturnType<typeof useHoja>,
  seEligen: ReadonlySet<string> | undefined,
  valoresDelVehiculo: Readonly<Record<string, number | string>> | undefined,
  origenId: string,
) {
  return useMemo<ContextoDeHoja>(
    () => ({
      indice: h.indice,
      entradas: h.entradas,
      respuesta: h.respuesta,
      ...(seEligen ? { seEligen } : {}),
      ...(valoresDelVehiculo ? { valoresDelVehiculo } : {}),
      origenId,
    }),
    [h.indice, h.entradas, h.respuesta, seEligen, valoresDelVehiculo, origenId],
  )
}

// Los iconos y los tonos, una sola vez por hoja.
function SimbolosYTonos({ tonos }: { tonos: HojaLista['tonos'] }) {
  return (
    <>
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={tonos} />
    </>
  )
}

// «Recargar»: sin nada, vuelve a pedir la página al servidor; el marco de una guardada lo suma para volver a montar la hoja con lo que llegue (4.15-3).
function useRecargar(alRecargar: (() => void) | undefined): () => void {
  const router = useRouter()
  return alRecargar ?? router.refresh
}

// Lo que la hoja arma al montarse: el recálculo (`useHoja`), lo que ven las celdas y los botones de guardar, con el guardado de la guardada que edita o el de la nueva.
function useArmadoDeLaHoja(p: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const vista = p.edicion?.guardado ?? p.guardado
  const h = useHoja({
    hoja: p.hoja,
    inicial: p.inicial,
    vehiculoId: p.vehiculoId,
    alCambiar: vista?.olvidarAviso,
    borrador: p.borrador,
    ...p.abre,
  })
  const contexto = useContextoDeLaHoja(h, p.seEligen, p.valoresDelVehiculo, p.hoja.origen.id)
  const { boton, hayCambios } = useBotonesDeGuardar({
    h,
    contexto,
    hoja: p.hoja,
    leadId: p.leadId,
    vehiculoId: p.vehiculoId,
    obligatorios: p.obligatorios,
    elecciones: p.elecciones,
    guardado: p.guardado,
    edicion: p.edicion,
    raiz,
    privada: p.privada?.valor === true,
  })
  return { raiz, vista, h, contexto, boton, hayCambios }
}

// La hoja de cotizar: las secciones del diseño en su orden (las avanzadas, detrás de un botón «Avanzado» con su modal), cada celda con su `XCell`, la región del total (en su
// sección si el diseño la ubica; si no, suelta, encima de «Avanzado») y el cierre con «Guardar» debajo de «Avanzado». Recalcula en la base 150 ms después de la última
// confirmación. Guarda con `Ctrl/Cmd+S` o «Guardar» (el guardado vive en el marco, `useGuardado`): confirma la celda abierta, espera al total al día (P8) y arma el pedido
// con las entradas que ese recálculo calculó y la misma hoja abierta. Mientras guarda no se toca (`inert`): lo guardado la reemplaza y lo tecleado en el medio se perdería
// sin aviso. Los iconos y los tonos se montan una sola vez por hoja; el modal de «Vista previa», fuera de la rejilla.
export function HojaDeCotizar(props: Props) {
  const { hoja, soloLectura = false } = props
  const recargar = useRecargar(props.alRecargar)
  const { raiz, vista, h, contexto, boton, hayCambios } = useArmadoDeLaHoja(props)
  const delTotal = useDelTotal({
    hoja,
    h,
    recargar,
    vehiculoSoltado: props.vehiculoSoltado,
    totalGuardado: props.totalGuardado ?? null,
    pisadas: hayPisadas(contexto.indice, contexto.entradas) ? (
      <ListaDePisadasDiferida contexto={contexto} />
    ) : null,
  })
  const guardando = vista?.estado.tipo === 'guardando'
  const dibujadas = hoja.secciones.filter((seccion) => seccionSeDibuja(seccion, contexto))
  if (dibujadas.length === 0) {
    return <SinDatosQueVer />
  }
  const cierre = {
    boton,
    soloLectura,
    guardado: vista,
    version: hoja.formula.version,
    alRecargar: recargar,
    confirmacion: props.edicion ? 'Cambios guardados.' : null,
    elecciones: eleccionesDelAviso(props.elecciones, props.edicion),
  }
  return (
    <ContextoDelTotal value={delTotal}>
      <div ref={raiz} data-hoja="" inert={guardando} className="@container/hoja grid min-w-0 gap-4">
        <SimbolosYTonos tonos={hoja.tonos} />
        <ColumnaDeLaHoja
          hoja={hoja}
          h={h}
          contexto={contexto}
          secciones={dibujadas}
          guardando={guardando}
          soloLectura={soloLectura}
          encima={props.encima?.(hayCambios)}
          alRecargar={recargar}
          privada={props.privada?.interruptor ?? null}
          totalSuelto={
            totalSuelto(dibujadas, false) ? (
              <RegionDelTotal
                etiqueta={hoja.tarjetaTotal.etiqueta}
                decimales={hoja.tarjetaTotal.decimales}
                contexto={contexto}
              />
            ) : null
          }
          cierre={hayCierre(cierre) ? <CierreDeLaHoja {...cierre} /> : null}
        />
      </div>
      <VistaPreviaDeLaHojaViva hoja={hoja} h={h} {...props.deLoGuardado} hayCambios={hayCambios} />
    </ContextoDelTotal>
  )
}
