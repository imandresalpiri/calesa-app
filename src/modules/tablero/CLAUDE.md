# tablero

Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública.

Abierto: **9-14a** (la dueña no actúa sobre un lead ajeno sin tenerlo; `docs/PENDIENTES.md`).

## Entra y sale

- Entra: permisos del usuario, `?periodo=`, la preferencia `tablero.widgets` y el Modo Live (`live`).
- Sale: `<Bandeja>` para `/` (`pantallas/inicio.ts`) y `<PanelDelTablero>` para `/tablero` (`pantallas/tablero.ts`); `index.ts` no exporta nada.
- Depende, por su entrada, de `leads`, `agenda`, `equipo`, `logistica`, `web` y `repuestos`.

## Archivos clave

- `entities/bandeja.ts` — `BLOQUES_BANDEJA` (cada bloque con sus permisos), `TOPE_DE_BLOQUE` (5: pide 6 y dice «5» o «más de 5»).
- `features/bandeja/bloques/<clave>.tsx` y `features/metricas/widgets/<clave>.tsx` — **un archivo por bloque o widget**, unidos por su `registro.ts`
  (un `Record` que exige todas las claves): quien llena un hueco edita sólo su archivo. Cada uno lee por la entrada pública del módulo dueño, tras su
  propio `<Suspense>` con `await connection()` (uno lento o caído no frena a los demás), con estado de error («Reintentar») y vacío. `<LimiteDeBloque>`
  envuelve cada `<Suspense>`: un bloque que se rompe al dibujarse deja su marco con el error y «Reintentar», nunca la pantalla entera. «Ver todos» / «Ver todas»
  (`BloqueBandeja.verTodos`, `<VerTodasDelBloque>`) lo dibuja cada bloque sólo cuando llegó a su tope (`hayMas`) y quien mira puede abrir el destino
  (`ContextoDeBloque.permisos`); «Turnos de la web» abre el panel `?panel=turnos` de `web`. El título del bloque lo pone el marco, no el bloque.
- `entities/widgets.ts` — `WIDGETS_TABLERO` (permisos, grupo de RPC, tamaño). `entities/cifras.ts`: una tasa nula es «Sin datos», nunca «0 %»; un margen
  nulo, «Sin venta registrada».
- `infra/queries/metricas.ts` — una RPC por grupo de widgets, ventana ≤ 366 días: `tablero_leads` y `tablero_cotizaciones` (`tablero.metricas.ver`),
  `tablero_margen` (`logistica.margen.ver`, sólo sus orígenes, en moneda base), `tablero_cola_web` (`web.cola.gestionar`). «Convertidos» sale de
  `leads.cliente_desde` (sin grant: la leen esas RPC).
- Cada cifra es un `role="group"` «Título: valor»; una de dinero (`cifra-de-monto`) lleva en el nombre sólo el título, y el monto por `<Monto>`, para que
  el Modo Live (que quita la moneda por CSS) no la deje en el nombre. Una gráfica (HTML y SVG de servidor) es `role="img"`. «Ver como tabla» (`graficas/ver-como-tabla.tsx`, el único
  cliente de un widget) abre un modal en `?panel=tabla&grafica=<clave del widget>` con la `<TablaEquivalente>` que dibujó el servidor y le pasa como hijo;
  sólo abre el widget cuya clave es la de la URL, y el modal (`modal-de-la-tabla.tsx`) va por `diferido()`.
- «Personalizar» (`?panel=personalizar`): guarda al cambiar con `guardarPreferencia`; «Restablecer» manda `null`; sólo ofrece lo que
  `widgetsVisibles(permisos)` deja ver.
- **Modo Live** (glosario): `/tablero` sale con «Inicio y Tablero» de sus ajustes y recibe `live` (`LiveDelTablero`, la forma de `EstadoDelLive` sin
  importar `equipo`). `widgetsVisibles(permisos, live)` deja sólo `WIDGETS_DEL_LIVE` (los cuatro `cotizaciones-*`) si sus ajustes muestran las
  cotizaciones, y «Cotizaciones por origen» sólo con todos los orígenes a la vista (nombra los demás). Sin «Personalizar» y sin aplicar la preferencia;
  sin ninguno, «En el Modo Live, el Tablero muestra sólo las métricas de cotizaciones.». Las cifras son de los orígenes que quien mira ve de verdad (la
  RPC no filtra por los del Live).

## Tablas

Ninguna propia. Lee `preferencias_usuario` (equipo) y las vistas/RPC de los otros módulos.

## No se rompe

- La bandeja se arma por permisos, nunca por nombre de rol; un bloque nuevo declara sus permisos en `BLOQUES_BANDEJA`. Un bloque declara sólo las
  claves cuyo contenido su lectura puede traer (si no, saldría vacío siempre). `e2e/inicio-por-rol.spec.ts` recorre cada rol de referencia.
- Cada contador de la bandeja lleva a la lista ya filtrada (misma URL con `nuqs`).
- Un widget se muestra sólo con su permiso; sin datos, el estado vacío con la acción que lo llena.
- Métricas de dinero pasan por `<Monto>` (Modo Live).

## Ojo

- Las gráficas usan la escala de `--viz-*` de `design/tokens.css`; nunca colores sueltos.
