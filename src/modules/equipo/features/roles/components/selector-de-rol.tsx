'use client'

import { useId, useRef } from 'react'
import { tituloDeAvisosDelRol } from '../../../entities/avisos-de-roles'
import { useAltoPegado } from '../hooks/use-alto-pegado'
import { BotonDeAvisos } from './boton-de-avisos'

type Props = {
  roles: readonly { id: string; nombre: string }[]
  valor: string
  alCambiar: (rolId: string) => void
  // Cuántos avisos tiene el rol elegido y cómo abrirlos: sin avisos, sin botón.
  cantidadDeAvisos: number
  alAvisos: (rolId: string) => void
}

// En móvil la matriz muestra un rol a la vez: acá se elige cuál. Un <select> nativo abre el selector del sistema, que es lo cómodo con
// el dedo. La barra queda pegada bajo la barra superior: el rol que se configura no se pierde al desplazar, y el título del módulo se
// pega justo debajo (`ListaDelRol`, con el alto de esta barra en `--alto-barra-rol`).
export function SelectorDeRol({ roles, valor, alCambiar, cantidadDeAvisos, alAvisos }: Props) {
  const id = useId()
  const barra = useRef<HTMLDivElement>(null)
  useAltoPegado(barra, '--alto-barra-rol')
  const elegido = roles.find((rol) => rol.id === valor)
  return (
    <div
      ref={barra}
      className="sticky top-(--topbar) z-20 -mx-4 grid grid-cols-[minmax(0,1fr)] gap-1 border-b border-(--color-line) bg-(--color-paper) px-4 py-2 md:hidden"
    >
      <label htmlFor={id} className="text-(length:--text-xs) font-medium text-(--color-ink-soft)">
        Rol a la vista
      </label>
      <div className="flex items-center gap-1">
        <select
          id={id}
          title={elegido?.nombre}
          className="h-11 w-full min-w-0 flex-1 truncate rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) font-semibold text-(--color-ink)"
          value={valor}
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
        >
          {roles.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
            </option>
          ))}
        </select>
        {elegido && cantidadDeAvisos > 0 ? (
          <BotonDeAvisos
            titulo={tituloDeAvisosDelRol(elegido.nombre)}
            cantidad={cantidadDeAvisos}
            alAbrir={() => {
              alAvisos(elegido.id)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
