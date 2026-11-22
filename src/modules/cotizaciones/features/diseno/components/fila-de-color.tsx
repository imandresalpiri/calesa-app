import { MasAcciones } from '@/shared/ui/lista'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { tintaDeLaTarjeta } from '../../../entities/colores'
import { TEMAS_DE_UN_TONO, type Tono } from '../../../entities/diseno/tonos'
import { MuestraDeColor } from './muestra-de-color'
import { MuestraDelHex } from './muestra-del-hex'

type Props = {
  tono: Tono
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// El «⋯» de un color: se busca por él para devolverle el foco al cerrar la confirmación de eliminar.
export const idDelMenuDeColor = (id: string) => `color-${id}`

// Un color del catálogo: su nombre, su clave en texto suave (la nombran los grupos de una fórmula y no cambia), el hex como lo pinta la tarjeta y sus dos muestras
// de la hoja. Sin botones sueltos: sólo su «⋯» («Editar…» y «Eliminar…») y tocar la fila abre «Editar». Con el teclado, la fila es un botón con nombre («Editar «<nombre>»»)
// y el «⋯» va aparte. Al 200 % la fila se apila (`flex-wrap` sobre una base en rem).
export function FilaDeColor({ tono, alEditar, alPedirEliminar }: Props) {
  const editar = () => {
    alEditar(tono.id)
  }
  return (
    <li
      data-color={tono.clave}
      className="relative min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2)"
    >
      <ToqueDeLaTarjeta
        etiqueta={`Editar «${tono.nombre}»`}
        abrir={editar}
        datosDelBoton={{ 'data-editar-color': tono.id }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="truncate font-medium text-(--color-ink)" title={tono.nombre}>
            {tono.nombre}
          </span>
          <span className="truncate text-(length:--text-sm) text-(--color-ink-faint)">
            {tono.clave}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <MuestraDelHex
            hex={tono.hex}
            tinta={tintaDeLaTarjeta(tono.hex, tono.colores.claro.tinta)}
          />
          {TEMAS_DE_UN_TONO.map((tema) => (
            <MuestraDeColor key={tema} tema={tema} colores={tono.colores[tema]} />
          ))}
        </div>
        <div className="relative ms-auto flex items-center gap-1">
          <MasAcciones
            nombre={`«${tono.nombre}»`}
            id={idDelMenuDeColor(tono.id)}
            acciones={[
              {
                tipo: 'accion',
                clave: 'editar',
                etiqueta: 'Editar…',
                principal: true,
                despuesDeCerrar: true,
                alElegir: editar,
              },
              {
                tipo: 'accion',
                clave: 'eliminar',
                etiqueta: 'Eliminar…',
                destructiva: true,
                despuesDeCerrar: true,
                alElegir: () => {
                  alPedirEliminar(tono.id)
                },
              },
            ]}
          />
        </div>
      </div>
    </li>
  )
}
