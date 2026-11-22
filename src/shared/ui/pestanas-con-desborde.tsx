'use client'

import { TriangleAlertIcon } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { PistaDeDesborde } from './pista-de-desborde'
import { Tabs, TabsList, TabsTrigger } from './tabs'
import { ConTooltip } from './tooltip'
import { traerLaAbiertaALaVista } from './traer-la-abierta-a-la-vista'
import { useDesborde } from './use-desborde'

type Props = {
  // Con `motivo`, la pestaña se ve apagada (no se elige) y el motivo se dice en una línea bajo la barra: lo que la persona no puede abrir no se
  // esconde (docs/UX.md › Reglas transversales).
  // Con `aviso`, lo que le falta: un ⚠ con su tooltip, y el texto también en el nombre accesible de la pestaña.
  pestanas: readonly {
    clave: string
    titulo: string
    motivo?: string | undefined
    aviso?: string | undefined
  }[]
  // La abierta (vive en la URL de quien usa la barra) y qué hace elegir otra.
  valor: string
  alElegir: (clave: string) => void
}

// La barra de pestañas de una pantalla de Configuración. En el celular, y con el texto al 200 %, no entran todas: la barra se desplaza dentro
// de su ancho (`min-w-0`: es hija de una grilla y, sin él, ensanchaba la página; 5a-18), dice por dónde sigue (`<PistaDeDesborde>`) y deja
// a la vista la abierta: al abrirla, al elegir otra y cada vez que la barra cambia de tamaño (se amplía el texto con la página abierta, se gira
// el celular: la abierta, que cabía, queda fuera de la vista; c.1).
// Las apagadas que comparten motivo van juntas: «Orígenes, Tipos: <motivo>».
function motivosDe(pestanas: Props['pestanas']): { motivo: string; titulos: string[] }[] {
  const grupos = new Map<string, string[]>()
  for (const { titulo, motivo } of pestanas) {
    if (motivo) {
      grupos.set(motivo, [...(grupos.get(motivo) ?? []), titulo])
    }
  }
  return [...grupos].map(([motivo, titulos]) => ({ motivo, titulos }))
}

function enLista(titulos: string[]): string {
  return titulos.length < 2
    ? titulos.join('')
    : `${titulos.slice(0, -1).join(', ')} y ${titulos.at(-1) ?? ''}`
}

// Una pestaña: apagada con su motivo (descrito bajo la barra) o, con algo pendiente, con su ⚠ y su tooltip (el texto también en su nombre accesible).
function PestanaDeLaBarra({
  pestana,
  idDelMotivo,
}: {
  pestana: Props['pestanas'][number]
  idDelMotivo: string
}) {
  const disparador = (
    <TabsTrigger
      value={pestana.clave}
      className="px-3"
      disabled={Boolean(pestana.motivo)}
      aria-describedby={pestana.motivo ? idDelMotivo : undefined}
      // El nombre con lo que falta, entero: un `sr-only` suelto suma un espacio antes del punto en Chrome.
      aria-label={pestana.aviso ? `${pestana.titulo}. ${pestana.aviso}` : undefined}
    >
      {pestana.titulo}
      {pestana.aviso ? (
        <TriangleAlertIcon
          aria-hidden
          data-aviso-de-la-pestana=""
          className="size-3.5 text-(--color-aviso-ink)"
        />
      ) : null}
    </TabsTrigger>
  )
  return pestana.aviso && !pestana.motivo ? (
    <ConTooltip texto={pestana.aviso} lado="bottom">
      {disparador}
    </ConTooltip>
  ) : (
    disparador
  )
}

export function PestanasConDesborde({ pestanas, valor, alElegir }: Props) {
  const idDelMotivo = useId()
  const motivos = motivosDe(pestanas)
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  useEffect(() => {
    const barra = lista.current
    if (!barra) {
      return
    }
    traerLaAbiertaALaVista(barra)
    const observador = new ResizeObserver(() => {
      traerLaAbiertaALaVista(barra)
    })
    observador.observe(barra)
    for (const hijo of barra.children) {
      observador.observe(hijo)
    }
    return () => {
      observador.disconnect()
    }
  }, [valor])
  return (
    <Tabs
      className="min-w-0"
      value={valor}
      onValueChange={(elegida) => {
        alElegir(String(elegida))
      }}
    >
      <div className="relative max-w-full min-w-0 md:w-fit">
        <TabsList
          ref={lista}
          className="h-11 w-full max-w-full justify-start overflow-x-auto md:h-8 md:w-fit"
        >
          {pestanas.map((pestana) => (
            <PestanaDeLaBarra key={pestana.clave} pestana={pestana} idDelMotivo={idDelMotivo} />
          ))}
        </TabsList>
        <PistaDeDesborde {...desborde} />
      </div>
      {motivos.length > 0 ? (
        <div
          id={idDelMotivo}
          className="grid gap-0.5 text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {motivos.map(({ motivo, titulos }) => (
            <p key={motivo}>
              {enLista(titulos)}: {motivo}
            </p>
          ))}
        </div>
      ) : null}
    </Tabs>
  )
}
