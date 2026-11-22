'use client'

import { useId, useRef, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeNiveles,
  textoDelTopeDeNiveles,
  type ListaDeNiveles,
  type NivelDeAcceso,
} from '../../../entities/nivel'
import { useModalDeNivel } from '../hooks/use-modal-de-nivel'
import { useNiveles } from '../hooks/use-niveles'
import { ModalDeNivelDiferido } from './diferidos'

// El botón «+ Nuevo nivel» donde se pide (un inspector del editor de la hoja): `alElegir` recibe la clave del nivel creado.
export type BotonDelNuevoNivel = (alElegir: (clave: string) => void) => ReactNode

type Props = {
  // Los niveles con su tope (`niveles_con_uso()`): sólo quien tiene `equipo.roles.gestionar` los recibe.
  lista: ListaDeNiveles
  // El nivel recién creado, para sumarlo a la lista de quien lo pidió (la página lo trae al volver a leerse).
  alCrear: (nivel: NivelDeAcceso) => void
  children: (boton: BotonDelNuevoNivel) => ReactNode
}

function Boton({
  tope,
  enCurso,
  alPulsar,
}: {
  tope: number | null
  enCurso: boolean
  alPulsar: () => void
}) {
  const idDelMotivo = useId()
  return (
    <div className="grid min-w-0 justify-items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 md:min-h-8"
        disabled={tope !== null || enCurso}
        aria-describedby={tope === null ? undefined : idDelMotivo}
        onClick={alPulsar}
      >
        <span aria-hidden>+ </span>Nuevo nivel
      </Button>
      {tope === null ? null : (
        <p id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelTopeDeNiveles(tope)}
        </p>
      )}
    </div>
  )
}

// «+ Nuevo nivel» al vuelo (del núcleo; lo usa el editor de la hoja): el mismo modal de la matriz de Roles (`?panel=nuevo-nivel`), montado una vez aquí y
// abierto desde el botón que `children` pone donde quiera. Al crearse, el nivel nuevo vuelve a quien lo pidió (`alElegir`) y a `alCrear`. En el tope, el
// botón se apaga con su motivo.
export function NuevoNivelAlVuelo({ lista, alCrear, children }: Props) {
  const niveles = useNiveles(lista)
  const modal = useModalDeNivel(niveles.lista, true)
  const destino = useRef<((clave: string) => void) | null>(null)
  const abierto = modal.modo === 'nuevo' && modal.abierto
  const montar = useAbiertoAlgunaVez(abierto)
  const tope = alTopeDeNiveles(niveles.niveles, niveles.lista.tope) ? niveles.lista.tope : null
  const boton: BotonDelNuevoNivel = (alElegir) => (
    <Boton
      tope={tope}
      enCurso={niveles.enCurso}
      alPulsar={() => {
        destino.current = alElegir
        modal.abrirNuevo()
      }}
    />
  )
  return (
    <>
      {children(boton)}
      {montar ? (
        <ModalDeNivelDiferido
          key={modal.apertura}
          abierto={abierto}
          alCerrar={modal.alCerrar}
          niveles={niveles}
          original={null}
          noDisponible={null}
          alCrear={(id, nueva) => {
            const nivel = nueva.niveles.find((uno) => uno.id === id)
            if (nivel === undefined) return
            alCrear(nivel)
            destino.current?.(nivel.clave)
            destino.current = null
          }}
        />
      ) : null}
    </>
  )
}
