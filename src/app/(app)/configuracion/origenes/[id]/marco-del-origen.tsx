import type { Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { leerOrigenes, pasosQueFaltan } from '@/modules/origenes'
import { BotonDeDatos, DrawerDeDatos, MenuDelOrigen } from '@/modules/origenes/pantallas/origen'
import { datosO } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { pestanasDelOrigen, puedeAbrirElOrigen } from '../acceso'
import { faltaDeCadaPestana } from '../pasos'
import { leerElOrigen } from './abrir-origen'
import { MigasDelOrigen } from './migas-del-origen'
import { PestanasDeLaRuta } from './pestanas-de-la-ruta'
import { seguirLaPuestaEnMarcha } from './seguir-la-puesta-en-marcha'
import type { OrigenDelSelector } from './selector-de-origen'

// La cabecera de la página de un origen, común a sus seis pestañas: las migas («Configuración › Orígenes › ● <Origen> ▾», con el selector para saltar a otro);
// el punto de color, el nombre y, si lo está, «Inactivo»; a la derecha «Seguir la puesta en marcha» (mientras no tenga fórmula activa), «Datos» (su drawer,
// `?panel=datos`; en el celular va en el «⋯») y el «⋯»; y las pestañas, con las que no abre apagadas y su motivo y un ⚠ en la que tiene algo pendiente. Para
// quien no abre el origen no dibuja nada: la pestaña dice por qué.
export async function MarcoDelOrigen({ id }: { id: string }) {
  // Sin esto, el armado del cascarón de un origen nuevo lee la sesión al prerenderizar (`Date.now()` de supabase-js).
  await connection()
  const sesion = await requerirSesion()
  if (!puedeAbrirElOrigen(sesion.permisos, id)) {
    return null
  }
  const [origen, todos] = await Promise.all([leerElOrigen(id), leerOrigenes().then(datosO)])
  // Con el Modo Live: sólo Planilla, Hoja y Tarjeta, sin «Seguir la puesta en marcha», «Datos» ni el «⋯» del origen.
  const enElLive = sesion.live.encendido
  const seguir = enElLive ? null : await seguirLaPuestaEnMarcha(sesion.permisos, origen)
  const puedeGestionar = puede(sesion.permisos, 'origenes.gestionar')
  // El ⚠ de cada pestaña: lo que falta, sin el paso Datos (el aviso de apibara se arregla en Integraciones y no tiene pestaña).
  const faltas = faltaDeCadaPestana(pasosQueFaltan(origen, { apibaraActiva: true }))
  const pestanas = pestanasDelOrigen(sesion.permisos, origen.id, enElLive).map((pestana) => {
    const aviso = faltas[pestana.clave]
    return aviso === undefined ? pestana : { ...pestana, aviso }
  })
  const origenes: OrigenDelSelector[] = todos
    .filter((uno) => puedeAbrirElOrigen(sesion.permisos, uno.id))
    .map((uno) => ({
      id: uno.id,
      nombre: uno.nombre,
      color: uno.color,
      abiertas: pestanasDelOrigen(sesion.permisos, uno.id, enElLive)
        .filter((pestana) => pestana.motivo === undefined)
        .map((pestana) => pestana.clave),
    }))
  const actual = origenes.find((uno) => uno.id === origen.id) ?? {
    id: origen.id,
    nombre: origen.nombre,
    color: origen.color,
    abiertas: [],
  }
  return (
    <div className="grid min-w-0 gap-3">
      <MigasDelOrigen actual={actual} origenes={origenes} />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          <h1 className="min-w-0 text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
            {origen.nombre}
          </h1>
          {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {seguir === null ? null : (
            <Link
              href={seguir as Route}
              className={buttonVariants({ className: 'min-h-11 md:min-h-9' })}
            >
              Seguir la puesta en marcha
            </Link>
          )}
          {enElLive ? null : (
            <>
              <BotonDeDatos />
              <MenuDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
            </>
          )}
        </div>
      </div>
      <PestanasDeLaRuta origenId={origen.id} pestanas={pestanas} />
      {enElLive ? null : <DrawerDeDatos origen={origen} puedeGestionar={puedeGestionar} />}
    </div>
  )
}
