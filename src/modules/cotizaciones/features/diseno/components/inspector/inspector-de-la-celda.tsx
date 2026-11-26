'use client'

import {
  NIVEL_TODOS,
  type CeldaDeDiseno,
  type ClaveDePieza,
  type SeccionDeDiseno,
} from '../../../../entities/diseno'
import { celdaAdmiteNivel } from '../../../../entities/diseno/admite-nivel'
import { columnasDeLaCelda } from '../../../../entities/rejilla-de-la-hoja'
import { CamposDelAspectoDelItem, errorDe, SelectorDeColumnas } from '../aspecto'
import { SelectorDeNivel } from '../selector-de-nivel'
import { errorDelAspecto, type ApoyoDelInspector } from './apoyo-del-inspector'
import { AyudaDeLaCelda } from './ayuda'
import { CamposDelNodo } from './campos-del-nodo'

export const SIN_NIVEL_EN_LA_CELDA = 'El total y lo que va aparte los ve todo el mundo.'

type Props = { seccion: SeccionDeDiseno; celda: CeldaDeDiseno; apoyo: ApoyoDelInspector }

// Quién ve y quién edita la celda (la celda gana a su sección: sin nivel propio rige el de la sección), y el «+ Nuevo nivel», que deja el creado en «Quién la
// ve» o, si la celda no admite nivel para ver, en «Quién la edita».
function NivelesDeLaCelda({ seccion, celda, apoyo }: Props) {
  const { editor, ediciones, niveles } = apoyo
  const base = `${seccion.id}__${celda.nodo}`
  const admite = celdaAdmiteNivel(celda, editor.nodos)
  return (
    <>
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <SelectorDeNivel
          nombre={`${base}-ver`}
          etiqueta="Quién la ve"
          valor={celda.nivel_ver ?? seccion.nivel_ver ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={admite ? null : SIN_NIVEL_EN_LA_CELDA}
          ocupado={editor.ocupado}
          alCambiar={(ver) => {
            ediciones.ponerNiveles(seccion.id, celda.nodo, { ver })
          }}
        />
        <SelectorDeNivel
          nombre={`${base}-editar`}
          etiqueta="Quién la edita"
          valor={celda.nivel_editar ?? seccion.nivel_editar ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={null}
          ocupado={editor.ocupado}
          alCambiar={(editar) => {
            ediciones.ponerNiveles(seccion.id, celda.nodo, { editar })
          }}
        />
      </div>
      {apoyo.nuevoNivel?.((nivel) => {
        ediciones.ponerNiveles(seccion.id, celda.nodo, admite ? { ver: nivel } : { editar: nivel })
      }) ?? null}
    </>
  )
}

// La celda elegida: el rótulo y el formato de su fila, su ancho (también con el borde de la pieza o Alt+Shift+←/→), sus niveles, su ayuda y su aspecto.
export function InspectorDeLaCelda({ seccion, celda, apoyo }: Props) {
  const { editor, ediciones } = apoyo
  const clave: ClaveDePieza = { tipo: 'celda', nodo: celda.nodo, seccion: seccion.id }
  const nodo = editor.definicion.nodos.find((n) => n.id === celda.nodo)
  const base = `${seccion.id}__${celda.nodo}`
  const error = errorDelAspecto(editor, { pieza: 'item', clave })
  return (
    <div className="grid min-w-0 gap-3">
      {nodo === undefined ? null : (
        <CamposDelNodo
          key={`${nodo.id}:${nodo.etiqueta}`}
          nodo={nodo}
          conFormato
          ocupado={editor.ocupado}
          alPonerEtiqueta={(texto) => {
            editor.ponerEtiqueta(nodo.id, texto)
          }}
          alPonerFormato={(formato) => {
            editor.ponerFormato(nodo.id, formato)
          }}
        />
      )}
      <SelectorDeColumnas
        nombre={`${base}-ancho`}
        etiqueta="Ancho"
        valor={columnasDeLaCelda(celda.ancho)}
        ocupado={editor.ocupado}
        error={errorDe(error, 'ancho')}
        alCambiar={(columnas) => {
          if (columnas !== null) ediciones.ponerColumnas(clave, columnas)
        }}
      />
      <NivelesDeLaCelda seccion={seccion} celda={celda} apoyo={apoyo} />
      <AyudaDeLaCelda seccion={seccion.id} celda={celda} apoyo={apoyo} />
      <CamposDelAspectoDelItem
        base={base}
        item={celda}
        ocupado={editor.ocupado}
        error={error}
        alPoner={(cambios) => {
          ediciones.ponerAspectoDeItem(clave, cambios)
        }}
      />
    </div>
  )
}
