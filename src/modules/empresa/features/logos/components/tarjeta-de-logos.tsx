'use client'

import { conteoAcotado, conteoCorto } from '@/shared/lib/conteo'
import { useRegional } from '@/shared/ui/regional'
import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  alTopeDeLogos,
  conArchivo,
  propias,
  textoDelTopeDeLogos,
  type ListaDeLogos,
} from '../../../entities/logos'
import { useFamiliaDeLogos } from '../hooks/use-familia-de-logos'
import { usePanelDeLogo } from '../hooks/use-panel-de-logo'
import { EditorDeLogosDiferido } from './diferidos'
import { MiniaturaDeLogo } from './miniatura-de-logo'

// Cuántas miniaturas caben en la tarjeta (con «y N más» debajo): la tarjeta mide siempre lo mismo.
const EN_LA_TARJETA = 3
const TOPE_DEL_CONTEO = 20

type Props = {
  lista: ListaDeLogos
  // Sin `empresa.ajustes.gestionar`: la tarjeta no abre y el «⋯» lo dice.
  motivo: string | null
  // Abre el modal de Identidad (donde se cambian «Principal» y «Para fondo oscuro»).
  alCambiarEnIdentidad: () => void
}

// La tarjeta «Logos» de Configuración › Empresa: las primeras variantes en miniatura sobre el damero, con su nombre, y cuántas hay; tocarla abre la lista en
// su modal (`?panel=logos`) y «Subir un logo», en el «⋯», el formulario de uno nuevo. El editor se pide recién al abrir algún panel suyo.
export function TarjetaDeLogos({ lista, motivo, alCambiarEnIdentidad }: Props) {
  const familia = useFamiliaDeLogos(motivo)
  const panel = usePanelDeLogo()
  const { locale } = useRegional()
  const conArchivos = conArchivo(lista)
  const cuantas = propias(lista).length
  const motivoDelTope = alTopeDeLogos(lista) ? textoDelTopeDeLogos(lista.tope) : null
  const visibles = conArchivos.slice(0, EN_LA_TARJETA)
  const faltan = conArchivos.length - visibles.length
  return (
    <>
      <TarjetaTocable
        titulo="Logos"
        accion="Gestionar logos"
        etiquetaDelMenu="Gestionar logos…"
        motivo={motivo}
        abrir={familia.abrir}
        estado={
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            {conteoCorto(conteoAcotado(cuantas, TOPE_DEL_CONTEO), { locale })}{' '}
            {cuantas === 1 ? 'propio' : 'propios'}
          </span>
        }
        extra={
          motivo === null
            ? [
                {
                  tipo: 'accion',
                  clave: 'subir',
                  etiqueta: 'Subir un logo…',
                  despuesDeCerrar: true,
                  deshabilitada: motivoDelTope !== null,
                  alElegir: panel.abrirNuevo,
                },
                ...(motivoDelTope === null
                  ? []
                  : [{ tipo: 'nota', clave: 'tope', texto: motivoDelTope } as const]),
              ]
            : []
        }
      >
        <div className="min-h-[5.5rem]">
          {visibles.length === 0 ? (
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              Todavía no hay logos. Súbelos en Identidad o con «Subir un logo».
            </p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {visibles.map((logo) => (
                <li key={logo.id} className="grid w-16 min-w-0 justify-items-center gap-1">
                  <MiniaturaDeLogo variante={logo} lado={64} />
                  <span className="w-full truncate text-center text-(length:--text-xs) text-(--color-ink-soft)">
                    {logo.nombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="min-h-5 text-(length:--text-sm) text-(--color-ink-faint)">
          {faltan > 0 ? `y ${String(faltan)} más` : ''}
        </p>
      </TarjetaTocable>
      {familia.montar && motivo === null ? (
        <EditorDeLogosDiferido lista={lista} alCambiarEnIdentidad={alCambiarEnIdentidad} />
      ) : null}
    </>
  )
}
