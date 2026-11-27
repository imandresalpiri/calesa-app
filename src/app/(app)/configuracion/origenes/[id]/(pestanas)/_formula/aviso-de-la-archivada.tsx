import { cn } from 'cn'
import Link from 'next/link'
import { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '@/modules/cotizaciones'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLaFormula, rutaDeParteDelOrigen, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { buttonVariants } from '@/shared/ui/button'

export const AVISO_DE_LA_ARCHIVADA = 'Esta fórmula está archivada: cópiala para seguir editándola.'
export const AVISO_DE_LA_ARCHIVADA_EN_EL_LIVE = 'Esta fórmula está archivada.'

type Props = {
  origenId: string
  formulaId: string
  parte: ParteDeLaFormula
  // Con el Modo Live: sin «Copiar».
  soloLectura: boolean
}

// El cuerpo de Planilla, Hoja o Tarjeta con una fórmula archivada elegida: no se edita. «Copiar» abre «Nueva fórmula» con la copia; «Ir a la fórmula de
// trabajo», la misma pestaña sin `?formula=`. Elegir otra se hace con el selector de la barra. Con el Modo Live, sólo «Ir a la fórmula de trabajo».
export function AvisoDeLaArchivada({ origenId, formulaId, parte, soloLectura }: Props) {
  return (
    <Aviso tono="aviso">
      <p>{soloLectura ? AVISO_DE_LA_ARCHIVADA_EN_EL_LIVE : AVISO_DE_LA_ARCHIVADA}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {soloLectura ? null : (
          <Link
            href={rutaDeLaFormula(origenId, formulaId, parte, {
              [CLAVE_DE_PANEL]: PANEL_NUEVA_FORMULA,
              [CLAVE_DE_LA_COPIA]: formulaId,
            })}
            className={buttonVariants({ size: 'sm' })}
          >
            Copiar
          </Link>
        )}
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
