'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { DestinoFueraDelNavegador } from '../destinos-de-busqueda'
import type { GrupoDelNavegador } from '../secciones'
import { buscarEnConfiguracion, normalizar } from './buscar'

// El atributo con que `/` encuentra los campos de búsqueda de esta pantalla.
export const MARCA_DEL_BUSCADOR = 'data-buscador-de-configuracion'

// El buscador que se ve (los otros están escondidos por CSS): el de `/`.
function enfocarElQueSeVe(): void {
  const campos = document.querySelectorAll<HTMLInputElement>(`input[${MARCA_DEL_BUSCADOR}]`)
  const visible = [...campos].find((campo) => campo.getClientRects().length > 0)
  visible?.focus()
  visible?.select()
}

// Las flechas entre los resultados; subir desde el primero vuelve al campo.
function moverseEnLaLista(id: string, evento: KeyboardEvent<HTMLUListElement>): void {
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') {
    return
  }
  const enlaces = [...evento.currentTarget.querySelectorAll('a')]
  const al = enlaces.indexOf(document.activeElement as HTMLAnchorElement)
  evento.preventDefault()
  if (evento.key === 'ArrowUp' && al <= 0) {
    document.getElementById(id)?.focus()
  } else {
    enlaces[evento.key === 'ArrowDown' ? al + 1 : al - 1]?.focus()
  }
}

// El estado del buscador de Configuración: el texto (que se vacía solo al cambiar de pantalla: el layout no se vuelve a dibujar y la búsqueda
// anterior taparía el menú), sus resultados, Enter, Esc y las flechas.
// Sin refs: el campo y la lista se encuentran por su `id` (el del campo y `${id}-resultados`).
export function useBuscadorDeConfiguracion(
  id: string,
  grupos: readonly GrupoDelNavegador[],
  sinCampoEn: string | undefined,
  fuera: readonly DestinoFueraDelNavegador[],
) {
  const router = useRouter()
  const actual = usePathname()
  const [texto, setTexto] = useState('')
  const [rutaVista, setRutaVista] = useState(actual)
  // Sólo el panel: se cierra al salir del campo y de los resultados.
  const [cerrado, setCerrado] = useState(false)
  if (rutaVista !== actual) {
    setRutaVista(actual)
    setTexto('')
  }
  useAtajo('buscarEnPantalla', enfocarElQueSeVe)

  const sinCampo = sinCampoEn === actual
  const buscando = !sinCampo && normalizar(texto) !== ''
  const resultados = useMemo(
    () => buscarEnConfiguracion(grupos, texto, fuera),
    [grupos, texto, fuera],
  )

  const limpiar = () => {
    setTexto('')
    document.getElementById(id)?.focus()
  }

  return {
    texto,
    // Lo que el lector de pantalla oye al cambiar los resultados.
    anuncio: !buscando
      ? ''
      : resultados.length === 0
        ? 'Sin resultados'
        : `${String(resultados.length)} resultados`,
    sinCampo,
    buscando,
    resultados,
    cerrado,
    escribir: (nuevo: string) => {
      setTexto(nuevo)
      setCerrado(false)
    },
    abrir: () => {
      setCerrado(false)
    },
    cerrar: () => {
      setCerrado(true)
    },
    limpiar,
    abrirElPrimero: () => {
      const primero = resultados[0]
      if (primero) {
        salirSinPerder(() => {
          router.push(primero.ruta as Route)
        })
      }
    },
    alTeclear: (evento: KeyboardEvent<HTMLInputElement>) => {
      if (evento.key === 'Escape' && texto !== '') {
        evento.preventDefault()
        setTexto('')
      } else if (evento.key === 'ArrowDown') {
        const primero = document.getElementById(`${id}-resultados`)?.querySelector('a')
        if (primero) {
          evento.preventDefault()
          primero.focus()
        }
      }
    },
    alMoverseEnLaLista: (evento: KeyboardEvent<HTMLUListElement>) => {
      moverseEnLaLista(id, evento)
    },
  }
}
