'use client'

import { useMemo } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import { SOLO_EN_PANTALLA_ANCHA } from '../../../../entities/diseno/anchos-de-la-vista-previa'
import { cifrasDelDiseno } from '../../../../entities/diseno/cifras-del-diseno'
import type { Diseno } from '../../../../entities/diseno'
import type { DisenoParaEditar } from '../../../../entities/diseno/edicion-del-diseno'
import { hojaDeLaVistaPrevia } from '../../../../entities/diseno/hoja-del-diseno'
import { HojaDePrueba } from '../hoja-de-prueba'
import { MarcoEscalado } from './marco-escalado'

type Props = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  diseno: Diseno
  tonos: readonly Tono[]
  // Lo que dice arriba: por omisión, que se edita en una pantalla ancha; con el Modo Live, «Sólo lectura en el Modo Live.».
  aviso?: string
}

// Por debajo de 1.024 px el editor de la hoja no se usa: la hoja del diseño leído a 412 px, en sólo lectura y con cifras de prueba, con el aviso de que se edita
// en una pantalla más ancha (el texto de la pestaña Tarjeta). Con el Modo Live, en todo ancho y con su aviso.
export function HojaSoloLectura({
  origen,
  leida,
  diseno,
  tonos,
  aviso = SOLO_EN_PANTALLA_ANCHA,
}: Props) {
  const respuesta = useMemo(
    () => cifrasDelDiseno(leida.definicion, leida.params),
    [leida.definicion, leida.params],
  )
  const hoja = useMemo(
    () => hojaDeLaVistaPrevia(origen, diseno, leida.definicion, tonos),
    [origen, diseno, leida.definicion, tonos],
  )
  return (
    <div data-hoja-solo-lectura="" className="grid min-w-0 gap-3">
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {aviso}
      </p>
      <MarcoEscalado vista="412" etiqueta="Hoja de la cotización">
        <div inert>
          <HojaDePrueba hoja={hoja} respuesta={respuesta} />
        </div>
      </MarcoEscalado>
    </div>
  )
}
