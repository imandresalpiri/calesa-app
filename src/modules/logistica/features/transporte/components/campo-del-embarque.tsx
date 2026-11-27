'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { leerEmbarquesParaElegir } from '../../../areas/transporte/composicion.client'
import { tituloDelEmbarque } from '../../../entities/transporte/textos'
import { useOpcionesParaElegir } from '../hooks/use-opciones-para-elegir'
import { BuscarEnLasOpciones } from './buscar-en-las-opciones'

type Props = {
  nombre: string
  origenId: string
  valor: string
  // El embarque que ya tiene (para nombrarlo aunque no esté entre los diez leídos).
  actual: { id: string; booking: string } | null
  alCambiar: (valor: string) => void
  error?: string
  apagado: boolean
}

// «Embarque» del formulario de un contenedor («Asignar a un embarque»): los del origen, de a diez por booking, con búsqueda por prefijo si hay más. «Sin embarque» lo deja suelto.
export function CampoDelEmbarque({
  nombre,
  origenId,
  valor,
  actual,
  alCambiar,
  error,
  apagado,
}: Props) {
  const opciones = useOpcionesParaElegir(leerEmbarquesParaElegir, origenId)
  const leidos = opciones.estado.tipo === 'listo' ? opciones.estado.filas : []
  const lista = [
    { valor: '', etiqueta: 'Sin embarque' },
    ...(actual && !leidos.some((e) => e.id === actual.id)
      ? [{ valor: actual.id, etiqueta: tituloDelEmbarque(actual.booking) }]
      : []),
    ...leidos.map((e) => ({ valor: e.id, etiqueta: tituloDelEmbarque(e.booking) })),
  ]
  return (
    <div className="grid gap-2">
      <CampoSeleccion
        nombre={nombre}
        etiqueta="Embarque"
        opciones={lista}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        error={error}
        disabled={apagado}
        ayuda="Lo que diga su embarque (naviera, puertos y fechas) vale para todos sus vehículos."
      />
      <BuscarEnLasOpciones
        nombre={`${nombre}-buscar`}
        etiqueta="Buscar un embarque por booking"
        opciones={opciones}
        apagado={apagado}
      />
    </div>
  )
}
