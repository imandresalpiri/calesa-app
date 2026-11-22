'use client'

import { SearchIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Input } from '@/shared/ui/input'
import type { DestinoFueraDelNavegador } from '../destinos-de-busqueda'
import type { GrupoDelNavegador } from '../secciones'
import { ResultadosDeLaBusqueda } from './resultados-de-la-busqueda'
import { useBuscadorDeConfiguracion } from './use-buscador-de-configuracion'

// «Buscar en Configuración»: filtra las secciones y sub-secciones que la persona puede abrir por nombre y por las palabras que declara el
// registro, y cada resultado dice su camino («Empresa › Datos de la empresa»). Enter abre el primero; `/` enfoca el buscador (el que se ve);
// Esc lo vacía. Sin resultados: «Nada coincide con «x».» y «Limpiar». Tres lugares:
// - `pagina`: arriba de las tarjetas del inicio; al tipear, los resultados ocupan el lugar de las tarjetas (`children`, que siguen montadas).
// - `menu`: arriba del menú de escritorio (angosto: su campo dice sólo «Buscar…»); los resultados ocupan el lugar del menú.
// - `panel`: arriba del celular y de las pantallas angostas, donde no hay menú; los resultados se abren debajo, sobre la página.
export type VarianteDelBuscador = 'pagina' | 'menu' | 'panel'

const CLASE_DEL_CAMPO: Record<VarianteDelBuscador, string> = {
  pagina: 'h-11 pl-9 md:h-10',
  menu: 'h-9 pl-8',
  panel: 'h-[44px] pl-8 md:h-9',
}

// Una sola lista vacía: un valor por defecto nuevo en cada dibujo rehacería la búsqueda.
const SIN_DESTINOS_FUERA: readonly DestinoFueraDelNavegador[] = []

const CLASE_DEL_PANEL =
  'absolute inset-x-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-1 shadow-(--shadow-lg)'

export function BuscadorDeConfiguracion({
  grupos,
  fuera = SIN_DESTINOS_FUERA,
  variante,
  sinCampoEn,
  children,
}: {
  grupos: readonly GrupoDelNavegador[]
  // Lo que se encuentra y no es de Configuración (Logística › Puertos).
  fuera?: readonly DestinoFueraDelNavegador[]
  variante: VarianteDelBuscador
  // La ruta donde este buscador no dibuja su campo (el inicio, donde el buscador es el de la página): queda sólo `children`.
  sinCampoEn?: string
  children?: ReactNode
}) {
  const id = useId()
  const b = useBuscadorDeConfiguracion(id, grupos, sinCampoEn, fuera)
  const enPanel = variante === 'panel'
  const abierto = b.buscando && !(enPanel && b.cerrado)
  return (
    <div
      className={`grid min-w-0 gap-3 ${enPanel ? 'relative' : ''}`}
      onBlur={(evento) => {
        if (enPanel && !evento.currentTarget.contains(evento.relatedTarget)) {
          b.cerrar()
        }
      }}
    >
      {b.sinCampo ? null : (
        <form
          role="search"
          aria-label="Buscar en Configuración"
          onSubmit={(evento) => {
            evento.preventDefault()
            b.abrirElPrimero()
          }}
          className="relative"
        >
          <label htmlFor={id} className="sr-only">
            Buscar en Configuración
          </label>
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--color-ink-faint)"
          />
          <Input
            data-buscador-de-configuracion=""
            id={id}
            type="search"
            autoComplete="off"
            enterKeyHint="go"
            placeholder={variante === 'menu' ? 'Buscar…' : 'Buscar en Configuración'}
            value={b.texto}
            onChange={(evento) => {
              b.escribir(evento.target.value)
            }}
            onFocus={b.abrir}
            onKeyDown={b.alTeclear}
            className={CLASE_DEL_CAMPO[variante]}
          />
          {!b.buscando && variante === 'pagina' ? <TeclaDeAtajo /> : null}
        </form>
      )}
      <p role="status" className="sr-only">
        {b.anuncio}
      </p>
      {abierto ? (
        <div className={enPanel ? CLASE_DEL_PANEL : ''}>
          <ResultadosDeLaBusqueda
            resultados={b.resultados}
            texto={b.texto}
            idDeLaLista={`${id}-resultados`}
            alMoverse={b.alMoverseEnLaLista}
            alLimpiar={b.limpiar}
          />
        </div>
      ) : null}
      {children === undefined ? null : <div hidden={abierto}>{children}</div>}
    </div>
  )
}

// «/» a la derecha del campo vacío: la tecla que lo enfoca (sólo donde hay teclado).
function TeclaDeAtajo() {
  return (
    <kbd
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-(--radius-sm) border border-(--color-line) bg-(--color-surface-2) px-1 font-sans text-(length:--text-xs) text-(--color-ink-soft) md:inline-flex"
    >
      /
    </kbd>
  )
}
