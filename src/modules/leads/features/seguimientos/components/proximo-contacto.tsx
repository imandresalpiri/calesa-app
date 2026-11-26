'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { CampoCuando } from '../../recordatorios/components/campo-cuando'

type Props = {
  nombre: string
  // `aaaa-mm-ddThh:mm` en la zona de la empresa; vacío = ninguno.
  valor: string
  alCambiar: (valor: string) => void
  zona: string
  error?: string | undefined
  deshabilitado: boolean
}

export const ETIQUETA_DE_PROXIMO_CONTACTO = 'Próximo contacto'
export const TEXTO_DE_PROGRAMAR = 'Programar próximo contacto'
const AYUDA = 'Un recordatorio para ti: cuándo volver a contactar a este lead.'

// El alto que ocupa el campo abierto (etiqueta, ayuda, atajos y fecha), en rem para que siga al texto al 200 %: el botón lo reserva
// desde el principio y el formulario no cambia de alto al sumarlo.
const ALTO_DEL_CAMPO = 'min-h-[12.5rem] md:min-h-[10rem]'

// El recordatorio que nace con un seguimiento, dicho por lo que hace. Un botón lo suma al formulario y ahí queda (no se pliega de
// vuelta): anotar algo que ya pasó no lo pide ni lo sugiere. Nace sumado si ya trae una fecha (un borrador) o un motivo. «Quitar» vacía la
// fecha (sin fecha no hay recordatorio) y deja el campo con el foco.
export function ProximoContacto({ nombre, valor, alCambiar, zona, error, deshabilitado }: Props) {
  const [abierto, setAbierto] = useState(valor !== '' || error !== undefined)
  if (!abierto && (valor !== '' || error !== undefined)) {
    setAbierto(true)
  }
  // El foco al sumarlo va al primer atajo (el primer botón del contenedor); al quitar, al campo de la fecha.
  const foco = useRef<'atajo' | 'fecha' | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const [quitado, setQuitado] = useState(0)
  useEffect(() => {
    if (foco.current === 'atajo') {
      contenedor.current?.querySelector('button')?.focus()
    } else if (foco.current === 'fecha') {
      contenedor.current?.querySelector('input')?.focus()
    }
    foco.current = null
  }, [abierto, quitado])

  return (
    <div ref={contenedor} className={ALTO_DEL_CAMPO}>
      {abierto ? (
        <CampoCuando
          nombre={nombre}
          etiqueta={ETIQUETA_DE_PROXIMO_CONTACTO}
          ayuda={AYUDA}
          valor={valor}
          alCambiar={alCambiar}
          zona={zona}
          error={error}
          deshabilitado={deshabilitado}
          quitable
          quitarVacio
          alQuitar={() => {
            foco.current = 'fecha'
            setQuitado((n) => n + 1)
          }}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-7"
          onClick={() => {
            foco.current = 'atajo'
            setAbierto(true)
          }}
          disabled={deshabilitado}
        >
          {TEXTO_DE_PROGRAMAR}
        </Button>
      )}
    </div>
  )
}
