'use client'

import { ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { cn } from 'cn'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ListaDelComboDiferida } from './diferidos'
import type { PropsDelCombo } from './tipos'

// Elegir un elemento de un catálogo (un grupo de campos, una categoría) o crearlo escribiendo su nombre: lo que ya existe con otra
// escritura se ofrece en lugar de crear un duplicado. Es un botón con aspecto de campo; la lista flota sobre el formulario y no lo
// empuja. Lo recién creado se muestra hasta que la lista de afuera lo trae.
export function ComboDeCatalogo(props: PropsDelCombo) {
  const { nombre, etiqueta, valor, textos, error, ayuda } = props
  const [abierto, setAbierto] = useState(false)
  const [creados, setCreados] = useState<readonly ElementoDeCatalogo[]>([])
  const elementos = [
    ...props.elementos,
    ...creados.filter((creado) => !props.elementos.some((elemento) => elemento.id === creado.id)),
  ]
  const elegido = elementos.find((elemento) => elemento.id === valor) ?? null
  const idEtiqueta = `${nombre}-etiqueta`
  const idValor = `${nombre}-valor`
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined
  const idError = error ? `${nombre}-error` : undefined

  async function crear(texto: string): Promise<string | null> {
    const creado = await props.alCrear(texto)
    if (!creado.ok) {
      return creado.error.mensaje
    }
    setCreados((antes) => [...antes, creado.data])
    props.alElegir(creado.data.id)
    setAbierto(false)
    return null
  }

  return (
    <div className="grid gap-1.5">
      <Label id={idEtiqueta} htmlFor={nombre}>
        {etiqueta}
      </Label>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          id={nombre}
          type="button"
          disabled={props.deshabilitado}
          aria-labelledby={`${idEtiqueta} ${idValor}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={[idError, idAyuda].filter(Boolean).join(' ') || undefined}
          className={cn(
            'flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-left text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm)',
            'focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-50',
            'aria-invalid:border-(--color-peligro)',
          )}
        >
          <span
            id={idValor}
            className={cn('min-w-0 flex-1 truncate', !elegido && 'text-(--color-ink-soft)')}
          >
            {elegido ? `${elegido.nombre}${elegido.activo ? '' : ' (inactivo)'}` : textos.sinValor}
          </span>
          <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
          <ListaDelComboDiferida
            etiqueta={etiqueta}
            valor={valor}
            elementos={elementos}
            hayMas={props.hayMas}
            textos={textos}
            maximoDelNombre={props.maximoDelNombre}
            puedeCrear={props.puedeCrear}
            alElegir={(id) => {
              props.alElegir(id)
              setAbierto(false)
            }}
            alCrear={crear}
          />
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}
