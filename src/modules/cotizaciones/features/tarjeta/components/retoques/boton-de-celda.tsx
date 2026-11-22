'use client'

import { cn } from 'cn'
import type { CeldaDibujada } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'
import { textoParaNombrar } from '../../../../entities/tarjeta/retoques/live-del-modo'

export const textoDeLaCelda = (c: CeldaDibujada) => textoParaNombrar(c, false)

const resumen = (texto: string) => {
  const letras = [...texto.replace(/\s+/g, ' ').trim()]
  return letras.length > 40 ? `${letras.slice(0, 40).join('')}…` : letras.join('')
}

// Con Live, el monto de un texto con datos va tapado también en el nombre.
const nombreDelBoton = ({
  celda,
  esTexto,
  rotulo,
  live,
}: Pick<Props, 'celda' | 'esTexto' | 'rotulo' | 'live'>) => {
  if (!esTexto) return `Elegir la fila «${rotulo}»`
  const texto = resumen(textoParaNombrar(celda, live))
  return texto === '' ? 'Cambiar el texto de una celda vacía' : `Cambiar el texto «${texto}»`
}

type Props = {
  celda: CeldaDibujada
  escala: number
  esTexto: boolean
  elegida: boolean
  largo: boolean
  rotulo: string
  live: boolean
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
  live,
  enCurso,
  alTocar,
}: Props) {
  return (
    <button
      type="button"
      data-celda-retocable={celda.id}
      {...(largo ? { 'data-texto-largo': '' } : {})}
      {...(esTexto ? {} : { tabIndex: -1 })}
      aria-label={nombreDelBoton({ celda, esTexto, rotulo, live })}
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
