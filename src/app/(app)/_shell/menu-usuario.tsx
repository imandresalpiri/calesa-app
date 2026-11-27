'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { LifeBuoyIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRef, useTransition } from 'react'
import { Avatar } from '@/shared/ui/avatar'
import { useDensidad, type Densidad } from '@/shared/ui/densidad'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { InstalarApp } from '@/shared/ui/instalar-app'
import { useLiveEnElServidor } from '@/shared/ui/proveedor-del-live'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { adelantarElModalDeAyuda, ModalDeAyudaDiferido } from './ayuda/diferidos'
import { PANEL_DE_AYUDA } from './ayuda/panel'
import { VerComo } from './ver-como'

// Alto de un renglón del menú: cómodo para el dedo en móvil, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'

export type PersonaDelMenu = {
  nombre: string
  email: string
  avatarUrl: string | null
  // El nombre de su rol principal, tal como está en la base. Sólo se muestra.
  rol: string | null
}

type Props = {
  persona: PersonaDelMenu
  // Las entradas de la zona «usuario» que esta persona puede ver (ya filtradas en el servidor).
  entradas: readonly { clave: string; titulo: string; ruta: string }[]
  // La action de `equipo`. Llega por props: un Client Component no importa el índice de un módulo.
  alCerrarSesion: () => Promise<unknown>
  // Si puede preparar los enlaces de ayuda de la empresa (`empresa.ajustes.gestionar`): el vacío de «Ayuda» lo manda a Configuración.
  puedeConfigurarAyuda: boolean
}

function Identidad({ persona }: { persona: PersonaDelMenu }) {
  return (
    <div className="grid gap-0.5 px-1.5 py-1.5">
      <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
        {persona.nombre}
      </span>
      <span className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
        {persona.email}
      </span>
      {persona.rol ? (
        <span className="truncate text-(length:--text-xs) text-(--color-ink-faint)">
          {persona.rol}
        </span>
      ) : null}
    </div>
  )
}

// Tema y densidad se aplican al instante; guardarlos es de <ProveedorPreferencias>.
function Preferencias() {
  const { theme, setTheme } = useTheme()
  const { preferencia, cambiar } = useDensidad()

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(valor: string) => {
            setTheme(valor)
          }}
        >
          <DropdownMenuRadioItem value="light" closeOnClick={false} className={RENGLON}>
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" closeOnClick={false} className={RENGLON}>
            Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" closeOnClick={false} className={RENGLON}>
            Como el dispositivo
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Densidad</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preferencia ?? 'automatica'}
          onValueChange={(valor: Densidad | 'automatica') => {
            cambiar(valor === 'automatica' ? null : valor)
          }}
        >
          <DropdownMenuRadioItem value="automatica" closeOnClick={false} className={RENGLON}>
            Automática
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compacta" closeOnClick={false} className={RENGLON}>
            Compacta
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="comoda" closeOnClick={false} className={RENGLON}>
            Cómoda
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    </>
  )
}

export function MenuUsuario({ persona, entradas, alCerrarSesion, puedeConfigurarAyuda }: Props) {
  const [saliendo, iniciarSalida] = useTransition()
  const avatar = useRef<HTMLButtonElement>(null)
  // «Ayuda» (los enlaces de ayuda) vive en la URL (`?panel=ayuda`) y su modal se pide la primera vez que se abre: en el marco sólo viaja el renglón.
  const ayuda = usePanelPorUrl(PANEL_DE_AYUDA)
  const montada = useAbiertoAlgunaVez(ayuda.abierto)
  // Con el Modo Live, «Ver como» no se ofrece: su lista nombra los roles de la empresa en plena transmisión (el banner de una perspectiva ya elegida sigue).
  const enElLive = useLiveEnElServidor()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={avatar}
          aria-label={`Menú de ${persona.nombre}`}
          className="flex size-[44px] items-center justify-center rounded-(--radius-pill) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-9"
        >
          <Avatar nombre={persona.nombre} url={persona.avatarUrl} lado={30} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <Identidad persona={persona} />
          <DropdownMenuSeparator />
          {entradas.map((entrada) => (
            <DropdownMenuItem
              key={entrada.clave}
              className={RENGLON}
              // Las rutas de la navegación existen: lo garantiza navegacion.test.ts contra el disco.
              render={<Link href={entrada.ruta as Route} />}
            >
              {entrada.titulo}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            className={RENGLON}
            onPointerEnter={adelantarElModalDeAyuda}
            onClick={() => {
              ayuda.abrir()
            }}
          >
            <LifeBuoyIcon aria-hidden />
            Ayuda
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <InstalarApp className={RENGLON} />
          {enElLive ? null : <VerComo />}
          <Preferencias />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={RENGLON}
            disabled={saliendo}
            onClick={() => {
              iniciarSalida(async () => {
                await alCerrarSesion()
              })
            }}
          >
            {saliendo ? 'Cerrando la sesión…' : 'Cerrar sesión'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {montada ? (
        <ModalDeAyudaDiferido
          abierto={ayuda.abierto}
          alCerrar={ayuda.cerrar}
          puedeConfigurar={puedeConfigurarAyuda}
          focoAlCerrar={avatar}
        />
      ) : null}
    </>
  )
}
