import Image from 'next/image'
import {
  cargoAMostrar,
  contactoAMostrar,
  direccionLegible,
  logoDeLaVentana,
  type DatoDeLaVentana,
  type DatosDeQuienPresenta,
} from '../../../entities/ventana-de-camara'

type Props = {
  datos: DatosDeQuienPresenta
  elegidos: readonly DatoDeLaVentana[]
  fichaWeb: boolean
  // La variante del logo elegida (`ventana.logo`).
  logo: string | null
}

function Logo({
  url,
  oscuro,
  enOscuro,
}: {
  url: string
  oscuro: string | null
  enOscuro: boolean
}) {
  // Con logo para el tema oscuro van los dos y el tema elige por CSS: sin parpadeo al cambiar. La variante «Para fondo oscuro» va sobre fondo oscuro
  // (`dark` resuelve ahí los tokens), sea cual sea el tema.
  return (
    <span
      className={`${enOscuro ? 'dark rounded-(--radius-md) bg-(--color-surface-2) p-1' : ''} flex min-w-0`}
    >
      <Image
        src={url}
        alt=""
        width={160}
        height={32}
        unoptimized
        className={`h-8 w-auto max-w-full object-contain object-left ${oscuro ? 'dark:hidden' : ''}`}
      />
      {oscuro ? (
        <Image
          src={oscuro}
          alt=""
          width={160}
          height={32}
          unoptimized
          className="hidden h-8 w-auto max-w-full object-contain object-left dark:block"
        />
      ) : null}
    </span>
  )
}

function NombreYCargo({ nombre, cargo }: { nombre: string; cargo: string | null }) {
  return (
    <p className="grid">
      <strong className="text-(length:--text-base) leading-tight text-(--color-ink)">
        {nombre}
      </strong>
      {cargo ? <span className="text-(--color-ink-soft)">{cargo}</span> : null}
    </p>
  )
}

function RedesYWeb({
  redes,
  web,
}: {
  redes: DatosDeQuienPresenta['empresa']['redes']
  web: string | null
}) {
  return (
    <ul className="grid gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
      {redes.map((red) => (
        <li key={red.clave}>
          {red.etiqueta}: {direccionLegible(red.valor)}
        </li>
      ))}
      {web ? <li>{web}</li> : null}
    </ul>
  )
}

// Lo de quien presenta que eligió mostrar, debajo del video. Lo que no tiene valor no se dibuja (ni su renglón): la ventana no cambia de ancho. Los textos se
// parten en líneas (`break-words`) y, si no caben a lo alto, el bloque de afuera se desplaza por dentro.
export function DatosDeLaVentana({ datos, elegidos, fichaWeb, logo }: Props) {
  const { empresa } = datos
  const contacto = contactoAMostrar(datos)
  const web = empresa.web ? direccionLegible(empresa.web) : null
  const ve = (dato: DatoDeLaVentana) => elegidos.includes(dato)
  const delLogo = logoDeLaVentana(empresa, logo)

  return (
    <div className="grid min-w-0 gap-1.5 p-3 text-(length:--text-sm) [overflow-wrap:anywhere]">
      {ve('nombre_y_cargo') && datos.nombre ? (
        <NombreYCargo nombre={datos.nombre} cargo={cargoAMostrar(datos, fichaWeb)} />
      ) : null}
      {ve('contacto') && contacto ? <p className="text-(--color-ink)">{contacto}</p> : null}
      {ve('logo') && delLogo ? (
        <Logo url={delLogo.url} oscuro={delLogo.oscuro} enOscuro={delLogo.enOscuro} />
      ) : null}
      {ve('redes_y_web') && (empresa.redes.length > 0 || web) ? (
        <RedesYWeb redes={empresa.redes} web={web} />
      ) : null}
    </div>
  )
}
