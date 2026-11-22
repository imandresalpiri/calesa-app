'use client'

import { useState } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import {
  CAMPOS_DE_LA_POLITICA,
  LIMITES_DE_LA_POLITICA,
  TITULO_DE_LA_POLITICA,
  type PoliticaDeLaCola,
} from '../../../../entities/cola/politica'
import { useEnvioDeLaPolitica } from '../hooks/use-envio-de-la-politica'

export type PropsDelModalDeLaPolitica = {
  abierto: boolean
  alCerrar: () => void
  // Lo guardado, con la versión de la fila: llega por props y nunca va en la `key`.
  politica: PoliticaDeLaCola
}

type Numerica = (typeof CAMPOS_DE_LA_POLITICA)[number]['clave']

function textosDe(politica: PoliticaDeLaCola): Record<Numerica, string> {
  return {
    ttlContactoMinutos: String(politica.ttlContactoMinutos),
    diasPegajoso: String(politica.diasPegajoso),
    maxAbiertasDefault: String(politica.maxAbiertasDefault),
    maxIntentos: String(politica.maxIntentos),
  }
}

function numeroDe(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

// «Editar política…» (`?panel=politica`): si la cola reparte turnos, cuánto tiene cada asesor para contactar, el pegajoso, el cupo por defecto y los intentos.
// Cada apertura empieza de lo guardado; guardar manda siempre las cinco claves con la versión (`PT409` → «Recargar», que conserva lo tipeado).
export function ModalDeLaPolitica(props: PropsDelModalDeLaPolitica) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLaPolitica key={apertura} {...props} />
}

function FormularioDeLaPolitica({ abierto, alCerrar, politica }: PropsDelModalDeLaPolitica) {
  const [colaActiva, setColaActiva] = useState(politica.colaActiva)
  const [textos, setTextos] = useState(textosDe(politica))
  const original = textosDe(politica)
  const hayCambios =
    colaActiva !== politica.colaActiva ||
    CAMPOS_DE_LA_POLITICA.some(({ clave }) => textos[clave] !== original[clave])
  const formulario = useEnvioDeLaPolitica({
    politica,
    abierto,
    alCerrar,
    hayCambios,
    edicion: {
      colaActiva,
      ttlContactoMinutos: numeroDe(textos.ttlContactoMinutos),
      diasPegajoso: numeroDe(textos.diasPegajoso),
      maxAbiertasDefault: numeroDe(textos.maxAbiertasDefault),
      maxIntentos: numeroDe(textos.maxIntentos),
    },
  })
  return (
    <ModalDeFormulario
      id="politica-de-la-cola"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={TITULO_DE_LA_POLITICA}
      formulario={formulario}
      detalleDelConflicto="Recargar trae la versión de ahora y conserva lo que escribiste."
    >
      <Interruptor
        titulo="La cola reparte turnos"
        ayuda="Apagada, la rueda no reparte turnos nuevos."
        valor={colaActiva}
        alCambiar={setColaActiva}
      />
      {CAMPOS_DE_LA_POLITICA.map(({ clave, etiqueta, ayuda }) => (
        <Campo
          key={clave}
          nombre={clave}
          etiqueta={etiqueta}
          type="number"
          inputMode="numeric"
          min={LIMITES_DE_LA_POLITICA[clave].min}
          max={LIMITES_DE_LA_POLITICA[clave].max}
          ayuda={`${ayuda} De ${LIMITES_DE_LA_POLITICA[clave].min} a ${LIMITES_DE_LA_POLITICA[clave].max}.`}
          value={textos[clave]}
          error={formulario.errores[clave]}
          onChange={(evento) => {
            formulario.quitarMotivo(clave)
            setTextos({ ...textos, [clave]: evento.target.value })
          }}
        />
      ))}
    </ModalDeFormulario>
  )
}
