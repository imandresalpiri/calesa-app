'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DEL_BLOQUE } from '../../../../../entities/diseno/edicion-de-la-ayuda'

type Props = {
  nombre: string
  tipo: 'titulo' | 'texto'
  texto: string
  ocupado: boolean
  alEscribir: (texto: string) => void
}

export const PISTA_DE_LA_NEGRITA = 'Escribe **así** para negrita.'
const VACIO = { titulo: 'Escribe el título.', texto: 'Escribe el texto.' } as const
const ETIQUETA = { titulo: 'Título', texto: 'Texto' } as const

// El campo de un bloque de título (una línea, hasta 80 caracteres) o de texto (varias, hasta 1.000, con `**negrita**`): un contador en caracteres y, al
// llegar al tope, «Hasta N caracteres.» (lo que sobra se corta: `ponerTextoDelBloque`). Vacío, lo dice: la base pide al menos un carácter.
export function CamposDelTexto({ nombre, tipo, texto, ocupado, alEscribir }: Props) {
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale, decimales: 0 })
  const maximo = MAXIMO_DEL_BLOQUE[tipo]
  const largo = Array.from(texto).length
  const error = texto.trim() === '' ? VACIO[tipo] : null
  const ids = [
    error === null ? null : `${nombre}-error`,
    `${nombre}-contador`,
    tipo === 'texto' ? `${nombre}-pista` : null,
  ]
  const comun = {
    id: nombre,
    name: nombre,
    value: texto,
    disabled: ocupado,
    'aria-invalid': error === null ? undefined : true,
    'aria-describedby': ids.filter((id) => id !== null).join(' '),
  }
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={nombre}>{ETIQUETA[tipo]}</Label>
      {tipo === 'titulo' ? (
        <Input
          {...comun}
          className="h-11 md:h-9"
          onChange={(e) => {
            alEscribir(e.target.value)
          }}
        />
      ) : (
        <Textarea
          {...comun}
          rows={4}
          onChange={(e) => {
            alEscribir(e.target.value)
          }}
        />
      )}
      {error === null ? null : (
        <p id={`${nombre}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-x-3 text-(length:--text-sm) text-(--color-ink-faint)">
        {tipo === 'texto' ? <p id={`${nombre}-pista`}>{PISTA_DE_LA_NEGRITA}</p> : null}
        <p id={`${nombre}-contador`} className="ml-auto tabular-nums">
          {largo >= maximo
            ? `Hasta ${numero(maximo)} caracteres.`
            : `${numero(largo)} de ${numero(maximo)}`}
        </p>
      </div>
    </div>
  )
}
