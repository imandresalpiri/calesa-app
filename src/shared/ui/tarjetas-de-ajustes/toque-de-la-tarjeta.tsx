'use client'

type Props = {
  // El nombre del botón para el teclado y el lector de pantalla: «Editar colores».
  etiqueta: string
  abrir: () => void
  // Atributos de datos para encontrar el botón (`data-editar-color`): el foco vuelve a él al cerrar un modal.
  datosDelBoton?: Readonly<Record<`data-${string}`, string>>
}

// Tocar la tarjeta (o la fila de una lista de un modal) abre su acción principal: un botón sin texto que la cubre entera (su nombre es `etiqueta`). El «⋯» va aparte, encima (un interactivo no
// va dentro de otro), así que un clic en él no llega aquí. Tab lo encuentra primero, con el foco a la vista sobre todo el borde de la tarjeta. El hover lo pinta la tarjeta (`has-[…:hover]`): un fondo sobre el botón taparía el texto.
export function ToqueDeLaTarjeta({ etiqueta, abrir, datosDelBoton }: Props) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      data-slot="toque-de-la-tarjeta"
      {...datosDelBoton}
      onClick={abrir}
      className="absolute inset-0 cursor-pointer rounded-(--radius-card) outline-none focus-visible:shadow-(--shadow-focus)"
    />
  )
}
