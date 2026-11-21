'use client'

import { SearchIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { ChipDeEleccion } from '@/shared/ui/filtros'
import { useTextoDeUrl } from '@/shared/ui/filtros/use-texto-de-url'
import { Input } from '@/shared/ui/input'
import {
  hayFiltro,
  textoDeResultados,
  type FiltroDeItems,
  type OpcionesDelFiltro,
} from '../../../entities/items/filtro'
import type { ParteDelFiltro } from '../hooks/use-filtro-de-items'

type Props = {
  filtro: FiltroDeItems
  opciones: OpcionesDelFiltro
  // Cuántas filas quedan con los filtros, cuántas hay y si la hoja trae más (el contador no es un total exacto).
  cuantas: number
  total: number
  hayMas: boolean
  alCambiar: (parte: ParteDelFiltro, valor: string | null) => void
  alAlternarSinPrecio: () => void
  alLimpiar: () => void
  // «Agregar ítem»: sólo con `repuestos.editar`, el proyecto abierto y menos de 200 ítems.
  alAgregar: (() => void) | null
}

// Las fichas de elección: cada una con su nombre y lo que dice «sin elegir». Las opciones son las que los ítems del proyecto tienen.
const FICHAS = [
  { parte: 'fase', etiqueta: 'Fase', todas: 'Todas' },
  { parte: 'tipo', etiqueta: 'Tipo de pieza', todas: 'Todos' },
  { parte: 'condicion', etiqueta: 'Condición', todas: 'Todas' },
  { parte: 'pais', etiqueta: 'País de origen', todas: 'Todos' },
  { parte: 'via', etiqueta: 'Vía de transporte', todas: 'Todas' },
] as const satisfies readonly {
  parte: keyof OpcionesDelFiltro & ParteDelFiltro
  etiqueta: string
  todas: string
}[]

const IGUAL = (texto: string) => texto

function Buscador({
  valor,
  alCambiar,
}: {
  valor: string
  alCambiar: (valor: string | null) => void
}) {
  const id = useId()
  const [texto, setTexto] = useTextoDeUrl(valor, IGUAL)
  return (
    <div className="relative min-w-48 flex-1 basis-64">
      <label htmlFor={id} className="sr-only">
        Buscar ítems
      </label>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--color-ink-faint)"
      />
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Buscar pieza, descripción, tracking o notas"
        className="h-11 pl-8 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          alCambiar(evento.target.value === '' ? null : evento.target.value)
        }}
      />
    </div>
  )
}

function Fichas({ filtro, opciones, alCambiar }: Pick<Props, 'filtro' | 'opciones' | 'alCambiar'>) {
  return FICHAS.map(({ parte, etiqueta, todas }) => (
    <ChipDeEleccion
      key={parte}
      etiqueta={etiqueta}
      todas={todas}
      opciones={opciones[parte]}
      valor={filtro[parte]}
      alElegir={(valor) => {
        alCambiar(parte, valor)
      }}
    />
  ))
}

// La barra de la pestaña Ítems: el buscador, las fichas de filtro (una sola opción cada una), «Sin precio», «Limpiar filtros» y, con permiso, «Agregar ítem». Con filtros, «3 de 12 ítems». Se parte
// en líneas (`flex-wrap`): con el texto al 200 % nada ensancha la página.
export function BarraDeItems(props: Props) {
  const { filtro, alCambiar } = props
  const filtrado = hayFiltro(filtro)
  return (
    <div role="group" aria-label="Buscar y filtrar los ítems" className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Buscador
          valor={filtro.q}
          alCambiar={(valor) => {
            alCambiar('q', valor)
          }}
        />
        {props.alAgregar === null ? null : (
          <Button
            type="button"
            data-agregar-item=""
            className="min-h-11 md:min-h-9"
            onClick={props.alAgregar}
          >
            Agregar ítem
          </Button>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Fichas filtro={filtro} opciones={props.opciones} alCambiar={alCambiar} />
        <Button
          type="button"
          variant={filtro.sinPrecio ? 'secondary' : 'outline'}
          size="sm"
          aria-pressed={filtro.sinPrecio}
          className="min-h-11 rounded-full md:min-h-9"
          onClick={props.alAlternarSinPrecio}
        >
          Sin precio
        </Button>
        {filtrado ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-9"
            onClick={props.alLimpiar}
          >
            Limpiar filtros
          </Button>
        ) : null}
      </div>
      {filtrado ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDeResultados(props.cuantas, props.total, props.hayMas)}
        </p>
      ) : null}
    </div>
  )
}
