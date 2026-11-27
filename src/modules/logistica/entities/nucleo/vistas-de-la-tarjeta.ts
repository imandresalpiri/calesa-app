// Las vistas del drawer de una tarjeta que junta varios huecos (Dinero: Gastos, Pagos y Margen): una pestaña por hueco visible, en el orden del panel, y la que se
// ve en la URL (`?<tarjeta>=<hueco>`, sin sumar al historial). Sin I/O.

/** Una vista: el hueco que dibuja y los `?panel=` que atiende (con uno en la URL, su hueco tiene que estar montado para abrirlo). */
export type VistaDeLaTarjeta = {
  clave: string
  titulo: string
  paneles: readonly string[]
}

/**
 * La vista que se ve: la del hueco que atiende el `?panel=` abierto (un enlace a un pago abre «Pagos»), si no la pedida en la URL, si no la primera. Una pedida que no
 * existe (sin permiso, regla apagada o escrita a mano) cae en la primera. Nula sin vistas.
 */
export function vistaActiva(
  vistas: readonly VistaDeLaTarjeta[],
  url: { pedida: string | null; panel: string | null },
): string | null {
  const { pedida, panel } = url
  const delPanel = panel === null ? undefined : vistas.find((v) => v.paneles.includes(panel))
  if (delPanel) return delPanel.clave
  const laPedida = vistas.find((v) => v.clave === pedida)
  return (laPedida ?? vistas[0])?.clave ?? null
}
