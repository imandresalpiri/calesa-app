'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'

export type CampoDeEscala = {
  clave: string
  etiqueta: string
  opciones: readonly { valor: string; etiqueta: string }[]
  valor: string
  error?: string | undefined
  alElegir: (valor: string) => void
}

type Props = { base: string; campos: readonly CampoDeEscala[]; ocupado: boolean }

// Los selects de las escalas cerradas del aspecto (relleno, separación, densidad, letra, énfasis), uno por clave.
export function CamposDeEscala({ base, campos, ocupado }: Props) {
  return campos.map((c) => (
    <CampoSeleccion
      key={c.clave}
      nombre={`${base}-${c.clave}`}
      etiqueta={c.etiqueta}
      opciones={c.opciones}
      value={c.valor}
      disabled={ocupado}
      {...(c.error === undefined ? {} : { error: c.error })}
      onChange={(e) => {
        c.alElegir(e.target.value)
      }}
    />
  ))
}
