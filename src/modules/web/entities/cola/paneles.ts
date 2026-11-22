// Los paneles de Configuración › Cola web. «Agregar a la rueda» (8.04-3) es `?panel=agregar-a-la-rueda&q=<texto>`: el texto busca en el equipo y lo lee la
// página en el servidor. La política y lo de una persona de la rueda son modales (`?panel=politica`; `?panel=editar-en-la-rueda&para=<usuarioId>` y
// `?panel=quitar-de-la-rueda&para=<usuarioId>`).
export const PANEL_AGREGAR_A_LA_RUEDA = 'agregar-a-la-rueda'
export const CLAVE_DE_BUSQUEDA_EN_LA_RUEDA = 'q'
export const PANEL_POLITICA = 'politica'
export const PANEL_EDITAR_EN_LA_RUEDA = 'editar-en-la-rueda'
export const PANEL_QUITAR_DE_LA_RUEDA = 'quitar-de-la-rueda'
// La persona de la rueda a la que se refiere el panel.
export const CLAVE_DE_PERSONA = 'para'
