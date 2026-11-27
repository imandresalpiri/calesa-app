'use client'

import { leerContenedoresSinEmbarque } from '../../../areas/transporte/composicion.client'
import type { ContenedorDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import { textoDeVehiculos } from '../../../entities/transporte/textos'
import { useOpcionesParaElegir } from '../hooks/use-opciones-para-elegir'
import { BuscarEnLasOpciones } from './buscar-en-las-opciones'

type Props = {
  origenId: string
  elegido: ContenedorDeLaLista | null
  alElegir: (c: ContenedorDeLaLista) => void
  error?: string
  apagado: boolean
}

// «Elegir uno sin embarque»: los contenedores del origen que todavía no van en ningún embarque, de a diez por número (con búsqueda por prefijo), como opciones de una sola elección.
export function ElegirSinEmbarque({ origenId, elegido, alElegir, error, apagado }: Props) {
  const opciones = useOpcionesParaElegir(leerContenedoresSinEmbarque, origenId)
  const filas = opciones.estado.tipo === 'listo' ? opciones.estado.filas : []
  const idError = error ? 'contenedor-elegido-error' : undefined
  return (
    <fieldset
      className="grid min-w-0 gap-2"
      aria-describedby={idError}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium">
        Contenedores sin embarque
      </legend>
      {opciones.estado.tipo === 'listo' && filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {opciones.texto.trim() === ''
            ? 'No hay contenedores sin embarque en este origen.'
            : 'Ningún contenedor sin embarque empieza así.'}
        </p>
      ) : null}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {filas.map((c) => (
          <li key={c.id} className="min-w-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-input) border border-(--color-line) px-3 py-2 has-checked:border-(--color-line-strong) has-checked:bg-(--color-paper-soft)">
              <input
                type="radio"
                name="contenedor-elegido"
                value={c.id}
                checked={elegido?.id === c.id}
                onChange={() => alElegir(c)}
                disabled={apagado}
              />
              <span className="grid min-w-0">
                <span className="font-medium [overflow-wrap:anywhere]">{c.numero}</span>
                <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                  {[c.tipoNombre ?? c.tipo, textoDeVehiculos(c.vehiculos, c.hayOcultos)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      <BuscarEnLasOpciones
        nombre="contenedor-buscar"
        etiqueta="Buscar un contenedor por número"
        opciones={opciones}
        apagado={apagado}
      />
    </fieldset>
  )
}
