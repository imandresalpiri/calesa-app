'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_DESCRIPCION, LARGO_MAXIMO_DE_LUGAR } from '../../../entities/edicion'
import type { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'

// Los dos últimos campos del evento, a la vista como los demás (nada se pliega): el lugar y la descripción.
export function LugarYDescripcion({
  formulario: f,
}: {
  formulario: ReturnType<typeof useFormularioDeEvento>
}) {
  const id = useId()
  return (
    <>
      <Campo
        nombre="lugar"
        etiqueta="Lugar (opcional)"
        value={f.valores.lugar}
        maxLength={LARGO_MAXIMO_DE_LUGAR + 20}
        error={f.errores.lugar}
        onChange={(evento) => {
          f.cambiar('lugar', evento.target.value)
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-descripcion`}>Descripción (opcional)</Label>
        <Textarea
          id={`${id}-descripcion`}
          value={f.valores.descripcion}
          rows={4}
          maxLength={LARGO_MAXIMO_DE_DESCRIPCION + 20}
          aria-invalid={f.errores.descripcion ? true : undefined}
          onChange={(evento) => {
            f.cambiar('descripcion', evento.target.value)
          }}
        />
        {f.errores.descripcion ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.errores.descripcion}
          </p>
        ) : null}
      </div>
    </>
  )
}
