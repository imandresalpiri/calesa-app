'use client'

import type { ComponentType } from 'react'
import { MARGEN_DEL_LIENZO } from '../../../../entities/plantilla/edicion/disposicion'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import type { EditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import type { LienzoDelEditor } from '../../hooks/use-lienzo-del-editor'
import type { PanelDeLaTarjeta } from '../../hooks/use-panel-de-la-tarjeta'
import { BarraDelEditor } from './barra/barra-del-editor'
import { CapaDeEdicion } from './capa-de-edicion'
import { OcultasConEstaReferencia } from './ocultas-con-esta-referencia'

type Props = {
  editor: EditorDeLaCuadricula
  lienzo: LienzoDelEditor
  ocupado: boolean
  panel: PanelDeLaTarjeta
  origen: string
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  alElegirReferencia: (ejemplo: boolean) => void
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  alFallarElLogo: () => void
}

// La barra única y el lienzo: la tarjeta a escala que dibuja el área `tarjeta` (el hueco `Lienzo`), con la capa del editor encima y, debajo, las filas ocultas con esta
// referencia.
export function ZonaDelLienzo({
  editor,
  lienzo,
  ocupado,
  panel,
  origen,
  referencia,
  ejemplo,
  alElegirReferencia,
  Lienzo,
  alFallarElLogo,
}: Props) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <BarraDelEditor
        estado={editor.estado}
        plantilla={editor.plantilla}
        mapa={editor.mapa}
        disponible={lienzo.disponible}
        hacer={editor.hacer}
        ocupado={ocupado}
        panel={panel}
        alPedirContenido={lienzo.pedirAlPanel}
        referencia={referencia}
        ejemplo={ejemplo}
        origen={origen}
        alElegirReferencia={alElegirReferencia}
        escala={lienzo.escala}
        alCambiarLaEscala={lienzo.setEscala}
        tamano={lienzo.tamano}
      />
      <Lienzo
        lectura={lienzo.lectura}
        referencia={referenciaUsada(referencia, ejemplo)}
        escala={lienzo.escala}
        margen={MARGEN_DEL_LIENZO}
        alFallarElLogo={alFallarElLogo}
        capa={(g, factor) => (
          <CapaDeEdicion
            g={g}
            escala={factor}
            editor={editor}
            plantilla={lienzo.dibujada}
            ocupado={ocupado}
            disponible={lienzo.disponible}
            rejilla={lienzo.rejilla}
            nombreDe={lienzo.nombreDe}
            alEditarContenido={lienzo.alEditarContenido}
            alAnchoProvisional={lienzo.setProvisional}
            alTamano={lienzo.setTamano}
          />
        )}
        debajo={(g) => (
          <OcultasConEstaReferencia
            ocultas={g.ocultas}
            alElegir={(fila) => {
              const f = editor.mapa.indiceDeFila.get(fila)
              if (f !== undefined)
                editor.hacer({
                  tipo: 'seleccionar',
                  seleccion: { tipo: 'filas', desde: f, hasta: f },
                })
            }}
          />
        )}
      />
    </div>
  )
}
