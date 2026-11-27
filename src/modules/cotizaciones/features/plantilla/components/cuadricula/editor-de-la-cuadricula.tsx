'use client'

import { useState, type ComponentType } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import type { PropsDelEditor } from '../../../../entities/plantilla/props-del-editor'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import { useEditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import { useAtajosDeLaTarjeta } from '../../hooks/use-atajos-de-la-tarjeta'
import { useGuardarLaPlantilla } from '../../hooks/use-guardar-la-plantilla'
import { useLienzoDelEditor } from '../../hooks/use-lienzo-del-editor'
import type { PanelDeLaTarjeta } from '../../hooks/use-panel-de-la-tarjeta'
import { AvisosDelEditor } from '../avisos-del-editor'
import { CabezaDelEditor } from './cabeza-del-editor'
import { DrawerDelPanelDiferido } from './panel/diferidos'
import { ZonaDelLienzo } from './zona-del-lienzo'

export type PropsDelEditorDeLaCuadricula = PropsDelEditor & {
  // Lo que la pestaña tiene abierto en la URL (`?panel=`): el editor abre y cierra los paneles del costado.
  panel: PanelDeLaTarjeta
  referencia: ReferenciaDeLaTarjeta
  // `?referencia=ejemplo`: las cifras de ejemplo aunque haya cotización.
  ejemplo: boolean
  alElegirReferencia: (ejemplo: boolean) => void
  // El hueco del lienzo, que llena el área `tarjeta`.
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  // Un rechazo de publicar con su lugar («Ir a la celda»): se elige en el lienzo.
  irA: { donde: string; vez: number } | null
  // Entró el guardado: la versión nueva (la pestaña no remonta el editor cuando llega).
  alGuardar: (esperada: string) => void
  alPublicar: () => void
  alDescartar: () => void
  // `empresa.ajustes.gestionar`: el aviso del logo que no se dibuja abre Empresa.
  puedeCambiarElLogo: boolean
}

// El logo de la referencia que no cargó: se avisa mientras el lienzo dibuja esa misma URL (con las cifras de ejemplo no hay imagen).
function useLogoRoto(referencia: PropsDelEditorDeLaCuadricula['referencia'], ejemplo: boolean) {
  const url = referenciaUsada(referencia, ejemplo)?.contexto.logo?.url ?? null
  const [rota, setRota] = useState<string | null>(null)
  return { roto: url !== null && rota === url, alFallar: () => setRota(url) }
}

// Lo que el editor anuncia al lector de pantalla; la misma frase dos veces seguidas se distingue con un espacio de ancho cero.
function AnuncioDelEditor({ anuncio }: { anuncio: { texto: string; vez: number } }) {
  return (
    <p role="status" className="sr-only" data-anuncio-del-editor="">
      {anuncio.texto}
      {anuncio.vez % 2 === 1 ? '​' : ''}
    </p>
  )
}

// El editor de la tarjeta como Excel: la barra única y el lienzo (la tarjeta a escala, dibujada por el área `tarjeta`, con la capa del editor encima) ocupan todo el
// ancho, con un título sólo para el lector de pantalla; el panel («Columnas», «Celda», «Fila») se abre aparte, al costado (`?panel=`), sin moverlo. Los avisos tienen su
// lugar reservado: que aparezcan no mueve el lienzo. Escribe sólo la forma 2. Nace de la cuadrícula que le arma el servidor; guardar no lo remonta (sigue el historial) y
// una versión ajena sí (`key` de la pestaña).
export function EditorDeLaCuadricula(props: PropsDelEditorDeLaCuadricula) {
  const { origen, esperada, contexto, tonos, inicial, guardada } = props
  const editor = useEditorDeLaCuadricula({
    origenId: origen.id,
    esperada,
    inicial,
    guardada,
    contexto,
  })
  const guardar = useGuardarLaPlantilla({
    origenId: origen.id,
    formulaDelOrigenId: props.formulaDelOrigenId,
    esperada,
    plantilla: editor.plantilla,
    puedeGuardar: editor.puedeGuardar,
    limpiarBorrador: editor.limpiar,
    alGuardar: props.alGuardar,
  })
  const lienzo = useLienzoDelEditor({ editor, panel: props.panel, contexto, tonos, irA: props.irA })
  useAtajosDeLaTarjeta(editor.hacer, guardar.ocupado)
  const panelAbierto = props.panel.celda || props.panel.columnas
  const montarPanel = useAbiertoAlgunaVez(panelAbierto)
  const logo = useLogoRoto(props.referencia, props.ejemplo)
  return (
    <section
      aria-label="Editor de la tarjeta"
      className="@container/editor grid min-w-0 gap-3"
      data-editor-de-la-tarjeta=""
    >
      <h3 className="sr-only">Tarjeta de {origen.nombre}</h3>
      <div className="grid min-h-12 min-w-0 content-start gap-2" data-avisos-del-editor="">
        <CabezaDelEditor props={props} editor={editor} guardar={guardar} panel={props.panel} />
        <AvisosDelEditor
          deLaLectura={[...props.avisos, ...Object.values(guardar.porCampo)]}
          paraPublicar={editor.rechazoParaPublicar?.mensaje ?? null}
          guardar={guardar}
          hrefVer={rutaDeLaFormula(origen.id, props.formulaDelOrigenId, 'tarjeta')}
          logoRoto={logo.roto}
          puedeCambiarElLogo={props.puedeCambiarElLogo}
        />
      </div>
      <ZonaDelLienzo
        editor={editor}
        lienzo={lienzo}
        ocupado={guardar.ocupado}
        panel={props.panel}
        origen={origen.nombre}
        referencia={props.referencia}
        ejemplo={props.ejemplo}
        alElegirReferencia={props.alElegirReferencia}
        Lienzo={props.Lienzo}
        alFallarElLogo={logo.alFallar}
      />
      {montarPanel ? (
        <DrawerDelPanelDiferido
          panel={props.panel}
          editor={editor}
          contexto={contexto}
          tonos={tonos}
          nombrados={lienzo.nombrados}
          ocupado={guardar.ocupado}
          enfoque={lienzo.enfoque}
          pedido={lienzo.pedido}
          alAtender={lienzo.alAtenderElPedido}
        />
      ) : null}
      <AnuncioDelEditor anuncio={editor.estado.anuncio} />
    </section>
  )
}
