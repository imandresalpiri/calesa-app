'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import {
  TarjetaEditable,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
  type FilaDeValores,
} from '@/shared/ui/tarjetas-de-ajustes'
import {
  CLAVES_DE_LEGALES,
  ETIQUETA_DEL_ESTADO_DE_LEGAL,
  TEXTOS_DE_LEGALES,
  estadoDeLegal,
  extractoDeLegal,
  type ClaveDeLegal,
  type LegalesDelSitio,
} from '../../../../entities/contenido/legales'
import { usePanelesDeLegales } from '../hooks/use-paneles-de-legales'
import { ModalDeLegalDiferido } from './diferidos'

export type PropsDeLegales = { legales: LegalesDelSitio }

// El estado junto al título: texto y color, nunca sólo color.
const VARIANTE = { publicada: 'default', 'sin-publicar': 'outline' } as const

function TarjetaDeLegal({
  clave,
  legales,
  abrir,
}: {
  clave: ClaveDeLegal
  legales: LegalesDelSitio
  abrir: () => void
}) {
  const { zonaHoraria } = useRegional()
  const guardado = legales[clave]
  const estado = estadoDeLegal(guardado)
  const filas: FilaDeValores[] = [
    { etiqueta: 'Título', valor: guardado?.titulo ?? null },
    {
      etiqueta: 'Última edición',
      valor: guardado?.actualizadoEn
        ? formatearFecha(guardado.actualizadoEn, { zona: zonaHoraria })
        : null,
    },
  ]
  return (
    <TarjetaEditable
      titulo={TEXTOS_DE_LEGALES[clave].titulo}
      motivo={null}
      abrir={abrir}
      estado={<Badge variant={VARIANTE[estado]}>{ETIQUETA_DEL_ESTADO_DE_LEGAL[estado]}</Badge>}
    >
      <p className="line-clamp-3 text-(length:--text-sm) text-(--color-ink-soft)">
        {guardado
          ? extractoDeLegal(guardado.doc)
          : 'Todavía no se escribió: el sitio no lo muestra.'}
      </p>
      <ValoresDeLaTarjeta filas={filas} />
    </TarjetaEditable>
  )
}

// Un documento legal por tarjeta, con su estado, su última edición y «Editar»; cada «Editar» abre su modal (`?panel=terminos|privacidad`), que se
// pide recién entonces. Entra quien tiene `web.ajustes.gestionar` (la página lo exige).
export function TarjetasDeLegales({ legales }: PropsDeLegales) {
  const paneles = usePanelesDeLegales()
  return (
    <>
      <TarjetasDeAjustes etiqueta="Legales del sitio">
        {CLAVES_DE_LEGALES.map((clave) => (
          <TarjetaDeLegal
            key={clave}
            clave={clave}
            legales={legales}
            abrir={paneles.porClave[clave].abrir}
          />
        ))}
      </TarjetasDeAjustes>
      {CLAVES_DE_LEGALES.map((clave) =>
        paneles.porClave[clave].montar ? (
          <ModalDeLegalDiferido
            key={clave}
            clave={clave}
            abierto={paneles.porClave[clave].abierto}
            alCerrar={paneles.cerrar}
            guardado={legales[clave]}
            actualizadoEn={legales.actualizadoEn}
          />
        ) : null,
      )}
    </>
  )
}
