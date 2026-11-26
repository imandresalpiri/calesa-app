'use client'

import { useMemo, type ReactNode } from 'react'
import { Monto } from '@/shared/ui/monto'
import { TarjetaDeAjustes, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import {
  GRUPOS_DEL_ITEM,
  gruposQueSeEditan,
  type ClaveDeGrupo,
} from '../../../entities/items/grupos-del-item'
import {
  nombreDelValor,
  type CatalogosDeLaHoja,
  type MonedaDeLaHoja,
} from '../../../entities/items/hoja'
import { queEsElItem } from '../../../entities/items/que-es'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { useItemAbiertoEnLaHoja } from './contexto-del-item-abierto'
import { FaseDelItemInsignia } from './fase-del-item'
import { GrupoDelItemEditable } from './grupo-del-item'
import { PortadaDelItem } from './portada-del-item'

// Lo que el servidor lee del ítem para mostrarlo sin la hoja (la Cadena): sólo lectura.
export type LecturaDelItem = {
  fila: FilaDeItem
  catalogos: CatalogosDeLaHoja
  monedas: readonly MonedaDeLaHoja[]
  cerrado: boolean
}

type Props = {
  // La fase como la leyó el servidor (el panel se relee al mover): se usa si la fila no está.
  fase: { nombre: string; color: string } | null
  // «Qué falta» del ítem (lo dibuja `logistica`, ya con su `?destino=`).
  queFalta: ReactNode
  // «Proveedor: …» de la última compra, sólo con `repuestos.costos.ver`; nulo, no hay grupo.
  proveedor: ReactNode
  // Sin panel de la hoja (la Cadena), lo que leyó el servidor.
  lectura?: LecturaDelItem
}

const SIN_GUARDAR = () => Promise.resolve()
const NADA = () => undefined

function contextoDeSoloLectura(l: LecturaDelItem): ContextoDeLaHoja {
  return {
    editable: false,
    catalogos: l.catalogos,
    monedas: l.monedas,
    monedaPorDefecto: l.monedas[0]?.codigo ?? null,
    errores: {},
    guardar: SIN_GUARDAR,
    alConfirmarNumero: NADA,
    alReiniciar: NADA,
  }
}

type Datos = {
  fila: FilaDeItem | null
  contexto: ContextoDeLaHoja
  conflicto: string | null
  alRecargar: () => void
  paso: ReactNode
}

// Lo que dibuja la columna: lo vivo de la hoja si hay panel de la hoja; si no, lo que leyó el servidor, de sólo lectura.
function useDatos(lectura: LecturaDelItem | undefined): Datos | null {
  const delPanel = useItemAbiertoEnLaHoja()
  const soloLectura = useMemo(
    () => (lectura === undefined ? null : contextoDeSoloLectura(lectura)),
    [lectura],
  )
  if (delPanel !== null) {
    return {
      fila: delPanel.fila,
      contexto: delPanel.contexto,
      conflicto: delPanel.conflicto,
      alRecargar: delPanel.alRecargar,
      paso: delPanel.paso,
    }
  }
  if (lectura === undefined || soloLectura === null) return null
  return {
    fila: lectura.fila,
    contexto: soloLectura,
    conflicto: null,
    alRecargar: NADA,
    paso: null,
  }
}

const SIN_DATO = <span className="text-(--color-ink-faint)">Sin dato</span>

function QueEs({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const queEs = queEsElItem(fila, contexto.catalogos)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PortadaDelItem descripcion={fila.descripcion} />
      <div className="grid min-w-0 gap-0.5 text-(length:--text-sm) [overflow-wrap:anywhere]">
        {queEs === null ? (
          <p className="text-(--color-ink-faint)">Sin tipo de pieza ni condición</p>
        ) : (
          <p className="font-medium">{queEs}</p>
        )}
        <p>{fila.descripcion}</p>
      </div>
    </div>
  )
}

function Cantidades({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const moneda = fila.moneda ?? contexto.monedaPorDefecto
  return (
    <ValoresDeLaTarjeta
      filas={[
        { etiqueta: 'Cantidad', valor: <span className="tabular-nums">{fila.cantidad}</span> },
        {
          etiqueta: 'En stock',
          valor:
            fila.stockCantidad > 0 ? (
              <span className="tabular-nums">
                {fila.stockCantidad} de {fila.cantidad}
              </span>
            ) : (
              'Nada'
            ),
        },
        {
          etiqueta: 'Precio al cliente',
          valor:
            fila.precioCliente === null ? null : (
              <Monto valor={fila.precioCliente} {...(moneda ? { moneda } : {})} />
            ),
        },
      ]}
    />
  )
}

function Origen({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const { catalogos } = contexto
  return (
    <ValoresDeLaTarjeta
      filas={[
        {
          etiqueta: 'País de origen',
          valor: nombreDelValor(catalogos, 'pais_origen', fila.paisOrigenId),
        },
        {
          etiqueta: 'Vía de transporte',
          valor: nombreDelValor(catalogos, 'modo_transporte', fila.modoTransporteId),
        },
        { etiqueta: 'Tracking', valor: fila.tracking },
      ]}
    />
  )
}

function Notas({ fila }: { fila: FilaDeItem }) {
  return fila.notas === null || fila.notas.trim() === '' ? (
    <p className="text-(length:--text-sm)">{SIN_DATO}</p>
  ) : (
    <p className="line-clamp-3 text-(length:--text-sm) [overflow-wrap:anywhere] whitespace-pre-line">
      {fila.notas}
    </p>
  )
}

const TEXTO_DEL_GRUPO: Record<
  ClaveDeGrupo,
  (p: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) => ReactNode
> = {
  'que-es': QueEs,
  cantidades: Cantidades,
  origen: Origen,
  notas: ({ fila }) => <Notas fila={fila} />,
}

// La columna izquierda del panel del ítem, en orden de uso: qué es, su estado y lo que le falta para pasar (con el botón del siguiente), cantidades y precios, origen y envío, el proveedor de su
// última compra y las notas del ítem. Cada grupo se lee como texto y, con permiso, se edita en su modal. Desde 36 rem de ancho, cantidades con origen y proveedor con notas van de a dos, para que entre
// sin desplazar. Sin la fila del ítem (no está en la hoja), sólo el estado y lo que falta.
export function ColumnaDelItem({ fase, queFalta, proveedor, lectura }: Props) {
  const datos = useDatos(lectura)
  const fila = datos?.fila ?? null
  const edita = gruposQueSeEditan(datos?.contexto.editable ?? false)
  const grupo = (clave: ClaveDeGrupo) => {
    const g = GRUPOS_DEL_ITEM.find((x) => x.clave === clave)
    if (g === undefined || datos === null || fila === null) return null
    return (
      <GrupoDelItemEditable
        key={clave}
        grupo={g}
        fila={fila}
        contexto={datos.contexto}
        editable={edita.includes(clave)}
        conflicto={datos.conflicto}
        alRecargar={datos.alRecargar}
      >
        {TEXTO_DEL_GRUPO[clave]({ fila, contexto: datos.contexto })}
      </GrupoDelItemEditable>
    )
  }
  return (
    <div className="@container min-w-0" data-columna-del-item>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 @xl:grid-cols-2">
        <div className="min-w-0 @xl:col-span-2">{grupo('que-es')}</div>
        <div className="min-w-0 @xl:col-span-2">
          <TarjetaDeAjustes
            titulo="Estado"
            densidad="compacta"
            estado={<FaseDelItemInsignia fase={fila?.fase ?? fase} />}
          >
            {datos?.paso ? (
              <div className="flex min-w-0 flex-wrap items-center">{datos.paso}</div>
            ) : null}
            {queFalta}
          </TarjetaDeAjustes>
        </div>
        {grupo('cantidades')}
        {grupo('origen')}
        {proveedor === null ? null : (
          <TarjetaDeAjustes titulo="Proveedor" densidad="compacta">
            {proveedor}
          </TarjetaDeAjustes>
        )}
        <div className={proveedor === null ? 'min-w-0 @xl:col-span-2' : 'min-w-0'}>
          {grupo('notas')}
        </div>
      </div>
    </div>
  )
}
