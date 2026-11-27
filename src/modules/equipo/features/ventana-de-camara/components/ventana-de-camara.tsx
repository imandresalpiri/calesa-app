'use client'

import { useState, type HTMLAttributes } from 'react'
import {
  altoDelVideo,
  limitarElAncho,
  llevarAdentro,
  posicionEnPx,
  type DatosDeQuienPresenta,
  type VentanaDeCamara,
} from '../../../entities/ventana-de-camara'
import { useCamara } from '../hooks/use-camara'
import { useGestoDeLaVentana } from '../hooks/use-gesto-de-la-ventana'
import { useMedidaDe, useNavegador } from '../hooks/use-medidas'
import { useVentanaGuardada } from '../hooks/use-ventana-guardada'
import { AjustesDeLaVentana } from './ajustes-de-la-ventana'
import { BarraDeLaVentana } from './barra-de-la-ventana'
import { EsquinaDeTamano } from './esquina-de-tamano'
import { DatosDeLaVentana } from './datos-de-la-ventana'
import { PildoraDeLaVentana } from './pildora-de-la-ventana'
import { VideoDeLaVentana } from './video-de-la-ventana'

type PropsDelContenido = {
  ventana: VentanaDeCamara
  datos: DatosDeQuienPresenta
  camara: ReturnType<typeof useCamara>
  cambiar: (cambios: Partial<VentanaDeCamara>) => void
  gestoDeArrastre: HTMLAttributes<HTMLDivElement>
}

// Lo de adentro de la ventana: la barra, la cámara y los datos de quien presenta.
function ContenidoDeLaVentana({
  ventana,
  datos,
  camara,
  cambiar,
  gestoDeArrastre,
}: PropsDelContenido) {
  return (
    <>
      <BarraDeLaVentana
        gestoDeArrastre={gestoDeArrastre}
        ajustes={
          <AjustesDeLaVentana
            ventana={ventana}
            datos={datos}
            dispositivos={camara.dispositivos}
            usada={camara.usada}
            cambiar={cambiar}
          />
        }
        alMinimizar={() => {
          cambiar({ minimizada: true })
        }}
      />
      <VideoDeLaVentana
        estado={camara.estado}
        stream={camara.stream}
        espejo={ventana.espejo}
        alReintentar={camara.reintentar}
      />
      <div className="min-h-0 overflow-y-auto" data-datos-de-la-ventana="">
        <DatosDeLaVentana
          datos={datos}
          elegidos={ventana.datos}
          fichaWeb={ventana.ficha_web}
          logo={ventana.logo}
        />
      </div>
    </>
  )
}

export type PropsDeLaVentana = { inicial: VentanaDeCamara; datos: DatosDeQuienPresenta }

// Lo que ocupa la barra y un renglón de datos antes de medir: sólo para el primer cuadro.
const ALTO_DE_PARTIDA_PX = 120

// La ventana de cámara del Modo Live (docs/GLOSARIO.md › «Ventana de cámara»): flotante sobre la app, con la cámara arriba y los datos de quien presenta
// debajo. Se arrastra por su barra (o con las flechas, enfocada), cambia de tamaño desde la esquina que mira al centro, se minimiza a una píldora y guarda su
// lugar, su tamaño y sus ajustes por persona. La cámara sólo se muestra (nunca se graba ni se sube) y se apaga al desmontarse, es decir, al apagar el Live.
export function VentanaDeCamara({ inicial, datos }: PropsDeLaVentana) {
  const { ventana, cambiar } = useVentanaGuardada(inicial)
  const navegador = useNavegador()
  const camara = useCamara(ventana.camara)
  const [elemento, setElemento] = useState<HTMLElement | null>(null)

  const anchoGuardado = limitarElAncho(ventana.ancho, navegador.ancho)
  const medida = useMedidaDe(elemento, {
    ancho: anchoGuardado,
    alto: altoDelVideo(anchoGuardado) + ALTO_DE_PARTIDA_PX,
  })

  // El lugar de ahora en px: del % guardado (siempre adentro, también al achicar el navegador) o, mientras se arrastra, el del gesto.
  const tamano = { ancho: medida.ancho, alto: medida.alto }
  const guardada = posicionEnPx({ x: ventana.x, y: ventana.y }, tamano, navegador)
  const reciente = llevarAdentro(guardada, tamano, navegador)
  const { gesto, gestoDeArrastre, gestoDeTamano, alTeclear } = useGestoDeLaVentana({
    posicion: reciente,
    medida: tamano,
    navegador,
    cambiar,
  })
  const posicion = gesto?.posicion ?? reciente
  const ancho = gesto?.ancho ?? anchoGuardado

  if (ventana.minimizada) {
    return (
      <PildoraDeLaVentana
        nombre={datos.nombre}
        referencia={setElemento}
        porcentaje={{ x: ventana.x, y: ventana.y }}
        navegador={navegador}
        medida={tamano}
        alAbrir={() => {
          cambiar({ minimizada: false })
        }}
      />
    )
  }

  // La esquina que se arrastra mira al centro de la pantalla: ahí hay lugar para crecer.
  const esquina = {
    aLaDerecha: posicion.x + ancho / 2 < navegador.ancho / 2,
    abajo: posicion.y + medida.alto / 2 < navegador.alto / 2,
  }

  return (
    <section
      ref={setElemento}
      role="group"
      aria-label="Ventana de cámara"
      tabIndex={0}
      data-ventana-de-camara=""
      data-arrastrando={gesto ? '' : undefined}
      onKeyDown={alTeclear}
      style={{
        position: 'fixed',
        left: posicion.x,
        top: posicion.y,
        width: ancho,
        maxHeight: 'calc(100dvh - 24px)',
      }}
      className="z-40 flex flex-col overflow-hidden rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) shadow-(--shadow-md) outline-none focus-visible:ring-2 focus-visible:ring-(--color-primario)"
    >
      <ContenidoDeLaVentana
        ventana={ventana}
        datos={datos}
        camara={camara}
        cambiar={cambiar}
        gestoDeArrastre={gestoDeArrastre}
      />
      <EsquinaDeTamano esquina={esquina} gesto={gestoDeTamano(esquina)} />
    </section>
  )
}
