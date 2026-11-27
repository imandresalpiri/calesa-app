'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { AccionDeLaTarjeta, ResumenDeTarjeta } from '../../../../entities/nucleo/tarjeta'
import { AvisoDeLaTarjeta } from './aviso-de-la-tarjeta'
import { useAvisoDeQueFalta } from '../../avisos-de-las-tarjetas'
import { useTarjeta } from './contexto'

type Props = {
  // El título de la tarjeta: nombra su «⋯» («Más acciones de Documentos»).
  titulo: string
  resumen: ResumenDeTarjeta
}

function lineaDelMenu(
  accion: AccionDeLaTarjeta,
  principal: boolean,
  hacer: (accion: AccionDeLaTarjeta) => void,
): AccionDeMenu {
  return {
    tipo: 'accion',
    clave: accion.clave,
    etiqueta: accion.etiqueta,
    principal,
    despuesDeCerrar: accion.destino.tipo === 'drawer',
    alElegir: () => {
      hacer(accion)
    },
  }
}

// Lo que dice una tarjeta de la unidad, ya leído en el servidor: hasta dos líneas (cortadas con elipsis), su aviso y el «⋯» con la lista única de sus acciones (la primera, en
// negrita, es la del toque). Va sobre el botón que cubre la tarjeta: el texto deja pasar el clic y el «⋯» lo recupera. Mide siempre lo mismo que su esqueleto.
export function ResumenDeLaTarjeta({ titulo, resumen }: Props) {
  const { clave, abrir } = useTarjeta()
  // El aviso de «Qué falta» («Falta «BL»», calculado en el navegador sobre su última lectura) manda sobre el del servidor: es lo que traba mover.
  const avisoDeQueFalta = useAvisoDeQueFalta(clave)
  const router = useRouter()
  const hacer = (accion: AccionDeLaTarjeta) => {
    const destino = accion.destino
    if (destino.tipo === 'ruta') {
      salirSinPerder(() => {
        router.push(destino.href as Route)
      })
      return
    }
    abrir({
      ...(destino.url ? { url: destino.url } : {}),
      ...(destino.enfocar ? { enfocar: destino.enfocar } : {}),
    })
  }
  const aviso = avisoDeQueFalta ?? resumen.aviso
  return (
    <>
      <div className="pointer-events-none grid min-h-10 content-start gap-0.5 text-(length:--text-sm) text-(--color-ink-soft)">
        {resumen.lineas.slice(0, 2).map((linea) => (
          <p key={linea} className="truncate" title={linea}>
            {linea}
          </p>
        ))}
      </div>
      <div className="flex h-5 items-center">
        {aviso ? <AvisoDeLaTarjeta texto={aviso} /> : null}
      </div>
      {resumen.acciones.length > 0 ? (
        <div className="absolute end-2 top-2">
          <MasAcciones
            nombre={titulo}
            acciones={resumen.acciones.map((a, i) => lineaDelMenu(a, i === 0, hacer))}
          />
        </div>
      ) : null}
    </>
  )
}
