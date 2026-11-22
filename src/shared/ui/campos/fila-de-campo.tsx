'use client'

import { memo } from 'react'
import { MasAcciones } from '@/shared/ui/lista'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { accionesDeCampo } from './acciones-de-campo'
import type { PropsDeFila } from './cuerpo'
import { LugarDelAsa } from './lugar-del-asa'
import { NombreDeCampo } from './nombre-de-campo'

// Un campo del layout: el asa (con permiso y sin búsqueda), su nombre con sus insignias y su «⋯». Sin botones sueltos: tocar la fila
// hace la primera acción del «⋯» («Editar <etiqueta>», o «Ver» sin permiso), y el asa y el «⋯» van encima, aparte (un interactivo no va
// dentro de otro). Con el arrastre, la fila se desplaza mientras se arrastra (`alMontar`, `estilo`).
export const FilaDeCampo = memo(function FilaDeCampo(props: PropsDeFila) {
  const { campo, insignias, puedeGestionar, puedeSubir, puedeBajar, casilla, conAsa, alElegir } =
    props
  const { alMontar, estilo, asa } = props
  const acciones = accionesDeCampo({
    campo,
    puedeGestionar,
    puedeSubir,
    puedeBajar,
    datoClave:
      casilla === null
        ? null
        : {
            es: casilla.es,
            motivo: casilla.topeLleno ? casilla.textos.motivoTope : null,
            hacer: casilla.textos.hacer,
            quitar: casilla.textos.quitar,
          },
    notaAlDesactivar: casilla?.es ? casilla.textos.notaAlDesactivar : null,
    alElegir: (accion) => {
      alElegir(campo.id, accion)
    },
  })
  return (
    <li
      ref={alMontar}
      style={estilo}
      data-campo={campo.clave}
      className="relative flex min-w-0 items-center gap-1 bg-(--color-surface) py-1 pr-1 pl-3 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2) has-[>[data-asa]]:pl-0"
    >
      <ToqueDeLaTarjeta
        etiqueta={`${puedeGestionar ? 'Editar' : 'Ver'} ${campo.etiqueta}`}
        abrir={() => {
          alElegir(campo.id, 'abrir')
        }}
      />
      {conAsa ? (
        <span data-asa className="relative z-10 flex shrink-0">
          {asa ?? <LugarDelAsa />}
        </span>
      ) : null}
      <NombreDeCampo campo={campo} insignias={insignias} />
      <span className="relative z-10 flex shrink-0">
        <MasAcciones nombre={campo.etiqueta} acciones={acciones} />
      </span>
    </li>
  )
})
