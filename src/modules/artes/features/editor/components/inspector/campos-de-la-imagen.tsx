'use client'

// Lo propio de una capa con imagen en «Apariencia» del inspector del editor de artes: la variante del logo (de las que tiene la empresa), qué
// foto del vehículo (la 1 es la primera), cómo llena su caja una imagen o una foto (cubrir recorta, contener deja aire) y si la imagen cargó.
import { MAXIMO_DE_FOTOS_DEL_VEHICULO, type CapaConImagen } from '../../../../entities/documento'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { EditorDeArte } from '../../tipos'
import { CampoDeOpciones } from './campo-de-opciones'
import { CampoDesplegable } from './campo-desplegable'
import { cambiarLasCapas, type CambioDeCapa } from './cambiar-las-capas'
import { EstadoDeLaImagen } from './estado-de-la-imagen'

type Props = { editor: EditorDeArte; capa: CapaConImagen; logos: readonly LogoDelEditor[] }

// Sin variante, el logo dibuja la principal.
const LOGO_PRINCIPAL = 'principal'

const AJUSTES = [
  { valor: 'cubrir', etiqueta: 'Cubrir' },
  { valor: 'contener', etiqueta: 'Contener' },
] as const

const FOTOS = Array.from({ length: MAXIMO_DE_FOTOS_DEL_VEHICULO }, (_, indice) => ({
  valor: String(indice),
  etiqueta: `Foto ${String(indice + 1)}`,
}))

export function CamposDeLaImagen({ editor, capa, logos }: Props) {
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
      {capa.tipo === 'foto' ? (
        <CampoDesplegable
          etiqueta="Foto del vehículo"
          valor={String(capa.indice)}
          opciones={FOTOS}
          deshabilitado={apagado}
          alCambiar={(valor) => {
            const indice = Number(valor)
            cambiar('foto', (c) => (c.tipo === 'foto' ? { ...c, indice } : c))
          }}
        />
      ) : null}
      {capa.tipo === 'imagen' || capa.tipo === 'foto' ? (
        <CampoDeOpciones
          etiqueta="Ajuste"
          opciones={AJUSTES}
          valor={capa.ajuste}
          deshabilitado={apagado}
          alCambiar={(ajuste) => {
            cambiar('ajuste', (c) => ('ajuste' in c ? { ...c, ajuste } : c))
          }}
        />
      ) : null}
      <EstadoDeLaImagen capa={capa} logos={logos} />
    </>
  )
}
