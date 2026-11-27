'use client'

import { useMemo } from 'react'
import type { PlantillaEnCuadricula } from '../../../../../entities/cuadricula-de-la-tarjeta'
import { estiloComun } from '../../../../../entities/plantilla/edicion/estilo'
import type { MapaDeLaGrilla } from '../../../../../entities/plantilla/edicion/mapa-de-la-grilla'
import type { EstadoDelEditor } from '../../../../../entities/plantilla/edicion/estado-del-editor'
import { rangoDe } from '../../../../../entities/plantilla/edicion/seleccion'
import type { Disponibilidad } from '../../../../../entities/plantilla/edicion/disponibilidad'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import { motivoDelContenido } from '../../../../../entities/plantilla/paneles-del-editor'
import type { ReferenciaDeLaTarjeta } from '../../../../../entities/referencia-de-la-tarjeta'
import type { EscalaDelLienzo } from '../../../../../entities/vista-previa-de-la-plantilla'
import type { PanelDeLaTarjeta } from '../../../hooks/use-panel-de-la-tarjeta'
import { useNombreDelAtajo } from '../../../hooks/use-nombre-del-atajo'
import { GrupoDeEstilo } from './grupo-de-estilo'
import { GrupoDeFilasYColumnas } from './grupo-de-filas-y-columnas'
import { GrupoDeHistorial } from './grupo-de-historial'
import { GrupoDeInsertar } from './grupo-de-insertar'
import { GrupoDePaneles } from './grupo-de-paneles'
import { GrupoDeVer } from './grupo-de-ver'

type Props = {
  estado: EstadoDelEditor
  plantilla: PlantillaEnCuadricula
  mapa: MapaDeLaGrilla
  disponible: Disponibilidad
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
  panel: PanelDeLaTarjeta
  alPedirContenido: (tipo: 'texto' | 'dato') => void
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  origen: string
  alElegirReferencia: (ejemplo: boolean) => void
  escala: EscalaDelLienzo
  alCambiarLaEscala: (escala: EscalaDelLienzo) => void
  // El tamaño de la tarjeta dibujada, en px.
  tamano: { ancho: number; alto: number } | null
}

// La única barra del editor, compacta y siempre del mismo alto: Historial · Insertar (filas, columnas y un texto, un dato o el logo) · Estilo (negrita, cursiva y
// alineación) · Filas y columnas (combinar, separar, eliminar) · Ver (referencia, «Ajustar | 100 %» y tamaño) · Paneles («Columnas» y «Celda» o «Fila», que abren al
// costado). Debajo, con su lugar reservado, por qué no se hizo lo último (también se anuncia).
export function BarraDelEditor(props: Props) {
  const { estado, plantilla, mapa, disponible, hacer, ocupado } = props
  const nombreDelAtajo = useNombreDelAtajo()
  const sel = estado.seleccion
  const comun = useMemo(
    () => (sel === null ? null : estiloComun(plantilla, rangoDe(sel, mapa, plantilla))),
    [sel, plantilla, mapa],
  )
  const grupo = { disponible, hacer, ocupado, nombreDelAtajo }
  return (
    <div className="grid min-w-0 gap-1" data-barra-del-lienzo="">
      <div
        role="toolbar"
        aria-label="Barra del lienzo"
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
      >
        <GrupoDeHistorial {...grupo} historial={estado.historial} />
        <GrupoDeInsertar
          {...grupo}
          motivoDelContenido={motivoDelContenido(sel)}
          alPedirContenido={props.alPedirContenido}
        />
        <GrupoDeEstilo
          comun={comun}
          ocupado={ocupado}
          alCambiar={(cambio) => {
            hacer({ tipo: 'estilo', cambio })
          }}
        />
        <GrupoDeFilasYColumnas {...grupo} />
        <GrupoDeVer
          referencia={props.referencia}
          ejemplo={props.ejemplo}
          origen={props.origen}
          alElegirReferencia={props.alElegirReferencia}
          escala={props.escala}
          alCambiarLaEscala={props.alCambiarLaEscala}
          tamano={props.tamano}
        />
        <div className="ml-auto">
          <GrupoDePaneles panel={props.panel} seleccion={sel} ocupado={ocupado} />
        </div>
      </div>
      <p
        className="min-h-5 text-(length:--text-sm) text-(--color-peligro-ink)"
        data-rechazo-del-lienzo=""
      >
        {estado.rechazo}
      </p>
    </div>
  )
}
