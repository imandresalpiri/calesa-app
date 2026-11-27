'use client'

import { debounce, parseAsString, useQueryStates } from 'nuqs'
import { textoDelTope } from '@/shared/lib/conteo'
import { TAMANO_DE_PERSONAS_DEL_LIVE, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { CampoDeBusqueda } from '@/shared/ui/filtros/controles-de-texto'
import type {
  OrigenDelLive,
  PaginaDePersonasDelLive,
  PersonaDelLive,
} from '../../../entities/live-configuracion'
import { MINIMO_DE_BUSQUEDA_DEL_EQUIPO } from '../../../entities/lista-equipo'
import { usePanelesDeLasPersonas } from '../hooks/use-paneles-de-las-personas'
import { usePersonasDelLive } from '../hooks/use-personas-del-live'
import { ModalDeLaPersonaDiferido, VolverALoDeSuRolDiferido } from './diferidos'
import { FilaDeLaPersona } from './fila-de-la-persona'

export type PropsDeAjustesPorPersona = {
  // La primera página que leyó el servidor: con `?q=` (desde 3 letras), las que coinciden por nombre; sin, quienes tienen lo propio.
  pagina: PaginaDePersonasDelLive
  buscando: boolean
  origenes: readonly OrigenDelLive[]
}

const PARAMETROS = { q: parseAsString.withDefault('') }

// «Ajustes por persona» de Configuración › Modo Live: buscar a cualquiera del equipo por nombre o correo (`?q=`) o ver a quienes tienen lo propio,
// los más recientes primero y con «Ver más» hasta `TOPE_DE_LO_CARGADO`. Cada fila abre su modal (`?panel=persona&persona=`) y, con lo propio,
// «Volver a lo de su rol» (`?panel=persona-a-su-rol&persona=`).
export function AjustesPorPersona({ pagina, buscando, origenes }: PropsDeAjustesPorPersona) {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const lista = usePersonasDelLive(pagina, buscando)
  const { editar, aSuRol } = usePanelesDeLasPersonas(lista.personas)
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap gap-2">
        <CampoDeBusqueda
          etiqueta="Buscar a una persona por nombre o correo"
          marcador="Nombre o correo"
          minimo={MINIMO_DE_BUSQUEDA_DEL_EQUIPO}
          valor={parametros.q}
          alBuscar={(q) => {
            if (q !== parametros.q) {
              void setParametros({ q }, { limitUrlUpdates: debounce(300) })
            }
          }}
        />
      </div>
      <CuerpoDeLaLista
        personas={lista.personas}
        buscando={buscando}
        alLimpiar={() => void setParametros({ q: null })}
        alEditar={editar.abrir}
        alVolverASuRol={aSuRol.abrir}
      />
      <PieDeLaLista
        buscando={buscando}
        hayMas={lista.hayMas}
        alTope={lista.alTope}
        puedeVerMas={lista.puedeVerMas}
        pidiendo={lista.pidiendo}
        alVerMas={() => void lista.verMas()}
      />
      {editar.montado && editar.elegida ? (
        <ModalDeLaPersonaDiferido
          abierto={editar.abierto}
          alCerrar={editar.cerrar}
          persona={editar.elegida}
          origenes={origenes}
        />
      ) : null}
      {aSuRol.montado && aSuRol.elegida ? (
        <VolverALoDeSuRolDiferido
          abierto={aSuRol.abierto}
          alCerrar={aSuRol.cerrar}
          persona={aSuRol.elegida}
        />
      ) : null}
    </div>
  )
}

function CuerpoDeLaLista(props: {
  personas: readonly PersonaDelLive[]
  buscando: boolean
  alLimpiar: () => void
  alEditar: (id: string) => void
  alVolverASuRol: (id: string) => void
}) {
  if (props.personas.length === 0) {
    return props.buscando ? (
      <EstadoSinResultados alLimpiar={props.alLimpiar} etiquetaDeLimpiar="Limpiar búsqueda" />
    ) : (
      <EstadoVacio
        compacto
        titulo="Nadie tiene ajustes propios."
        descripcion="Busca a una persona para darle los suyos."
      />
    )
  }
  return (
    <ul aria-label="Personas" className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {props.personas.map((persona) => (
        <FilaDeLaPersona
          key={persona.id}
          persona={persona}
          alEditar={props.alEditar}
          alVolverASuRol={props.alVolverASuRol}
        />
      ))}
    </ul>
  )
}

function PieDeLaLista(props: {
  buscando: boolean
  hayMas: boolean
  alTope: boolean
  puedeVerMas: boolean
  pidiendo: boolean
  alVerMas: () => void
}) {
  if (props.buscando) {
    return props.hayMas ? (
      <AvisoDeTope
        texto={textoDelTope(TAMANO_DE_PERSONAS_DEL_LIVE, {
          articulo: 'las',
          orden: 'primeras por nombre',
        })}
        camino="Escribe más para afinar la búsqueda."
      />
    ) : null
  }
  if (props.alTope && props.hayMas) {
    return (
      <AvisoDeTope
        texto={textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las', orden: 'cambiadas hace menos' })}
        camino="Busca por nombre para llegar a las demás."
      />
    )
  }
  return props.puedeVerMas ? (
    <div>
      <Button variant="outline" disabled={props.pidiendo} onClick={props.alVerMas}>
        {props.pidiendo ? 'Cargando…' : 'Ver más'}
      </Button>
    </div>
  ) : null
}
