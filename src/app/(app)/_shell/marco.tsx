import type { ReactNode } from 'react'
import { MenuMovil } from './menu-movil'
import { RecargarEnElMenu, RecargarLaPagina } from '@/shared/ui/recargar-la-pagina'
import { HuecoBuscador } from './huecos/buscador'
import { ConmutadorLive } from './conmutador-live'
import { Flotantes } from './flotantes'
import { LateralPlegable } from './lateral-plegable'

type Props = {
  nombreEmpresa: string
  // Si el servidor dibujó esta pantalla con el Modo Live encendido (`data-live` del contenido: lo esperan los e2e).
  enElLive?: boolean
  // <Marca>, <BarraLateral> y <MenuUsuario> ya armados con los datos de la sesión.
  marca: ReactNode
  navegacion: ReactNode
  menuUsuario: ReactNode
  // El hueco de la barra superior para el tipo de cambio del día (`<TiposCambioVigentes>` de
  // `empresa`). Sin tipos de cambio vigentes no ocupa lugar.
  tipoCambio?: ReactNode
  // El drawer de «Nuevo lead» y la tecla N: sólo para quien puede dar de alta leads. No dibuja nada en la barra.
  altaDeLead?: ReactNode
  // «Nuevo» (el botón de la barra y su modal): sólo si hay algo que crear.
  nuevo?: ReactNode
  // Lo que tiene que quedar a la vista en toda pantalla, pegado bajo la barra superior (el banner
  // de la perspectiva «ver como»). Quien lo llena decide si se muestra.
  aviso?: ReactNode
  // La campana de avisos, a la derecha del tipo de cambio (`huecos/campana.tsx`). Sin ella no ocupa lugar.
  campana?: ReactNode
  // El buscador global (`huecos/buscador.tsx`); sin él, el botón con la paleta y sin acciones (sólo busca).
  buscador?: ReactNode
  // Lo que flota sobre toda pantalla, como la burbuja del chat (`huecos/chat.tsx`): va a la derecha de «Copiar el enlace de esta página» (`flotantes.tsx`).
  flotante?: ReactNode
  // La ventana de cámara del Modo Live (`huecos/ventana-de-camara.tsx`): flota sobre la pantalla; sin Live no dibuja nada.
  ventana?: ReactNode
  children: ReactNode
}

// El marco de toda pantalla con sesión: barra lateral, barra superior y el contenido. No sabe de
// permisos ni de ajustes: recibe las piezas ya resueltas.
export function Marco({
  nombreEmpresa,
  enElLive = false,
  marca,
  navegacion,
  menuUsuario,
  tipoCambio,
  altaDeLead,
  nuevo,
  aviso,
  campana,
  buscador = <HuecoBuscador acciones={[]} />,
  flotante,
  ventana,
  children,
}: Props) {
  return (
    <div className="flex min-h-dvh flex-1">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-(--radius-md) bg-(--color-surface) px-3 py-2 text-(--color-ink) shadow-(--shadow-md) focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <LateralPlegable marca={marca} navegacion={navegacion} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="@container sticky top-0 z-30 flex h-(--topbar) shrink-0 items-center gap-2 border-b border-(--color-line) bg-(--color-surface) px-2 md:px-5">
          <MenuMovil titulo={nombreEmpresa}>
            {navegacion}
            {tipoCambio ? (
              // Con el texto grande la barra no tiene lugar para el tipo de cambio: acá se sigue viendo.
              <div className="mt-4 grid gap-1 border-t border-(--color-line) pt-3">
                <p className="px-2 text-(length:--text-xs) text-(--color-ink-soft)">
                  Tipo de cambio del día
                </p>
                {tipoCambio}
              </div>
            ) : null}
            {/* Con la barra angosta «Recargar la página» no entra en ella: queda acá. */}
            <RecargarEnElMenu />
          </MenuMovil>
          <RecargarLaPagina />
          {buscador}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {altaDeLead}
            {nuevo}
            {tipoCambio ? (
              // Sólo si entra: con el texto al 200 % la barra mide menos de 24 rem y el tipo de cambio queda en el menú.
              <div data-hueco="tipo-cambio" className="hidden @min-[24rem]:block">
                {tipoCambio}
              </div>
            ) : null}
            {campana}
            <ConmutadorLive />
            {menuUsuario}
          </div>
        </header>
        {aviso}
        {/* `md:pb-14`: el último renglón y el paginador quedan por encima de lo que flota abajo a la derecha (`flotantes.tsx`). */}
        <main
          id="contenido"
          data-live={enElLive ? 'encendido' : 'apagado'}
          className="flex-1 p-4 md:p-6 md:pb-14"
        >
          {children}
        </main>
      </div>
      <Flotantes>{flotante}</Flotantes>
      {ventana}
    </div>
  )
}
