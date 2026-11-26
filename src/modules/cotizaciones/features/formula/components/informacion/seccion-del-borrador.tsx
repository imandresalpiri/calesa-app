'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  borradorAtrasado,
  type BorradorDelOrigen,
  type ConAutor,
  type PublicadaDelOrigen,
} from '../../../../entities/formula/versiones'
import { SECCION, TITULO } from './clases'

type Props = {
  borrador: ConAutor<BorradorDelOrigen>
  publicada: Pick<PublicadaDelOrigen, 'id' | 'version'> | null
  // Abre «Descartar el borrador» (`?panel=descartar-borrador`, 4.20-2c), que reemplaza a este modal en la URL; sin él, la sección sólo se lee.
  alDescartar?: () => void
}

// El borrador del origen (a lo sumo uno), en el modal «Información de la fórmula»: quién lo guardó, cuándo, sobre qué versión empezó y, si desde entonces se
// publicó otra, que publicarlo dará conflicto (4.20-1: la base lo rechaza con quién publicó). «Descartar el borrador…» siempre (4.20-2c): un borrador atrasado ya
// no se publica, y se descarta. «Publicar…» va en la barra de la fórmula (`PublicarDelBorrador`).
export function SeccionDelBorrador({ borrador, publicada, alDescartar }: Props) {
  const { zonaHoraria } = useRegional()
  const atrasado = borradorAtrasado(borrador, publicada)
  return (
    <section aria-label="Borrador" className={SECCION}>
      <h3 className={TITULO}>
        Borrador de {borrador.autor} · guardado{' '}
        {fechaRelativa(borrador.actualizadoEn, { zona: zonaHoraria })}
      </h3>
      {borrador.nota ? <p className="break-words text-(--color-ink)">{borrador.nota}</p> : null}
      {borrador.versionDeOrigen !== null ? (
        <p className="text-(--color-ink-soft)">
          Empezó sobre la versión {borrador.versionDeOrigen}.
        </p>
      ) : null}
      {atrasado && publicada ? (
        <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)">
          Después de que empezó, se publicó la versión {publicada.version}: publicarlo dará
          conflicto.
        </p>
      ) : null}
      {alDescartar ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={alDescartar}
          >
            Descartar el borrador…
          </Button>
        </div>
      ) : null}
    </section>
  )
}
