'use client'

import { diferido } from '@/shared/ui/diferido'
import { textoDelFormato } from '../../../entities/formatos'
import type { PropsDelEditorDeArtes } from '../tipos'
import { MarcoDelEditor } from './marco-del-editor'

function marcoDe({ plantilla }: PropsDelEditorDeArtes) {
  return {
    nombre: plantilla.nombre,
    formato: textoDelFormato(plantilla.formato, plantilla),
  }
}

// El editor de artes (Konva, react-konva, dnd-kit y todo lo suyo) se pide con `import()`: en frío viaja sólo el marco. Mientras llega, el marco
// con el nombre y el formato; si no llega, «Sin conexión» encima del lienzo, con «Reintentar».
export const EditorDeArtesDiferido = diferido(
  () => import('./editor-de-artes').then((m) => m.EditorDeArtes),
  {
    aviso: 'aqui',
    enFrio: (props) => <MarcoDelEditor {...marcoDe(props)} />,
    conElAviso: (props, aviso) => <MarcoDelEditor {...marcoDe(props)} aviso={aviso} />,
  },
)
