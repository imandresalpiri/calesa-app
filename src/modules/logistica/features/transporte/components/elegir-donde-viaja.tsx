'use client'

import {
  leerContenedoresParaElegir,
  leerEmbarquesParaElegir,
} from '../../../areas/transporte/composicion.client'
import type { TipoDeDestino } from '../../../entities/transporte/donde-viaja'
import type { EstadoDelContenedor } from '../../../entities/transporte/estado'
import type {
  ContenedorDeLaLista,
  EmbarqueDeLaLista,
} from '../../../entities/transporte/lista-de-embarques'
import { textoDeLaLlegada, textoDeVehiculos } from '../../../entities/transporte/textos'
import type { DestinoElegido } from '../hooks/use-donde-viaja'
import { useDia } from '../hooks/use-dia'
import { useOpcionesParaElegir } from '../hooks/use-opciones-para-elegir'
import { BuscarEnLasOpciones } from './buscar-en-las-opciones'
import { InsigniaDeEstado } from './insignia-de-estado'

type Props = {
  origenId: string
  elegido: DestinoElegido | null
  alElegir: (d: DestinoElegido) => void
  error?: string
  apagado: boolean
}

type Opcion = {
  id: string
  codigo: string
  estado: EstadoDelContenedor
  detalle: string
}

type PropsDeLaLista = Props & {
  tipo: TipoDeDestino
  opciones: ReturnType<typeof useOpcionesParaElegir<unknown>>
  filas: readonly Opcion[]
}

const TEXTOS: Record<
  TipoDeDestino,
  { leyenda: string; vacio: string; sinCoincidir: string; buscar: string }
> = {
  contenedor: {
    leyenda: 'Contenedores del origen',
    vacio: 'Este origen todavía no tiene contenedores.',
    sinCoincidir: 'Ningún contenedor empieza así.',
    buscar: 'Buscar un contenedor por número',
  },
  embarque: {
    leyenda: 'Embarques del origen',
    vacio: 'Este origen todavía no tiene embarques.',
    sinCoincidir: 'Ningún embarque empieza así.',
    buscar: 'Buscar un embarque por booking',
  },
}

// Las opciones de una sola elección (de a diez, con búsqueda por prefijo desde 3 letras o dígitos): cada una con su código, su estado y lo que lleva.
function ListaParaElegir({
  tipo,
  opciones,
  filas,
  elegido,
  alElegir,
  error,
  apagado,
}: PropsDeLaLista) {
  const textos = TEXTOS[tipo]
  const idError = error ? `donde-viaja-${tipo}-error` : undefined
  return (
    <fieldset
      className="grid min-w-0 gap-2"
      aria-describedby={idError}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium">{textos.leyenda}</legend>
      {opciones.estado.tipo === 'listo' && filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {opciones.texto.trim() === '' ? textos.vacio : textos.sinCoincidir}
        </p>
      ) : null}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {filas.map((o) => (
          <li key={o.id} className="min-w-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-input) border border-(--color-line) px-3 py-2 has-checked:border-(--color-line-strong) has-checked:bg-(--color-paper-soft)">
              <input
                type="radio"
                name={`donde-viaja-${tipo}`}
                value={o.id}
                checked={elegido?.id === o.id}
                onChange={() => alElegir({ tipo, id: o.id, codigo: o.codigo })}
                disabled={apagado}
              />
              <span className="grid min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium [overflow-wrap:anywhere]">{o.codigo}</span>
                  <InsigniaDeEstado estado={o.estado} />
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink-soft)">{o.detalle}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      <BuscarEnLasOpciones
        nombre={`donde-viaja-buscar-${tipo}`}
        etiqueta={textos.buscar}
        opciones={opciones}
        apagado={apagado}
      />
    </fieldset>
  )
}

function deContenedor(c: ContenedorDeLaLista, dia: (f: string) => string): Opcion {
  return {
    id: c.id,
    codigo: c.numero,
    estado: c.estado,
    detalle: [
      c.embarque ? `En el embarque ${c.embarque.booking}` : null,
      textoDeLaLlegada({ etaEl: c.etaEl, arriboEl: null }, dia),
      textoDeVehiculos(c.vehiculos, c.hayOcultos),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

function deEmbarque(e: EmbarqueDeLaLista, dia: (f: string) => string): Opcion {
  return {
    id: e.id,
    codigo: e.booking,
    estado: e.estado,
    detalle: [textoDeLaLlegada(e, dia), textoDeVehiculos(e.vehiculos, e.hayOcultos)]
      .filter(Boolean)
      .join(' · '),
  }
}

/** Los contenedores del origen (con embarque o sin él), para elegir dónde viaja la unidad. */
export function ElegirContenedor(props: Props) {
  const dia = useDia()
  const opciones = useOpcionesParaElegir(leerContenedoresParaElegir, props.origenId)
  const filas =
    opciones.estado.tipo === 'listo' ? opciones.estado.filas.map((c) => deContenedor(c, dia)) : []
  return <ListaParaElegir {...props} tipo="contenedor" opciones={opciones} filas={filas} />
}

/** Los embarques del origen, para elegir dónde viaja la unidad (sin contenedor). */
export function ElegirEmbarque(props: Props) {
  const dia = useDia()
  const opciones = useOpcionesParaElegir(leerEmbarquesParaElegir, props.origenId)
  const filas =
    opciones.estado.tipo === 'listo' ? opciones.estado.filas.map((e) => deEmbarque(e, dia)) : []
  return <ListaParaElegir {...props} tipo="embarque" opciones={opciones} filas={filas} />
}
