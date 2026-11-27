'use client'

import { useMemo, useState } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { TablaDelCatalogoDelOrigen } from '../../../entities/catalogo-de-tablas'
import type { ClaveDePieza, Diseno } from '../../../entities/diseno'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { itemParaSumar } from '../../../entities/diseno/ofertas-para-sumar'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
} from '../../../entities/diseno/pieza-de-la-hoja'
import type { FilaSinLugar } from '../../../entities/diseno/sin-lugar'
import type { TonoDelCatalogo } from '../components/aspecto'
import type { ApoyoDelInspector } from '../components/inspector/apoyo-del-inspector'
import { enfocarLaPieza } from './use-apoyo-del-lienzo'
import { useEdicionesDelDiseno } from './use-ediciones-del-diseno'
import { useEditorDelDiseno } from './use-editor-del-diseno'
import { usePiezaElegida } from './use-pieza-elegida'

type Args = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  tonos: readonly Tono[]
  catalogo: readonly TonoDelCatalogo[] | null
  tablas: readonly TablaDelCatalogoDelOrigen[] | null
  nuevoNivel: ApoyoDelInspector['nuevoNivel']
  alCrearColor: ApoyoDelInspector['alCrearColor']
}

// El editor de la hoja entero: el diseño de trabajo y sus ediciones, la pieza elegida (`?pieza=`), lo que el lienzo anuncia y lo que el inspector hace fuera
// de la pieza («Agregar» una fila sin lugar, quitar una pieza cuya fila ya no está, «Ubicar en la hoja» la tarjeta del total).
export function useEditorDeLaHoja({
  origen,
  leida,
  disenoLeido,
  niveles,
  tonos,
  catalogo,
  tablas,
  nuevoNivel,
  alCrearColor,
}: Args) {
  const claves = useMemo(() => catalogo?.map((t) => t.clave) ?? null, [catalogo])
  const editor = useEditorDelDiseno({
    origenId: origen.id,
    leida,
    disenoLeido,
    niveles,
    catalogo: claves,
    tablas,
  })
  const ediciones = useEdicionesDelDiseno(editor.aplicar, leida.definicion)
  const { pieza: elegida, elegir } = usePiezaElegida()
  const [anuncio, setAnuncio] = useState('')
  const apoyo: ApoyoDelInspector = {
    editor,
    ediciones,
    niveles,
    origen,
    catalogoDeTablas: tablas,
    catalogo,
    colores: tonos,
    nuevoNivel,
    alCrearColor,
  }
  return {
    editor,
    ediciones,
    apoyo,
    elegida,
    elegir,
    anuncio,
    anunciar: setAnuncio,
    // «Agregar» de «Sin lugar en la hoja»: al final de la primera sección principal (o de la primera), y queda elegida.
    agregar: (fila: FilaSinLugar) => {
      const { secciones } = editor.trabajo
      const seccion = secciones.find((s) => s.presentacion === 'principal') ?? secciones[0]
      if (seccion === undefined) return
      const item = itemParaSumar(editor.definicion, fila.tipo, fila.nodo)
      editor.sumar(seccion.id, item)
      const pieza = piezaDelItemDeLaHoja(item)
      elegir(pieza)
      enfocarLaPieza(textoDeLaPieza(pieza))
    },
    quitar: (clave: ClaveDePieza) => {
      editor.quitar(clave)
      if (mismaPieza(elegida, piezaDelItemDeLaHoja(clave))) elegir(null)
    },
    ubicarElTotal: () => {
      ediciones.ubicarElTotal()
      enfocarLaPieza(textoDeLaPieza({ pieza: 'total' }))
    },
  }
}
