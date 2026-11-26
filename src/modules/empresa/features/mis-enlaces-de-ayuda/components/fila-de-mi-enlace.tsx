'use client'

import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, MasAcciones, TarjetaDeLista } from '@/shared/ui/lista'
import { Switch } from '@/shared/ui/switch'
import { dominioDe } from '../../../entities/enlaces-de-ayuda'
import { claveDelElemento, type ElementoDeMisEnlaces } from '../../../entities/mis-enlaces-de-ayuda'
import { accionesDeMiEnlace, primeraAccion, urlDelElemento } from './acciones-de-mi-enlace'

type Props = {
  elementos: readonly ElementoDeMisEnlaces[]
  elemento: ElementoDeMisEnlaces
  prefijo: string
  enCurso: boolean
  alMostrar: (enlaceId: string, mostrar: boolean) => void
} & Parameters<typeof accionesDeMiEnlace>[2]

// Un enlace de la lista de Perfil, como tarjeta de 44 px por lo menos: el título (tocarlo hace la primera acción del «⋯»), el dominio, de dónde
// viene y, si es de la empresa, el interruptor «Mostrar», que guarda al instante.
export function FilaDeMiEnlace({
  elementos,
  elemento,
  prefijo,
  enCurso,
  alMostrar,
  ...quehaceres
}: Props) {
  const clave = claveDelElemento(elemento)
  const titulo = elemento.tipo === 'empresa' ? elemento.enlace.titulo : elemento.titulo
  const acciones = accionesDeMiEnlace(elementos, elemento, quehaceres)
  const idDelTitulo = `${prefijo}-${clave}-titulo`
  return (
    <TarjetaDeLista
      alAbrir={primeraAccion(acciones) ?? undefined}
      acciones={<MasAcciones nombre={titulo} acciones={acciones} id={`${prefijo}-${clave}-mas`} />}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <AbrirResumen
            id={idDelTitulo}
            nombre={titulo}
            verbo={elemento.tipo === 'empresa' ? 'Abrir en otra pestaña' : 'Editar'}
            className="min-w-0 font-medium break-words text-(--color-ink)"
          >
            {titulo}
          </AbrirResumen>
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-sm) text-(--color-ink-faint)">
            <span className="min-w-0 break-all">{dominioDe(urlDelElemento(elemento))}</span>
            <Badge variant="secondary">
              {elemento.tipo === 'empresa' ? 'De la empresa' : 'Propio'}
            </Badge>
          </p>
        </div>
        {elemento.tipo === 'empresa' ? (
          <label
            data-no-abre=""
            className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
          >
            <Switch
              checked={!elemento.oculto}
              disabled={enCurso}
              aria-describedby={idDelTitulo}
              onCheckedChange={(mostrar) => {
                alMostrar(elemento.enlace.id, mostrar)
              }}
            />
            Mostrar
          </label>
        ) : null}
      </div>
    </TarjetaDeLista>
  )
}
