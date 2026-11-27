import 'server-only'
import type { ReactNode } from 'react'
import {
  getLive,
  origenVisibleEnElLive,
  requerirSesion,
  seOcultaEnElLive,
  type AreaDelLive,
} from '@/modules/equipo'
import { EstadoOcultoEnLive } from '@/shared/ui/estados'

// La guarda del Modo Live de cada `page.tsx` y `route.ts` de `(app)` (su área, en `pantallas-del-live.ts`; lo exige
// `scripts/guardas/live-en-las-paginas.test.ts`). Va primero, antes de leer o de crear una promesa que se pase a un hijo: con el Live
// encendido y el área oculta por sus ajustes, nada de la página se lee ni llega al navegador. No va en un layout: al navegar dentro de su
// segmento el layout no se vuelve a dibujar. La sesión está en `cache()`: no suma ninguna lectura.

// Para una página: la pantalla «Oculto en Modo Live», o `null` si se ve.
export async function ocultoEnElLive(area: AreaDelLive): Promise<ReactNode> {
  const sesion = await requerirSesion()
  return seOcultaEnElLive(sesion.live, area) ? <EstadoOcultoEnLive /> : null
}

// Para un route handler: `true` = responde 404. Va después de `await connection()` (bajo `cacheComponents` la cookie se lee por request).
export async function rutaOcultaEnElLive(area: AreaDelLive): Promise<boolean> {
  return seOcultaEnElLive(await getLive(), area)
}

// Para un route handler que ya leyó su registro: `true` = su origen no está entre los que el Live muestra (responde 404).
export async function origenOcultoEnElLive(origenId: string | null): Promise<boolean> {
  return !origenVisibleEnElLive(await getLive(), origenId)
}

// Si el Live muestra sólo algunos orígenes: lo que no sabe su origen antes de leerse (la ETag de una imagen) no se puede dar por bueno.
export async function origenesElegidosEnElLive(): Promise<boolean> {
  const live = await getLive()
  return live.encendido && live.ajustes.origenes !== 'todos'
}

// Para una página con lecturas en `<Suspense>` hermanos: se pone dentro del `<Suspense>` y envuelve todo lo que lee.
export async function SiSeVeEnElLive({
  area,
  children,
}: {
  area: AreaDelLive
  children: ReactNode
}) {
  return (await ocultoEnElLive(area)) ?? children
}
