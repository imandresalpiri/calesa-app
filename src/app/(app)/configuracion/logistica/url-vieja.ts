import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Logística era una página con pestañas (`?seccion=puertos|navieras|categorias-de-gasto`) y después una sección de Configuración con una sub-ruta por catálogo;
// hoy sus catálogos viven en Logística › Configuración. Esos enlaces siguen funcionando: `?seccion=` va a la pestaña del catálogo, con los `?panel=` que traiga
// (las sub-rutas `/configuracion/logistica/<catálogo>` las redirige `next.config.ts`). Un `seccion` que no es un catálogo que la persona
// puede abrir (o ninguno) va al primero, como antes. null si no hay ningún catálogo que abrir. Ningún destino lleva `seccion`: no vuelve a redirigir.
export function destinoDeLaUrlVieja(
  parametros: ParametrosDeLaUrl,
  abiertos: readonly { clave: string; ruta: string }[],
): string | null {
  const pedido = parametros['seccion']
  const destino = abiertos.find((sub) => sub.clave === pedido) ?? abiertos[0]
  return destino === undefined ? null : conParametros(destino.ruta, parametros)
}
