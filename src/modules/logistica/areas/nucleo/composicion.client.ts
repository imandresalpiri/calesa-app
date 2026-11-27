// Composición del núcleo de `logistica` en el navegador: lo que los componentes de cliente del núcleo leen con la sesión de quien mira. Sólo la importa
// `features/nucleo/`; no sale por la raíz (`composicion.ts` es de servidor).
export { buscarUnidades, NO_SE_BUSCO } from '../../infra/nucleo/buscar-unidades.client'
export type { UnidadBuscada, UnidadesBuscadas } from '../../entities/nucleo/unidad-buscada'
