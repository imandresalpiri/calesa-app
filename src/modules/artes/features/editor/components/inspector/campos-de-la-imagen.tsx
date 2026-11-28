'use client'

// Lo propio de una capa con imagen en «Apariencia» del inspector del editor de artes: la variante del logo (de las que tiene la empresa), lo
// de la foto del vehículo (`CamposDeLaFoto`: cuál, su ajuste y su foco), cómo llena su caja una imagen de la biblioteca (cubrir recorta,
// contener deja aire) y si la imagen cargó. `fuente` es lo que el lienzo dibuja para la capa con los datos de hoy (nula: no hay de dónde).
import type { CapaConImagen } from '../../../../entities/documento'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { EditorDeArte } from '../../tipos'
import { CampoDeOpciones } from './campo-de-opciones'
import { CampoDesplegable } from './campo-desplegable'
import { cambiarLasCapas, type CambioDeCapa } from './cambiar-las-capas'
import { CamposDeLaFoto } from './campos-de-la-foto'
import { EstadoDeLaImagen } from './estado-de-la-imagen'

type Props = {
  editor: EditorDeArte
  capa: CapaConImagen
  logos: readonly LogoDelEditor[]
  fuente: FuenteDeImagen | null
}

// Sin variante, el logo dibuja la principal.
const LOGO_PRINCIPAL = 'principal'

const AJUSTES = [
  { valor: 'cubrir', etiqueta: 'Cubrir' },
  { valor: 'contener', etiqueta: 'Contener' },
] as const

export function CamposDeLaImagen({ editor, capa, logos, fuente }: Props) {
  const apagado = editor.soloLectura
  const cambiar = (campo: string, cambio: CambioDeCapa) => {
    cambiarLasCapas(editor, [capa.id], campo, cambio)
  }
  return (
    <>
      {capa.tipo === 'logo' ? (
        <CampoDesplegable
          etiqueta="Variante"
          valor={capa.varianteId ?? LOGO_PRINCIPAL}
          opciones={logos.map((logo) => ({ valor: logo.id, etiqueta: logo.nombre }))}
          deshabilitado={apagado}
          alCambiar={(varianteId) => {
            cambiar('variante', (c) => (c.tipo === 'logo' ? { ...c, varianteId } : c))
          }}
        />
      ) : null}
      {capa.tipo === 'foto' ? <CamposDeLaFoto editor={editor} capa={capa} fuente={fuente} /> : null}
      {capa.tipo === 'imagen' ? (
        <CampoDeOpciones
          etiqueta="Ajuste"
          opciones={AJUSTES}
          valor={capa.ajuste}
          deshabilitado={apagado}
          alCambiar={(ajuste) => {
            cambiar('ajuste', (c) => (c.tipo === 'imagen' ? { ...c, ajuste } : c))
          }}
        />
      ) : null}
      <EstadoDeLaImagen capa={capa} fuente={fuente} />
    </>
  )
}
