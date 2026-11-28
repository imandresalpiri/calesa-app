'use client'

// El inspector del editor de artes, el panel derecho: llena su celda de la rejilla (`CELDAS_DEL_EDITOR.derecha`, la columna de 19 rem con
// su borde) a todo el alto. Arriba, la fila de 40 px con «Diseño» y «Textos»; abajo, lo de la pestaña, que se desplaza adentro: elegir otra
// cosa o cambiar de pestaña no cambia el tamaño del panel ni corre el lienzo. «Diseño»: lo elegido (`ContenidoDelInspector`), cada elección
// con sus campos de cero; en sólo lectura todo se ve y nada se cambia. «Textos» (diferido) queda montada desde la primera vez que se ve: lo
// escrito y la versión que devolvió su último guardado siguen al volver.
import { useId, useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { PestanaDerecha } from '../../../../entities/editor/paneles'
import type { PropsDelInspector } from '../../tipos'
import { ContenidoDelInspector } from './contenido-del-inspector'
import { PanelDeTextosDiferido } from './diferidos'
import { PestanasDelInspector } from './pestanas-del-inspector'

export function Inspector({ editor, logos, datos, textos, formato }: PropsDelInspector) {
  const base = useId()
  const [pestana, setPestana] = useState<PestanaDerecha>('diseno')
  const textosVistos = useAbiertoAlgunaVez(pestana === 'textos')
  const idDe = (p: PestanaDerecha, que: 'pestana' | 'panel') => `${base}-${que}-${p}`
  return (
    <aside aria-label="Inspector" className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PestanasDelInspector pestana={pestana} alCambiar={setPestana} idDe={idDe} />
      <div
        key={editor.estado.seleccion.join(',')}
        role="tabpanel"
        id={idDe('diseno', 'panel')}
        aria-labelledby={idDe('diseno', 'pestana')}
        hidden={pestana !== 'diseno'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ContenidoDelInspector editor={editor} logos={logos} datos={datos} formato={formato} />
      </div>
      <div
        role="tabpanel"
        id={idDe('textos', 'panel')}
        aria-labelledby={idDe('textos', 'pestana')}
        hidden={pestana !== 'textos'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
      >
        {textosVistos ? (
          <PanelDeTextosDiferido
            origen={datos.origen}
            catalogo={datos.catalogo}
            textoBase={textos.textoBase}
            motivoDelTextoBase={textos.motivoDelTextoBase}
            portal={textos.portal}
            motivoDelPortal={textos.motivoDelPortal}
            datos={datos.datos}
            sinMoneda={datos.sinMoneda}
          />
        ) : null}
      </div>
    </aside>
  )
}
