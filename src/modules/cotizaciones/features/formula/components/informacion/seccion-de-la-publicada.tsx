'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { ConAutor, PublicadaDelOrigen } from '../../../../entities/formula/versiones'
import { SECCION, TITULO } from './clases'

type Props = {
  publicada: ConAutor<PublicadaDelOrigen> | null
  // El nombre del origen, para decir que sin publicada no se cotiza en él.
  origen: string
}

// La versión con la que hoy se cotiza en el origen, en el modal «Información de la fórmula». Sin ella, la «fórmula pendiente» del glosario: no se puede cotizar.
export function SeccionDeLaPublicada({ publicada, origen }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <section aria-label="Publicada" className={SECCION}>
      <h3 className={TITULO}>
        {publicada ? `Publicada: versión ${String(publicada.version)}` : 'Publicada'}
      </h3>
      {publicada ? (
        <>
          {publicada.nota ? (
            <p className="break-words text-(--color-ink)">{publicada.nota}</p>
          ) : null}
          <p className="text-(--color-ink-soft)">
            {publicada.autor}
            {publicada.publicadoEn
              ? ` · ${fechaRelativa(publicada.publicadoEn, { zona: zonaHoraria })}`
              : null}
          </p>
        </>
      ) : (
        <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)">
          {origen} todavía no tiene una versión publicada: no se puede cotizar en él.
        </p>
      )}
    </section>
  )
}
