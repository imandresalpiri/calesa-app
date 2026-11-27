'use client'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { EstadoDeLasOpciones } from '../hooks/use-opciones-para-elegir'

type Props = {
  nombre: string
  etiqueta: string
  opciones: {
    estado: EstadoDeLasOpciones<unknown>
    texto: string
    aviso: string | null
    escribir: (valor: string) => void
    buscar: () => void
    reintentar: () => void
  }
  apagado: boolean
}

// Lo que acompaña a un selector que se lee de a diez: «Cargando…», el error con «Reintentar» y, si hay más de diez (o ya se buscó), el campo para buscar por prefijo. Un renglón de
// alto reservado: el formulario no salta al llegar las opciones.
export function BuscarEnLasOpciones({ nombre, etiqueta, opciones, apagado }: Props) {
  const { estado } = opciones
  const buscando = opciones.texto.trim() !== ''
  return (
    <div className="grid min-h-11 gap-1 text-(length:--text-sm)" aria-live="polite">
      {estado.tipo === 'cargando' ? (
        <p className="text-(--color-ink-soft)">Cargando las opciones…</p>
      ) : null}
      {estado.tipo === 'error' ? (
        <p className="flex flex-wrap items-center gap-2 text-(--color-peligro-ink)">
          {estado.mensaje}
          <Button type="button" variant="outline" size="sm" onClick={opciones.reintentar}>
            Reintentar
          </Button>
        </p>
      ) : null}
      {estado.tipo === 'listo' && (estado.hayMas || buscando) ? (
        // Va dentro del formulario del modal: no es otro `<form>`; Enter busca en vez de guardar.
        <div role="search" className="flex flex-wrap items-center gap-2">
          <Input
            id={nombre}
            aria-label={etiqueta}
            placeholder={etiqueta}
            value={opciones.texto}
            onChange={(e) => opciones.escribir(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                opciones.buscar()
              }
            }}
            disabled={apagado}
            className="min-h-11 min-w-0 flex-1 basis-48 md:min-h-9"
          />
          <Button
            type="button"
            variant="outline"
            disabled={apagado}
            className="min-h-11 md:min-h-9"
            onClick={opciones.buscar}
          >
            Buscar
          </Button>
        </div>
      ) : null}
      {opciones.aviso ? <p className="text-(--color-ink-soft)">{opciones.aviso}</p> : null}
      {estado.tipo === 'listo' && estado.hayMas ? (
        <p className="text-(--color-ink-soft)">
          Se muestran los primeros 10. Busca para ver otros.
        </p>
      ) : null}
    </div>
  )
}
