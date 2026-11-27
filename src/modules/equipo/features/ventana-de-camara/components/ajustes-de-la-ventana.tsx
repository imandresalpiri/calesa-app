'use client'

import { SettingsIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Switch } from '@/shared/ui/switch'
import {
  DATOS_DE_LA_VENTANA,
  contactoAMostrar,
  type DatoDeLaVentana,
  type DatosDeQuienPresenta,
  type VentanaDeCamara,
} from '../../../entities/ventana-de-camara'
import type { Dispositivo } from '../hooks/use-camara'

type Props = {
  ventana: VentanaDeCamara
  datos: DatosDeQuienPresenta
  dispositivos: readonly Dispositivo[]
  // La cámara que de verdad se abrió.
  usada: string | null
  cambiar: (cambios: Partial<VentanaDeCamara>) => void
}

const ETIQUETA: Record<DatoDeLaVentana, string> = {
  nombre_y_cargo: 'Nombre y cargo',
  contacto: 'WhatsApp o teléfono',
  logo: 'Logo de la empresa',
  redes_y_web: 'Redes y web de la empresa',
}

const SIN_VALOR: Record<
  DatoDeLaVentana,
  { motivo: string; hay: (d: DatosDeQuienPresenta) => boolean }
> = {
  nombre_y_cargo: { motivo: '', hay: () => true },
  contacto: {
    motivo: 'No tienes WhatsApp ni teléfono: cárgalo en tu perfil.',
    hay: (d) => contactoAMostrar(d) !== null,
  },
  logo: { motivo: 'La empresa no tiene logo cargado.', hay: (d) => d.empresa.logoUrl !== null },
  redes_y_web: {
    motivo: 'La empresa no cargó redes ni web.',
    hay: (d) => d.empresa.redes.length > 0 || Boolean(d.empresa.web),
  },
}

// Por qué una opción no se puede elegir: no hay de dónde sacarla.
const motivoSinValor = (dato: DatoDeLaVentana, datos: DatosDeQuienPresenta): string | null =>
  SIN_VALOR[dato].hay(datos) ? null : SIN_VALOR[dato].motivo

function SelectorDeCamara({
  dispositivos,
  actual,
  cambiar,
}: Pick<Props, 'dispositivos' | 'cambiar'> & { actual: string }) {
  return (
    <label className="grid gap-1 text-(length:--text-sm)">
      <span className="font-medium text-(--color-ink)">Cámara</span>
      <select
        value={actual}
        disabled={dispositivos.length === 0}
        onChange={(evento) => {
          cambiar({ camara: evento.target.value || null })
        }}
        className="h-9 w-full rounded-(--radius-md) border border-(--color-line-strong) bg-(--color-surface-2) px-2 text-(--color-ink)"
      >
        {dispositivos.length === 0 ? <option value="">Sin cámaras</option> : null}
        {dispositivos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

function DatosAMostrar({ ventana, datos, cambiar }: Pick<Props, 'ventana' | 'datos' | 'cambiar'>) {
  const alternarDato = (dato: DatoDeLaVentana, elegido: boolean) => {
    cambiar({
      datos: DATOS_DE_LA_VENTANA.filter((d) => (d === dato ? elegido : ventana.datos.includes(d))),
    })
  }
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        Datos a mostrar
      </legend>
      {DATOS_DE_LA_VENTANA.map((dato) => {
        const motivo = motivoSinValor(dato, datos)
        return (
          <label
            key={dato}
            className="grid grid-cols-[auto_1fr] items-center gap-x-2 text-(length:--text-sm)"
          >
            <Checkbox
              checked={motivo === null && ventana.datos.includes(dato)}
              disabled={motivo !== null}
              onCheckedChange={(elegido) => {
                alternarDato(dato, elegido)
              }}
            />
            <span className={motivo ? 'text-(--color-ink-faint)' : 'text-(--color-ink)'}>
              {ETIQUETA[dato]}
            </span>
            {motivo ? (
              <span className="col-start-2 text-(length:--text-xs) text-(--color-ink-faint)">
                {motivo}
              </span>
            ) : null}
          </label>
        )
      })}
    </fieldset>
  )
}

// El popover de ajustes de la ventana (⚙): cámara, espejo y qué datos se ven. Se abre sobre la ventana sin agrandarla.
export function AjustesDeLaVentana({ ventana, datos, dispositivos, usada, cambiar }: Props) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Ajustes de la ventana de cámara"
            title="Ajustes de la ventana de cámara"
          />
        }
      >
        <SettingsIcon aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3 p-3">
        <SelectorDeCamara
          dispositivos={dispositivos}
          actual={usada ?? ventana.camara ?? ''}
          cambiar={cambiar}
        />
        <label className="flex items-center justify-between gap-3 text-(length:--text-sm)">
          <span className="font-medium text-(--color-ink)">Espejo</span>
          <Switch
            checked={ventana.espejo}
            onCheckedChange={(espejo) => {
              cambiar({ espejo })
            }}
          />
        </label>
        <DatosAMostrar ventana={ventana} datos={datos} cambiar={cambiar} />
        <label className="flex items-center justify-between gap-3 text-(length:--text-sm)">
          <span className="text-(--color-ink)">Cargo de mi ficha web</span>
          <Switch
            checked={ventana.ficha_web}
            onCheckedChange={(ficha_web) => {
              cambiar({ ficha_web })
            }}
          />
        </label>
      </PopoverContent>
    </Popover>
  )
}
