'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, type ReactNode } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../../entities/apertura'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../../entities/binding'
import type { CalculoDeLaTarjeta } from '../../../../entities/calculo-de-la-tarjeta'
import type { HojaLista } from '../../../../entities/hoja'
import { lineaDelPar, type ParDeHoja } from '../../../../entities/hoja-en-par'
import type {
  EleccionesDeLaHoja,
  ObligatoriosAlCotizar,
} from '../../../../entities/obligatorios-al-cotizar'
import { useGuardarElPar, type EdicionDelPar } from '../../hooks/use-guardar-el-par'
import type { GuardadoEnPar } from '../../hooks/use-guardado-en-par'
import type { AperturaDeHoja } from '../../hooks/use-hoja'
import { totalSuelto } from '../../../../entities/presentacion-de-la-hoja'
import { useDelTotal } from '../../hooks/use-del-total'
import type { HermanaEnLaVistaPrevia } from '../huecos'
import { useHojaEnPar, type ColumnaDeLaHoja } from '../../hooks/use-hoja-en-par'
import { CierreDeLaHoja, hayCierre } from '../cierre-de-la-hoja'
import { ColumnaDeLaHoja as Columna } from '../columna-de-la-hoja'
import { ContextoDelTotal } from '../contexto-del-total'
import { RegionDelTotal } from '../region-del-total'
import { ContextoDelPar, type HojaDelPar } from './contexto-del-par'
import { TotalesEnPar } from './totales-en-par'
import { VistaPreviaDelPar } from './vista-previa-del-par'

type DeDos<T> = readonly [T, T]

export type PropsDeLaHojaEnPar = {
  hoja: HojaLista
  par: ParDeHoja
  iniciales: DeDos<RecalculoInicial>
  aperturas: DeDos<AperturaDeHoja>
  vehiculoId: string | null
  vehiculoSoltado: boolean
  leadId: string | null
  obligatorios?: ObligatoriosAlCotizar
  elecciones?: EleccionesDeLaHoja
  // El de la hoja nueva; nulo en las hermanas guardadas (van con `edicion`) o sin «Guardar».
  guardado: GuardadoEnPar | null
  edicion?: EdicionDelPar
  borrador?: { clave: string; alDescartar: () => void } | undefined
  soloLectura?: boolean
  totalGuardado?: ReactNode
  seEligen?: ReadonlySet<string> | undefined
  alRecargar?: () => void
  // Lo que va sobre la hoja (el aviso de versión de una guardada y el de lo común distinto).
  encima?: (hayCambios: boolean) => ReactNode
  // Lo guardado de la columna de la cotización abierta para «Vista previa» (en las hermanas guardadas), la de la otra y lo de su página.
  deLoGuardado?: { calculo: CalculoDeLaTarjeta; difiere: boolean }
  deLaHermana?: {
    calculo: CalculoDeLaTarjeta
    pagina: NonNullable<HermanaEnLaVistaPrevia['pagina']>
  }
  // La columna de la cotización que se abrió (la primera en la hoja nueva).
  abierta?: 0 | 1
  // La marca de privada de la hoja nueva y su interruptor (como `HojaDeCotizar`): las dos hermanas nacen con la misma. Sin ella, públicas.
  privada?: { valor: boolean; interruptor: ReactNode }
}

function useContextoDe(c: ColumnaDeLaHoja, seEligen: ReadonlySet<string> | undefined) {
  return useMemo<ContextoDeHoja>(
    () => ({
      indice: c.indice,
      entradas: c.entradas,
      respuesta: c.respuesta,
      ...(seEligen ? { seEligen } : {}),
    }),
    [c.indice, c.entradas, c.respuesta, seEligen],
  )
}

function useLaHojaDelPar(p: PropsDeLaHojaEnPar) {
  const raiz = useRef<HTMLDivElement>(null)
  const vista = p.edicion?.guardado ?? p.guardado
  const { h, columnas } = useHojaEnPar({
    hoja: p.hoja,
    iniciales: p.iniciales,
    aperturas: p.aperturas,
    vehiculoId: p.vehiculoId,
    alCambiar: vista?.olvidarAviso,
    borrador: p.borrador,
  })
  const ca = useContextoDe(columnas[0], p.seEligen)
  const cb = useContextoDe(columnas[1], p.seEligen)
  const [a, b] = columnas
  const delPar = useMemo<HojaDelPar>(
    () => ({
      par: p.par,
      columnas: [
        { contexto: ca, acciones: a.acciones },
        { contexto: cb, acciones: b.acciones },
      ],
    }),
    [p.par, ca, cb, a.acciones, b.acciones],
  )
  const { boton, hayCambios } = useGuardarElPar({
    columnas,
    contextos: [ca, cb],
    hoja: p.hoja,
    leadId: p.leadId,
    vehiculoId: p.vehiculoId,
    obligatorios: p.obligatorios,
    elecciones: p.elecciones,
    guardado: p.guardado,
    edicion: p.edicion ?? null,
    raiz,
    privada: p.privada?.valor === true,
  })
  return { raiz, vista, h, columnas, ca, cb, delPar, boton, hayCambios }
}

