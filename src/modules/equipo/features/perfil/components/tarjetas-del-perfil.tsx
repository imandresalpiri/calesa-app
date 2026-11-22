'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Avatar } from '@/shared/ui/avatar'
import { useDensidad } from '@/shared/ui/densidad'
import { usePorPagina } from '@/shared/ui/por-pagina'
import { useRegional } from '@/shared/ui/regional'
import { TarjetaEditable, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { TEMAS } from '../../../entities/preferencias'
import {
  textoDeItemsPorPagina,
  textoDeLaDensidad,
  textoDeLaZona,
  textoDelTema,
  textoDeVistos,
} from '../../../entities/resumen-de-preferencias'
import { usePreferenciaDeVistos } from '../../vistos/components/proveedor-de-vistos'
import { usePanelesDelPerfil } from '../hooks/use-paneles-del-perfil'
import { ModalDePreferenciasDiferido, ModalDeTuDiferido } from './diferidos'
import type { PropsDeModalDeTu } from './modal-de-tu'

type Props = Pick<
  PropsDeModalDeTu,
  'usuarioId' | 'nombre' | 'email' | 'avatarRuta' | 'avatarUrl' | 'actualizadoEn'
> & {
  // La zona horaria elegida (`null` = la de la empresa).
  zonaElegida: string | null
}

const sinSuscripcion = () => () => undefined

// El tema vive en el navegador: en el servidor no se sabe cuál es, así que se lee al montar (mientras tanto, «…»).
function useTemaElegido() {
  const { theme } = useTheme()
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  return montado ? (TEMAS.find((opcion) => opcion === theme) ?? null) : null
}

function Preferencias({ zonaElegida, abrir }: { zonaElegida: string | null; abrir: () => void }) {
  const tema = textoDelTema(useTemaElegido())
  const { preferencia: densidad } = useDensidad()
  const porPagina = usePorPagina()
  const { zonaHoraria } = useRegional()
  const vistos = usePreferenciaDeVistos()
  return (
    <TarjetaEditable titulo="Preferencias" motivo={null} abrir={abrir}>
      <ValoresDeLaTarjeta
        filas={[
          { etiqueta: 'Tema', valor: tema ?? '…' },
          { etiqueta: 'Densidad', valor: textoDeLaDensidad(densidad) },
          { etiqueta: 'Ítems por página', valor: textoDeItemsPorPagina(porPagina.preferencia) },
          { etiqueta: 'Zona horaria', valor: textoDeLaZona(zonaElegida, zonaHoraria) },
          { etiqueta: 'Marcar lo que abrí', valor: textoDeVistos(vistos) },
        ]}
      />
    </TarjetaEditable>
  )
}

// Las tarjetas «Tú» (nombre y foto) y «Preferencias» de `/perfil`: lo guardado a la vista y «Editar» abre su modal (`?panel=tu|preferencias`), que se pide
// recién entonces. Cada una va dentro del tablero de la página (`<TarjetasDeAjustes>`).
export function TarjetasDelPerfil({ zonaElegida, ...tu }: Props) {
  const paneles = usePanelesDelPerfil()
  return (
    <>
      <TarjetaEditable titulo="Tú" motivo={null} abrir={paneles.tu.abrir}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar nombre={tu.nombre} url={tu.avatarUrl} lado={56} />
          <div className="grid min-w-0 gap-0.5">
            <span className="text-(length:--text-base) font-medium break-words text-(--color-ink)">
              {tu.nombre}
            </span>
            <span className="text-(length:--text-sm) break-all text-(--color-ink-faint)">
              {tu.email}
            </span>
          </div>
        </div>
      </TarjetaEditable>
      <Preferencias zonaElegida={zonaElegida} abrir={paneles.preferencias.abrir} />
      {paneles.tu.montar ? (
        <ModalDeTuDiferido {...tu} abierto={paneles.tu.abierto} alCerrar={paneles.cerrar} />
      ) : null}
      {paneles.preferencias.montar ? (
        <ModalDePreferenciasDiferido
          zonaElegida={zonaElegida}
          abierto={paneles.preferencias.abierto}
          alCerrar={paneles.cerrar}
        />
      ) : null}
    </>
  )
}
