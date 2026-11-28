'use client'

import { Stage } from 'react-konva'
import type { HerramientaDelEditor } from '../../../../entities/editor/atajos'
import { ARRASTRE_MINIMO } from '../../../../entities/editor/lienzo'
import { useLienzo } from '../../hooks/use-lienzo'
import type { PropsDelLienzo } from '../../tipos'
import { CapaDeContenido } from './capa-de-contenido'
import { CapaDeInterfaz } from './capa-de-interfaz'
import { PildoraDeZoom } from './pildora-de-zoom'
import { TextoEnElLienzo } from './texto-en-el-lienzo'

function cursorDe(herramienta: HerramientaDelEditor, mano: boolean, paneando: boolean): string {
  if (mano) {
    return paneando ? 'grabbing' : 'grab'
  }
  if (herramienta === 'texto') {
    return 'text'
  }
  return herramienta === 'mover' ? 'default' : 'crosshair'
}

// El lienzo del editor de artes: un `Stage` de Konva del tamaño del área, con la cámara (posición y escala), la capa del documento (lo que
// se exporta) y la de la interfaz encima; el texto que se escribe en el lugar y la píldora del zoom van en HTML sobre él.
export function Lienzo(props: PropsDelLienzo) {
  const { editor, logos, herramienta, camara, tamano } = props
  const { pagina, medidas, soloLectura } = editor
  const { escala, mano, texto, puntero, arrastre, fuentes, pluma, colores, ...l } = useLienzo(props)
  const { stage, setStage, setArea, alMedirTexto } = l

  return (
    <div
      ref={setArea}
      className="absolute inset-0"
      style={{ cursor: cursorDe(herramienta, mano, puntero.paneando) }}
    >
      <Stage
        ref={setStage}
        width={tamano.ancho}
        height={tamano.alto}
        x={camara.camara.x}
        y={camara.camara.y}
        scaleX={escala}
        scaleY={escala}
        dragDistance={ARRASTRE_MINIMO}
        onPointerDown={puntero.alApretar}
        onPointerClick={puntero.alClic}
        onPointerDblClick={puntero.alDobleClic}
        onPointerOver={puntero.alEntrar}
        onPointerOut={puntero.alSalir}
        onPointerMove={puntero.alMover}
        onDragStart={arrastre.alEmpezar}
        onDragMove={arrastre.alMover}
        onDragEnd={arrastre.alSoltar}
      >
        <CapaDeContenido
          pagina={pagina}
          medidas={medidas}
          logos={logos}
          escucha={herramienta === 'mover' && !mano}
          soloLectura={soloLectura}
          editando={texto.capa?.id ?? null}
          fuentes={fuentes}
          escala={escala}
          alMedirTexto={alMedirTexto}
        />
        <CapaDeInterfaz
          editor={editor}
          stage={stage}
          herramienta={herramienta}
          mano={mano}
          editando={texto.capa?.id ?? null}
          encima={puntero.encima}
          guias={arrastre.guias}
          boceto={puntero.boceto}
          pluma={pluma}
          escala={escala}
          colores={colores}
        />
      </Stage>
      {texto.capa ? (
        <TextoEnElLienzo
          key={texto.capa.id}
          capa={texto.capa}
          camara={camara.camara}
          familia={fuentes.familiaDe(texto.capa.fuente)}
          alTerminar={texto.terminar}
        />
      ) : null}
      <PildoraDeZoom camara={camara} />
    </div>
  )
}
