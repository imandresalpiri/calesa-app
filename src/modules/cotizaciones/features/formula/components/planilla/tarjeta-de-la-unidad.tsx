'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useTransition, type ComponentType } from 'react'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { calculoDeLaUnidad } from '../../../../entities/formula/tarjeta-de-la-unidad'
import type { VistaPrevia } from '../../../../entities/formula/vista-previa'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../../entities/tarjeta-en-vivo'
import { SelectorDeModo } from './selector-de-modo'

type Props = {
  origenId: string
  formulaDelOrigenId: string
  tarjeta: LecturaDeLaTarjetaEnVivo
  // El dibujo de la tarjeta: lo llena el área `tarjeta` (este módulo no la importa).
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  vista: VistaPrevia | null
  modos: readonly { clave: string; nombre: string }[]
  modo: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean
}

function Cuerpo({
  tarjeta,
  TarjetaEnVivo,
  vista,
  modo,
  verTotalBs,
  origenId,
  formulaDelOrigenId,
}: Props) {
  const router = useRouter()
  const [releyendo, releer] = useTransition()
  const lectura = tarjeta.estado === 'lista' ? tarjeta.lectura : null
  const calculo = useMemo(
    () => (lectura === null ? null : calculoDeLaUnidad(vista, lectura, modo, verTotalBs)),
    [lectura, vista, modo, verTotalBs],
  )
  if (tarjeta.estado === 'sin_tarjeta') {
    return (
      <p className="text-(--color-ink-soft)">
        Esta fórmula todavía no tiene tarjeta.{' '}
        <Link
          href={rutaDeLaFormula(origenId, formulaDelOrigenId, 'tarjeta')}
          className="text-(--color-primario-ink) underline"
        >
          La imagen que recibe el cliente
        </Link>
      </p>
    )
  }
  if (lectura === null || calculo === null) {
    return (
      <div role="alert" className="grid gap-2 text-(--color-peligro-ink)">
        <p>No pudimos leer la tarjeta de la cotización.</p>
        <div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={releyendo}
            onClick={() => {
              releer(() => {
                router.refresh()
              })
            }}
          >
            {releyendo ? 'Reintentando…' : 'Reintentar'}
          </Button>
        </div>
      </div>
    )
  }
  const monedaBs = vista?.tipo === 'calculada' ? vista.totales.monedaBs : null
  return <TarjetaEnVivo lectura={lectura} calculo={calculo} monedaBs={monedaBs} />
}

// La tarjeta de la cotización en vivo, al costado de la planilla: la plantilla de trabajo del origen con la unidad de ejemplo y el modo elegido (el mismo de «Totales»).
// Sin plantilla, el enlace a «La imagen que recibe el cliente»; si no se leyó, «Reintentar» trae la pestaña de nuevo sin perder lo aplicado (la sesión no se vuelve a
// montar).
export function TarjetaDeLaUnidad(p: Props) {
  return (
    <section className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)">
      <h4 className="font-semibold text-(--color-ink)">Tarjeta de la cotización</h4>
      <SelectorDeModo modos={p.modos} elegido={p.modo} alElegir={p.alElegirModo} />
      <Cuerpo {...p} />
    </section>
  )
}