// Puede cotizar en el origen pero su rol no ve ningún dato de la hoja.
function SinDatosQueVer() {
  return (
    <EstadoSinPermiso
      titulo="No puedes ver esta hoja"
      descripcion="Tu rol puede cotizar en este origen, pero no ve los datos de su hoja. Pídeselo a quien administra los roles."
    />
  )
}

// «Dos versiones: …», sobre la hoja.
function LineaDelPar({ par }: { par: ParDeHoja }) {
  return (
    <p data-linea-del-par="" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {lineaDelPar(par)}
    </p>
  )
}

// Los dos totales de la hoja en par, cada uno con lo suyo (su estado y su «Reintentar»), en la región del total.
function TotalesDelPar({
  hoja,
  par,
  columnas,
  contextos,
  alRecargar,
}: {
  hoja: HojaLista
  par: ParDeHoja
  columnas: DeDos<ColumnaDeLaHoja>
  contextos: DeDos<ContextoDeHoja>
  alRecargar: () => void
}) {
  const [a, b] = columnas
  return (
    <RegionDelTotal
      etiqueta={hoja.tarjetaTotal.etiqueta}
      decimales={hoja.tarjetaTotal.decimales}
      contexto={contextos[0]}
      totales={
        <TotalesEnPar
          tarjeta={hoja.tarjetaTotal}
          par={par}
          columnas={[
            { contexto: contextos[0], estado: a.estado, alReintentar: a.reintentar },
            { contexto: contextos[1], estado: b.estado, alReintentar: b.reintentar },
          ]}
          monedaDelTotalBs={a.verTotalBs ? hoja.cabecera.monedaBs : null}
          alRecargar={alRecargar}
        />
      }
    />
  )
}

// La hoja en par (glosario: «Variante en par»): sin chips de la variante, la línea «Dos versiones: …», las celdas que cambian según la opción en dos celdas lado a
// lado (`ItemEnPar`, por `ContextoDelPar`) y las comunes una vez, los dos totales sueltos encima de «Avanzado» y el cierre debajo. Guardar crea (o guarda) las dos
// hermanas en una transacción.
export function HojaEnPar(props: PropsDeLaHojaEnPar) {
  const { hoja, par, soloLectura = false, encima } = props
  const router = useRouter()
  const recargar = props.alRecargar ?? router.refresh
  const { raiz, vista, h, columnas, ca, cb, delPar, boton, hayCambios } = useLaHojaDelPar(props)
  const delTotal = useDelTotal({
    hoja,
    h,
    recargar,
    vehiculoSoltado: props.vehiculoSoltado,
    totalGuardado: props.totalGuardado ?? null,
    pisadas: null,
  })
  const guardando = vista?.estado.tipo === 'guardando'
  const dibujadas = hoja.secciones.filter((seccion) => seccionSeDibuja(seccion, ca))
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
    elecciones: props.elecciones,
  }
  return (
    <ContextoDelPar.Provider value={delPar}>
      <ContextoDelTotal value={delTotal}>
        <div
          ref={raiz}
          data-hoja=""
          data-par=""
          inert={guardando}
          className="@container/hoja grid min-w-0 gap-4"
        >
          <SimbolosDeXCell />
          <EstiloDeTonos tonos={hoja.tonos} />
          <Columna
            hoja={hoja}
            h={h}
            contexto={ca}
            secciones={dibujadas}
            guardando={guardando}
            soloLectura={soloLectura}
            encima={
              <>
                {encima?.(hayCambios)}
                <LineaDelPar par={par} />
              </>
            }
            alRecargar={recargar}
            privada={props.privada?.interruptor ?? null}
            totalSuelto={
              totalSuelto(dibujadas, true) ? (
                <TotalesDelPar
                  hoja={hoja}
                  par={par}
                  columnas={columnas}
                  contextos={[ca, cb]}
                  alRecargar={recargar}
                />
              ) : null
            }
            cierre={hayCierre(cierre) ? <CierreDeLaHoja {...cierre} /> : null}
          />
        </div>
        <VistaPreviaDelPar
          hoja={hoja}
          par={par}
          columnas={columnas}
          props={props}
          hayCambios={hayCambios}
        />
      </ContextoDelTotal>
    </ContextoDelPar.Provider>
  )
}
