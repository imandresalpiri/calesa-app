// Los atajos del editor de la tarjeta para la lista de «?»: los del lienzo (`edicion/atajos.ts`, que atiende la grilla con el foco) y los de la pantalla
// (`ATAJOS` con `pantalla: 'tarjeta'`, que atiende la ventana mientras el editor está montado). Puro: sólo datos.
import { atajosDeLaPantalla, type GrupoDeAyuda } from '@/shared/lib/atajos'

export const PANTALLA_DE_LA_TARJETA = 'tarjeta'

// Con el foco en el lienzo; Ctrl vale lo mismo que Cmd.
const DEL_LIENZO: GrupoDeAyuda['atajos'] = [
  { combinacion: 'mod+z', descripcion: 'Deshacer' },
  { combinacion: 'mod+y', descripcion: 'Rehacer (también Ctrl+Mayús+Z)' },
  { combinacion: 'mod+c', descripcion: 'Copiar lo elegido' },
  { combinacion: 'mod+v', descripcion: 'Pegar' },
  { combinacion: 'delete', descripcion: 'Vaciar lo elegido' },
  { combinacion: 'enter', descripcion: 'Escribir en la celda; sobre un dato, abrir su panel' },
  { combinacion: 'mod+a', descripcion: 'Elegir todo' },
  { combinacion: 'shift+ ', descripcion: 'Elegir la fila' },
  { combinacion: 'mod+ ', descripcion: 'Elegir la columna' },
  { combinacion: 'escape', descripcion: 'Soltar lo elegido' },
]

export const AYUDA_DE_LA_TARJETA: GrupoDeAyuda = {
  titulo: 'Editor de la tarjeta',
  atajos: [
    { combinacion: 'mod+s', descripcion: 'Guardar el borrador' },
    ...atajosDeLaPantalla(PANTALLA_DE_LA_TARJETA),
    ...DEL_LIENZO,
  ],
}
