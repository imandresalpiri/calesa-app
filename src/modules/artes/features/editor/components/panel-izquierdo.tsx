'use client'

import { useId } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { PestanaIzquierda } from '../../../entities/editor/paneles'
import type { PropsDelPanelIzquierdo } from '../tipos'
import { PestanaAgregar } from './agregar'
import { PestanaCapas } from './capas'
import { TiraDePaginas } from './paginas'
import { PestanasDelPanelIzquierdo } from './pestanas-del-panel-izquierdo'

// El panel izquierdo del editor de artes: 18 rem de ancho y todo el alto, con sus pestañas «Agregar» y «Capas» en una fila de 40 px; lo de
// cada pestaña se desplaza adentro y el panel nunca cambia de tamaño. «Agregar» queda montada desde la primera vez que se ve (la biblioteca
// no se vuelve a leer al ir y volver); «Capas», sólo mientras se ve (se dibuja con cada cambio del documento). En un PDF reparte su alto fijo:
// las pestañas arriba y la tira de páginas abajo (9 rem).
export function PanelIzquierdo(props: PropsDelPanelIzquierdo) {
  const { editor, logos, datos, pestana, alCambiarPestana } = props
  const conPaginas = editor.tipo === 'pdf'
  const base = useId()
  const agregarVista = useAbiertoAlgunaVez(pestana === 'agregar')
  const idDe = (p: PestanaIzquierda, que: 'pestana' | 'panel') => `${base}-${que}-${p}`

  return (
    <aside
      aria-label={conPaginas ? 'Agregar, capas y páginas' : 'Agregar y capas'}
      className="flex h-full min-h-0 w-full min-w-0 flex-col"
    >
      <PestanasDelPanelIzquierdo
        pestana={pestana}
        alCambiarPestana={alCambiarPestana}
        idDe={idDe}
      />
      <div
        role="tabpanel"
        id={idDe('agregar', 'panel')}
        aria-labelledby={idDe('agregar', 'pestana')}
        hidden={pestana !== 'agregar'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {agregarVista ? (
          <PestanaAgregar
            editor={editor}
            logos={logos}
            datos={datos}
            alAgregar={props.alAgregar}
            pedidoDeLaBiblioteca={props.pedidoDeLaBiblioteca}
          />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id={idDe('capas', 'panel')}
        aria-labelledby={idDe('capas', 'pestana')}
        hidden={pestana !== 'capas'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {pestana === 'capas' ? (
          <PestanaCapas editor={editor} logos={logos} conDatos={datos.conDatos} />
        ) : null}
      </div>
      {conPaginas ? (
        <TiraDePaginas
          editor={editor}
          logos={logos}
          datos={datos}
          fuentes={props.fuentes}
          primera={props.primera}
        />
      ) : null}
    </aside>
  )
}
