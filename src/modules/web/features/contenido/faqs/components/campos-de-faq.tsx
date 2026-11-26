'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { ComboDeCatalogo, type TextosDelCombo } from '@/shared/ui/combo-de-catalogo'
import { Interruptor } from '@/shared/ui/interruptor'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_DE_PREGUNTA, LARGO_DE_RESPUESTA } from '../../../../entities/contenido/faqs'
import type { CategoriasDelCombo } from '../../categorias-de-faq/hooks/use-categorias-de-faq'
import type { useFormularioDeFaq } from '../hooks/use-formulario-de-faq'

type Props = {
  formulario: ReturnType<typeof useFormularioDeFaq>
  // El catálogo de categorías de FAQ, también las inactivas, con su «crear».
  categorias: CategoriasDelCombo
}

const TEXTOS_DEL_COMBO: TextosDelCombo = {
  sinValor: 'Sin categoría',
  buscar: 'Buscar o crear una categoría',
  crear: (nombre) => `Crear categoría «${nombre}»`,
  vacio: 'Todavía no hay categorías. Escribe una para crearla.',
  existe: (nombre) => `Ya existe «${nombre}».`,
  inactivo: (nombre) => `Ya existe «${nombre}» (inactiva): actívala en «Categorías».`,
}

// Los campos de una pregunta frecuente: pregunta, respuesta (texto plano), categoría del catálogo y si está publicada.
export function CamposDeFaq({ formulario: f, categorias }: Props) {
  const idDeRespuesta = useId()
  return (
    <>
      <Campo
        nombre="pregunta"
        etiqueta="Pregunta"
        autoComplete="off"
        maxLength={LARGO_DE_PREGUNTA + 20}
        value={f.valores.pregunta}
        error={f.errores['pregunta']}
        onChange={(evento) => {
          f.cambiar({ pregunta: evento.target.value })
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={idDeRespuesta}>Respuesta</Label>
        <Textarea
          id={idDeRespuesta}
          name="respuesta"
          rows={6}
          maxLength={LARGO_DE_RESPUESTA + 100}
          value={f.valores.respuesta}
          aria-invalid={f.errores['respuesta'] ? true : undefined}
          aria-describedby={`${idDeRespuesta}-ayuda`}
          onChange={(evento) => {
            f.cambiar({ respuesta: evento.target.value })
          }}
        />
        {f.errores['respuesta'] ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.errores['respuesta']}
          </p>
        ) : null}
        <p
          id={`${idDeRespuesta}-ayuda`}
          className="text-(length:--text-sm) text-(--color-ink-faint)"
        >
          Se muestra tal como la escribes, sin formato.
        </p>
      </div>
      <ComboDeCatalogo
        nombre="categoriaId"
        etiqueta="Categoría (opcional)"
        valor={f.valores.categoriaId}
        elementos={categorias.lista}
        hayMas={categorias.hayMas}
        textos={TEXTOS_DEL_COMBO}
        puedeCrear
        alElegir={(categoriaId) => {
          f.cambiar({ categoriaId })
        }}
        alCrear={categorias.crear}
        ayuda="Agrupa las preguntas en la web; elige una o créala aquí."
        error={f.errores['categoriaId']}
      />
      <Interruptor
        titulo="Publicada"
        ayuda="Una pregunta publicada se ve en la web pública. Una nueva nace sin publicar."
        valor={f.valores.publicada}
        alCambiar={(publicada) => {
          f.cambiar({ publicada })
        }}
      />
    </>
  )
}
