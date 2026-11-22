import { cn } from 'cn'
import Link from 'next/link'
import { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '@/modules/cotizaciones'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLaFormula, rutaDeParteDelOrigen, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { buttonVariants } from '@/shared/ui/button'

export const AVISO_DE_LA_ARCHIVADA = 'Esta fórmula está archivada: cópiala para seguir editándola.'

type Props = { origenId: string; formulaId: string; parte: ParteDeLaFormula }

// El cuerpo de Planilla, Hoja o Tarjeta con una fórmula archivada elegida: no se edita. «Copiar» abre «Nueva fórmula» con la copia; «Ir a la fórmula de
// trabajo», la misma pestaña sin `?formula=`. Elegir otra se hace con el selector de la barra.
export function AvisoDeLaArchivada({ origenId, formulaId, parte }: Props) {
  return (
    <Aviso tono="aviso">
      <p>{AVISO_DE_LA_ARCHIVADA}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={rutaDeLaFormula(origenId, formulaId, parte, {
            [CLAVE_DE_PANEL]: PANEL_NUEVA_FORMULA,
            [CLAVE_DE_LA_COPIA]: formulaId,
          })}
          className={buttonVariants({ size: 'sm' })}
        >
          Copiar
        </Link>
        <Link
          href={rutaDeParteDelOrigen(origenId, parte)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Ir a la fórmula de trabajo
        </Link>
      </div>
    </Aviso>
  )
}
