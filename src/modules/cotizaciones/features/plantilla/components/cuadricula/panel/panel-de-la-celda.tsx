'use client'

import type { RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import {
  ANCHO_DE_COLUMNA,
  type PlantillaEnCuadricula,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { estiloComun } from '../../../../../entities/plantilla/edicion/estilo'
import {
  celdaEn,
  type MapaDeLaGrilla,
} from '../../../../../entities/plantilla/edicion/mapa-de-la-grilla'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import { rutaDeLaSeleccion } from '../../../../../entities/plantilla/edicion/ruta-de-la-seleccion'
import {
  rangoDe,
  seleccionarColumnas,
  seleccionarFilas,
  type Seleccion,
} from '../../../../../entities/plantilla/edicion/seleccion'
import type { Rect } from '../../../../../entities/plantilla/edicion/tipos'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CampoDeBordes } from './campo-de-bordes'
import { CampoDeNumero } from './campo-de-numero'
import { CampoDelColor } from './campo-del-color'
import { CampoDelContenido } from './campo-del-contenido'
import { CampoDelFormato } from './campo-del-formato'
import { SeccionDelPanel } from './seccion-del-panel'

type Props = {
  plantilla: PlantillaEnCuadricula
  mapa: MapaDeLaGrilla
  seleccion: Extract<Seleccion, { tipo: 'celdas' | 'columnas' }>
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  nombrados: ReadonlySet<string>
  enfoque: RefObject<HTMLDivElement | null>
  hacer: (accion: AccionDelEditor) => void
}

function SeccionDelColor(props: {
  fondo: string | null
  texto: string | null
  tonos: readonly TonoDelCatalogo[]
  alCambiar: (cambio: { fondo: string } | { texto: string }) => void
}) {
  return (
    <SeccionDelPanel titulo="Color">
      <CampoDelColor
        etiqueta="Fondo"
        valor={props.fondo}
        tonos={props.tonos}
        conAviso
        alElegir={(fondo) => {
          props.alCambiar({ fondo })
        }}
      />
      <CampoDelColor
        etiqueta="Texto"
        valor={props.texto}
        tonos={props.tonos}
        alElegir={(texto) => {
          props.alCambiar({ texto })
        }}
      />
    </SeccionDelPanel>
  )
}

function SuFilaYSuColumna({ r, hacer }: { r: Rect; hacer: (accion: AccionDelEditor) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          hacer({ tipo: 'seleccionar', seleccion: seleccionarFilas(r.f0, r.f1) })
        }}
      >
        Seleccionar su fila
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          hacer({ tipo: 'seleccionar', seleccion: seleccionarColumnas(r.k0, r.k1) })
        }}
      >
        Seleccionar su columna
      </Button>
    </div>
  )
}

// Con una celda (o un rango, o columnas) elegida: su ruta, «Contenido», «Color», «Formato» y «Bordes», aplicados a todas; con una columna, además su ancho; con celdas,
// «Seleccionar su fila» y «Seleccionar su columna».
export function PanelDeLaCelda({
  plantilla,
  mapa,
  seleccion,
  contexto,
  tonos,
  nombrados,
  enfoque,
  hacer,
}: Props) {
  const r = rangoDe(seleccion, mapa, plantilla)
  const celda = celdaEn(mapa, plantilla, { f: r.f0, k: r.k0 })?.celda ?? null
  const comun = estiloComun(plantilla, r)
  const columna = seleccion.tipo === 'columnas' ? plantilla.columnas[r.k0] : undefined
  return (
    <div className="grid min-w-0 gap-4" data-panel-de-la-celda="">
      <p className="font-medium [overflow-wrap:anywhere]" data-ruta-de-la-seleccion="">
        {rutaDeLaSeleccion(seleccion, mapa, plantilla)}
      </p>
      {columna === undefined ? null : (
        <SeccionDelPanel titulo="Ancho">
          <CampoDeNumero
            etiqueta="Ancho de la columna"
            valor={columna.ancho}
            minimo={ANCHO_DE_COLUMNA.minimo}
            maximo={ANCHO_DE_COLUMNA.maximo}
            alCambiar={(ancho) => {
              hacer({ tipo: 'ancho', columna: r.k0, ancho })
            }}
          />
        </SeccionDelPanel>
      )}
      <SeccionDelPanel titulo="Contenido">
        <CampoDelContenido
          key={`${String(r.f0)}:${String(r.k0)}`}
          contenido={celda?.contenido ?? null}
          clave={`texto:${celda?.id ?? `${String(r.f0)}:${String(r.k0)}`}`}
          contexto={contexto}
          nombrados={nombrados}
          enfoque={enfoque}
          alCambiar={(contenido, clave) => {
            hacer({ tipo: 'contenido', contenido, ...(clave === undefined ? {} : { clave }) })
          }}
          alDeshacer={() => {
            hacer({ tipo: 'deshacer' })
          }}
          alRehacer={() => {
            hacer({ tipo: 'rehacer' })
          }}
        />
      </SeccionDelPanel>
      <SeccionDelColor
        fondo={comun.fondo ?? null}
        texto={comun.texto ?? null}
        tonos={tonos}
        alCambiar={(cambio) => {
          hacer({ tipo: 'estilo', cambio })
        }}
      />
      <SeccionDelPanel titulo="Formato">
        <CampoDelFormato
          comun={comun}
          alCambiar={(cambio) => {
            hacer({ tipo: 'estilo', cambio })
          }}
        />
      </SeccionDelPanel>
      <SeccionDelPanel titulo="Bordes">
        <CampoDeBordes
          comun={comun}
          alCambiar={(cambio) => {
            hacer({ tipo: 'estilo', cambio })
          }}
        />
      </SeccionDelPanel>
      {seleccion.tipo === 'celdas' ? <SuFilaYSuColumna r={r} hacer={hacer} /> : null}
    </div>
  )
}
