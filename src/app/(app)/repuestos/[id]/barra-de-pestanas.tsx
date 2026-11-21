'use client'

import { useEffect, useRef, useState } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'

type Props = {
  // El texto compacto de la cabecera que se ve mientras la barra va pegada («Proyecto #12»).
  titulo: string
  pestanas: readonly { clave: string; titulo: string }[]
  valor: string
  alElegir: (clave: string) => void
}

// Lo que mide la barra superior de la app (`--topbar`, en rem): la barra de pestañas se pega justo debajo.
function altoDeLaBarraSuperior(): number {
  const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return 3.25 * (Number.isFinite(raiz) ? raiz : 16)
}

// ¿Va pegada? Un centinela de 1 px justo encima: si sale por arriba de la barra superior, la barra de pestañas está pegada.
function usePegada(): { centinela: React.RefObject<HTMLDivElement | null>; pegada: boolean } {
  const centinela = useRef<HTMLDivElement>(null)
  const [pegada, setPegada] = useState(false)
  useEffect(() => {
    const el = centinela.current
    if (!el) return
    const observador = new IntersectionObserver(
      ([entrada]) => {
        setPegada(
          entrada !== undefined && !entrada.isIntersecting && entrada.boundingClientRect.top < 0,
        )
      },
      { rootMargin: `-${String(altoDeLaBarraSuperior())}px 0px 0px 0px` },
    )
    observador.observe(el)
    return () => {
      observador.disconnect()
    }
  }, [])
  return { centinela, pegada }
}

// Las pestañas del proyecto (Ítems · Cotizaciones · Pagos · Compras): siempre en el mismo lugar y pegadas bajo la barra superior al bajar, con el nombre compacto del
// proyecto a su izquierda sólo mientras van pegadas (la cabecera entera, con el vehículo y el cliente, ocuparía un tercio de la pantalla). Su alto es fijo: aparecer
// el nombre no mueve nada.
export function BarraDePestanas({ titulo, pestanas, valor, alElegir }: Props) {
  const { centinela, pegada } = usePegada()
  return (
    <>
      <div ref={centinela} aria-hidden className="-mb-4 h-px" />
      <div
        data-barra-de-pestanas=""
        className="sticky top-(--topbar) z-10 -mx-1 flex min-h-12 min-w-0 items-center gap-3 border-b border-(--color-line) bg-(--color-paper) px-1 py-1"
      >
        {pegada ? (
          <span className="hidden shrink-0 font-semibold tabular-nums sm:inline">{titulo}</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <PestanasConDesborde pestanas={pestanas} valor={valor} alElegir={alElegir} />
        </div>
      </div>
    </>
  )
}
