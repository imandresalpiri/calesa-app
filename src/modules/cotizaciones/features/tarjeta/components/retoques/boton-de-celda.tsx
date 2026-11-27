'use client'

import { cn } from 'cn'
import type { CeldaDibujada } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'

// El texto de una celda, el de sus líneas (con sus montos enteros: es lo que el campo cambia y se guarda); vacío si no es un texto.
export const textoDeLaCelda = (c: CeldaDibujada) =>
  c.contenido.tipo === 'texto' ? c.contenido.lineas.join('\n') : ''

const resumen = (texto: string) => {
  const letras = [...texto.replace(/\s+/g, ' ').trim()]
  return letras.length > 40 ? `${letras.slice(0, 40).join('')}…` : letras.join('')
}

const nombreDelBoton = ({
  celda,
  esTexto,
  rotulo,
}: Pick<Props, 'celda' | 'esTexto' | 'rotulo'>) => {
  if (!esTexto) return `Elegir la fila «${rotulo}»`
  const texto = resumen(textoDeLaCelda(celda))
  return texto === '' ? 'Cambiar el texto de una celda vacía' : `Cambiar el texto «${texto}»`
}

type Props = {
  celda: CeldaDibujada
  escala: number
  esTexto: boolean
  elegida: boolean
  largo: boolean
  rotulo: string
  enCurso: boolean
  alTocar: () => void
}

// Un botón encima de una celda, en su rectángulo escalado: el de una celda de texto abre su campo (con el teclado se llega a él); el de las demás elige su
// fila (sólo con el puntero: con el teclado está el canal de filas). La elegida y la de un texto largo, marcadas.
export function BotonDeCelda({
  celda,
  escala,
  esTexto,
  elegida,
  largo,
  rotulo,
  enCurso,
  alTocar,
}: Props) {
  return (
    <button
      type="button"
      data-celda-retocable={celda.id}
      {...(largo ? { 'data-texto-largo': '' } : {})}
      {...(esTexto ? {} : { tabIndex: -1 })}
      aria-label={nombreDelBoton({ celda, esTexto, rotulo })}
      disabled={enCurso}
      className={cn(
        'absolute rounded-[2px] outline-offset-[-2px] hover:outline-2 hover:outline-(--color-accent) focus-visible:outline-2 focus-visible:outline-(--color-accent)',
        esTexto ? 'cursor-text' : 'cursor-pointer',
        elegida && 'outline-2 outline-(--color-accent)',
        largo && 'outline-2 outline-(--color-peligro-ink)',
      )}
      style={{
        left: celda.x * escala,
        top: celda.y * escala,
        width: celda.ancho * escala,
        height: celda.alto * escala,
      }}
      onClick={alTocar}
    />
  )
}
