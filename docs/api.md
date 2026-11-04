# API NovaObra Tienda

Origen local del backend: `http://127.0.0.1:3003/api`; el navegador utiliza el proxy del frontend en 5174. Respuestas JSON; fallos `{ "error": "mensaje" }`. Las escrituras requieren `Content-Type: application/json`, `Origin` igual a `PUBLIC_URL` y `X-NovaObra-Request: 1`. La cookie `novaobra_session` se obtiene al registrar/iniciar sesión, es HttpOnly y no debe copiarse a localStorage.

| Método y ruta relativa a `/api` | Acceso / contenido |
| --- | --- |
| GET `/health`, `/config` | Estado del esquema / datos públicos del negocio |
| GET `/categorias`, `/marcas` | Catálogos activos |
| GET `/productos` | Filtros `q`, `categoria`, `marca`, `min`, `max`, `disponible=1`, `ofertas=1`, `destacado=1`, `orden`, `pagina`; 12 por página |
| GET `/productos/:id` | Producto visible, existencia y precio vigente |
| POST `/auth/registro` | `nombre`, `email`, `password`; crea siempre cliente |
| POST `/auth/login` | `email`, `password`; sesión de ocho horas |
| GET `/auth/yo` | Usuario de la sesión |
| POST `/auth/logout` | Invalida las sesiones de ese usuario |
| PUT `/auth/password` | `actual`, `nueva`; invalida sesiones |
| GET `/pedidos` | Últimos 200 pedidos del propio cliente, con líneas |
| POST `/pedidos` | Cliente; contrato de creación debajo |
| GET `/admin/dashboard` | Administrador/empleado; indicadores reales |
| GET, POST `/admin/productos` | Listar / crear productos |
| PUT `/admin/productos/:id` | Reemplazar campos editables, no stock |
| GET, POST `/admin/categorias`, `/admin/marcas` | Listar / crear taxonomías |
| PUT `/admin/categorias/:id`, `/admin/marcas/:id` | Editar nombre, descripción, estado |
| GET `/admin/inventario` | Últimos 200 movimientos |
| POST `/admin/inventario` | `producto_id`, `cantidad` con signo y `motivo`; sin modificar historial |
| GET `/admin/pedidos`, `/admin/clientes` | Últimos 200 registros |
| PATCH `/admin/pedidos/:id` | `estado`; transiciones controladas |
| GET `/admin/usuarios` | Solo administrador; nunca incluye hashes |
| PATCH `/admin/usuarios/:id` | Solo administrador: `rol_id`, `activo`; no permite cambiar acceso propio |

Creación de pedido o cotización:

```json
{
  "clave": "identificador-unico-de-solicitud",
  "tipo": "pedido",
  "entrega": "retiro",
  "telefono": "telefono-del-cliente",
  "direccion": "",
  "nota": "",
  "lineas": [{ "producto_id": 1, "cantidad": 2 }]
}
```

`clave`: 16–64 letras, números, `_` o `-`, única por cliente. Reenviar la misma clave devuelve el pedido original (200) sin repetir efectos; la creación devuelve 201. No se acepta precio ni costo de entrega como fuente del importe: se consultan en servidor. `tipo=cotizacion` guarda el precio solicitado sin reservar existencias. `entrega=domicilio` exige dirección y configuración `DELIVERY_FEE`. No se procesan pagos.

Estados de pedido: `pendiente → confirmado → preparando → listo → entregado` para retiro, o `preparando → enviado → entregado` para domicilio. Puede cancelarse antes de enviado/entregado. Las cotizaciones solo pasan de pendiente a confirmado o cancelado. Una transición repetida al estado actual es idempotente.

Los productos aceptan `categoria_id`, `marca_id`, `sku`, `nombre`, `descripcion`, `especificaciones`, `imagen` HTTPS, `precio`, `precio_oferta` opcional, `oferta_inicio`, `oferta_fin` UTC ISO, `destacado`, `activo`, `minimo`. El precio promocional exige rango de fechas y ser menor al normal. El alta crea el inventario en cero. Los campos booleanos deben ser JSON boolean y las cantidades enteros.

Fuera de `/api`: `GET /sitemap.xml`, `GET /robots.txt` y el frontend compilado. Los errores de base y contraseñas no se devuelven al navegador. El acceso o registro supera el límite tras 30 solicitudes por IP en 15 minutos; devuelve 429 y `Retry-After`.
