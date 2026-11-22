'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { destinoQuePregunta } from '@/shared/lib/destino-de-un-clic'
import { anotarCambiosSinGuardar } from './salida-con-cambios'

type Salida = () => void

// Salir de una pantalla con cambios sin guardar pregunta (`<BarraDeCambiosSinGuardar>`). Mientras `hayCambios`:
// - recargar o cerrar la pestaña dispara la pregunta del navegador (`beforeunload`);
// - un clic en un enlace que sale de la pantalla (`destinoQuePregunta()`) se frena en la fase de captura, antes de que lo vea el
//   `<Link>` (React escucha en su raíz, más abajo que `document`), y queda pendiente hasta «Descartar» o «Seguir editando»;
// - la pantalla queda anotada (`anotarCambiosSinGuardar()`): la acción de un aviso o el selector de sección (`salirSinPerder()`)
//   también preguntan.
// El «atrás» del navegador no se frena: el App Router no ofrece cómo, y parchear el historial rompe la vuelta del foco.
// Un enlace a la misma ruta con otra búsqueda (`?seccion=` de una pestaña) también pregunta: cambia lo que se dibuja y el formulario se va.
// Al descartar, el enlace frenado se sigue con `router.push(destino)`: un `replace` o `scroll={false}` del `<Link>` no se conservan.
// `propia`: lo que está dentro (la barra) no cuenta como salir.
export function useSalidaConCambios(
  hayCambios: boolean,
  alDescartar: () => void,
  propia?: RefObject<HTMLElement | null>,
) {
  const router = useRouter()
  const [pendiente, setPendiente] = useState<Salida | null>(null)
  // Lo que cambia entre dibujos va por ref: el efecto se rehace sólo al empezar o terminar los cambios, y rehacerlo suelta lo frenado.
  const descartarRef = useRef(alDescartar)
  const routerRef = useRef(router)
  useEffect(() => {
    descartarRef.current = alDescartar
    routerRef.current = router
  }, [alDescartar, router])

  useEffect(() => {
    if (!hayCambios) {
      return
    }
    const alDescargar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      // Safari y algunos WebView sólo preguntan si además lleva un valor.
      evento.returnValue = ''
    }
    const alTocar = (evento: MouseEvent) => {
      if (!(evento.target instanceof Element)) {
        return
      }
      const enlace = evento.target.closest('a[href]')
      if (!(enlace instanceof HTMLAnchorElement) || propia?.current?.contains(enlace)) {
        return
      }
      const destino = destinoQuePregunta(
        {
          href: enlace.getAttribute('href') ?? '',
          target: enlace.getAttribute('target'),
          download: enlace.hasAttribute('download'),
          boton: evento.button,
          conModificador: evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey,
        },
        new URL(window.location.href),
      )
      if (destino === null) {
        return
      }
      evento.preventDefault()
      evento.stopPropagation()
      setPendiente(() => () => {
        routerRef.current.push(destino as Route)
      })
    }
    window.addEventListener('beforeunload', alDescargar)
    document.addEventListener('click', alTocar, true)
    const desanotar = anotarCambiosSinGuardar((salir) => {
      setPendiente(() => salir)
    })
    return () => {
      window.removeEventListener('beforeunload', alDescargar)
      document.removeEventListener('click', alTocar, true)
      desanotar()
      // Guardar o descartar suelta lo frenado: al volver a escribir, no reaparece una salida vieja.
      setPendiente(null)
    }
  }, [hayCambios, propia])

  return {
    pendiente: hayCambios && pendiente !== null,
    seguir: () => {
      setPendiente(null)
    },
    descartar: () => {
      const salir = pendiente
      setPendiente(null)
      descartarRef.current()
      salir?.()
    },
  }
}
