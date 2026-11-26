'use client'

import { Settings2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { TITULO_DEL_PANEL_POR_DEFECTO } from '../../../entities/cabecera-por-defecto'
import { AJUSTE_DE_CABECERA, CLAVE_DE_AJUSTE } from '../hooks/urls-de-la-hoja'
import type { PropsDelAjusteDeLaCabecera } from './huecos'

type Props = Omit<PropsDelAjusteDeLaCabecera, 'abierto' | 'cerrar'> & {
  AjusteDeLaCabecera: ComponentType<PropsDelAjusteDeLaCabecera>
}

// El ⚙ de la cabecera (el icono de reguladores, como en V1) y su panel, que vive en la URL (`?ajuste=cabecera`): recargar lo abre y «atrás» lo cierra. Sólo se monta
// si la base dio `ajustes` y un área llenó el hueco: sin eso no hay botón ni hook. El panel se pide recién al abrirse por primera vez y desde ahí queda montado.
export function AjusteDeLaCabeceraEnLaHoja({ AjusteDeLaCabecera, origen, hoja }: Props) {
  const panel = usePanelPorUrl(AJUSTE_DE_CABECERA, [], { clave: CLAVE_DE_AJUSTE })
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const titulo = TITULO_DEL_PANEL_POR_DEFECTO(origen)
  return (
    <>
      <button
        type="button"
        aria-label={titulo}
        title={titulo}
        onClick={() => {
          panel.abrir()
        }}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-(--radius-md) text-(--color-ink-soft) transition hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none md:pointer-fine:min-h-9 md:pointer-fine:min-w-9"
      >
        <Settings2 aria-hidden className="size-[1.125rem]" />
      </button>
      {montado ? (
        <AjusteDeLaCabecera
          abierto={panel.abierto}
          cerrar={panel.cerrar}
          origen={origen}
          hoja={hoja}
        />
      ) : null}
    </>
  )
}
