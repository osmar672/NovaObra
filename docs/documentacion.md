# Análisis y diseño académico

## Empresa y problema

Ferretería NovaObra comercializa herramientas, materiales de construcción, electricidad y plomería. El registro manual dificulta conciliar existencias, relacionar proveedores y clientes y reconstruir compras y ventas. Los registros duplicados y las operaciones parciales deterioran la confiabilidad de la información.

## Objetivos

Objetivo general: centralizar la administración comercial y el inventario en una aplicación web local con integridad transaccional.

Objetivos específicos: organizar el catálogo por categorías; registrar contactos y personal; mantener cabeceras y detalles de compras y ventas; prevenir stock negativo; conservar una trazabilidad de entradas, salidas y correcciones; proporcionar una API y pantallas para consultar y gestionar los datos.

## Diez tablas

| Tabla                  | Clave primaria    | Propósito y restricciones                                                     |
| ---------------------- | ----------------- | ----------------------------------------------------------------------------- |
| categorias             | id_categoria      | Nombre único, descripción y estado                                            |
| proveedores            | id_proveedor      | Datos de contacto y estado                                                    |
| productos              | id_producto       | Código único, categoría, precios no negativos, stock y umbral                 |
| clientes               | id_cliente        | Datos de compradores                                                          |
| empleados              | id_empleado       | Información laboral, sin credenciales                                         |
| compras                | id_compra         | Proveedor, empleado, fecha, total, estado y clave de solicitud única          |
| detalle_compras        | id_detalle_compra | Producto, cantidad positiva, costo y subtotal generado                        |
| ventas                 | id_venta          | Cliente, empleado, fecha, total, estado y clave de solicitud única            |
| detalle_ventas         | id_detalle_venta  | Producto, cantidad positiva, precio y subtotal generado                       |
| movimientos_inventario | id_movimiento     | Entrada/salida, cantidad positiva, fecha, descripción y clave de ajuste única |

Claves AUTO_INCREMENT, motor InnoDB, caracteres utf8mb4, importes DECIMAL y claves foráneas ON DELETE RESTRICT. Los nombres de contactos no son únicos: distintas personas pueden compartir nombre. Los detalles impiden repetir un producto dentro de una operación. `clave_solicitud` es opcional para clientes API; su uso es obligatorio en la interfaz para evitar duplicados por reintentos. No hay una tabla adicional de usuarios o sesiones.

## Cardinalidades

Todas las relaciones siguientes son 1 a 0..N: el padre puede existir sin hijos y cada hijo tiene exactamente un padre obligatorio.

1. categorias → productos.
2. proveedores → compras.
3. empleados → compras.
4. clientes → ventas.
5. empleados → ventas.
6. compras → detalle_compras.
7. productos → detalle_compras.
8. ventas → detalle_ventas.
9. productos → detalle_ventas.
10. productos → movimientos_inventario.

Una operación confirmada requiere al menos un detalle por regla de servicio. Un borrador puede estar vacío. Los movimientos se relacionan con productos; la descripción identifica la operación que los originó. No se usan borrados en cascada. El diagrama con atributos se encuentra en `diagrama_ER.mmd`; `diagrama_ER.drawio` contiene una vista de relaciones editable en draw.io. El formato Mermaid es importable desde draw.io mediante Insertar → Avanzado → Mermaid (según versión).

## Normalización

Primera forma normal: atributos atómicos, una fila por entidad o detalle. Segunda: categorías, personas y productos se separan de los detalles; las líneas contienen sus atributos propios. Tercera: los datos de contacto, nombres y clasificación no se repiten en las cabeceras o líneas. Los precios de línea son valores históricos propios de la transacción y no dependen del precio actual del catálogo.

Se conservan total, subtotal y stock como valores derivados controlados: subtotal es una columna generada; total se recalcula en la transacción; stock se actualiza junto con su movimiento bajo bloqueo. Esto constituye una desnormalización controlada de los saldos para facilitar las consultas, explícita y limitada a cálculos operativos.

## Reglas transaccionales

- Crear o editar un borrador guarda cabecera y detalles en una sola transacción.
- Consultar una compra o venta recupera cabecera y líneas con una sola consulta SQL, de modo que los totales y detalles pertenecen a la misma instantánea aunque otro cliente esté editando el borrador.
- Editar detalles individuales bloquea primero su cabecera; las operaciones confirmadas o canceladas no admiten cambios.
- Confirmar bloquea la cabecera y los productos en orden ascendente, verifica stock y aplica entradas/salidas con sus movimientos antes de COMMIT.
- Cancelar un borrador solo cambia el estado. Cancelar una operación confirmada registra movimientos inversos; no borra movimientos históricos.
- Si falta stock para cancelar una compra, se rechaza y todo permanece igual.
- Confirmación y cancelación repetidas no vuelven a tocar el stock. Una operación cancelada no se puede confirmar.
- Una clave de solicitud duplicada produce 409; el cliente consulta el registro existente antes de decidir otro intento.
- Un fallo de integridad o negocio produce ROLLBACK, incluyendo movimientos y stock ya procesados.
- Los ajustes manuales bloquean el producto, validan stock y registran el cambio en una sola transacción.
- Los movimientos no se editan ni eliminan; se corrigen mediante un ajuste inverso documentado.

La moneda de presentación es el colón costarricense (CRC), con dos decimales y sin impuestos, descuentos ni crédito: estos conceptos no se pidieron. Las cantidades son unidades enteras. Los registros de prueba usan contactos ficticios de example.com.

## Arquitectura

Navegador → React/Fetch → Express REST → mysql2/promise → MySQL 8. Los módulos de backend separan configuración, modelos de campos, controladores CRUD, rutas, validadores, servicios comerciales y manejo central de errores. El servidor verifica MySQL antes de aceptar solicitudes. La interfaz consulta datos reales, sin sustitutos simulados. Al navegar cancela las lecturas pendientes y comprueba la versión de la pantalla antes de aplicar sus resultados, mensajes o formularios. Las escrituras que el servidor pudo haber recibido no se cancelan: su resultado solo actualiza la vista que las inició si sigue activa.

## Fases implementadas

1. Análisis y modelado: este documento y diagrama.
2. MySQL: esquema y semilla.
3. Backend inicial: conexión y CRUD productos, incluidos POST y GET del día 1.
4. Backend completo: diez recursos y transiciones comerciales.
5. Frontend: dashboard, navegación y pantallas administrativas.
6. Integración: llamadas reales a Express desde React y proxy Vite.
7. Pruebas: ejecutores y resultados en `pruebas.md`.
8. Entrega: documentación, colección Postman y empaquetador reproducible.

Las capacidades verificadas y las pendientes se detallan en el informe de pruebas. La ausencia de autenticación corresponde a la actividad académica y no al diseño de un servicio público.

## Ampliación funcional

Se añaden reportes por fechas, lista de reposición, comprobantes imprimibles, exportaciones CSV y consultas paginadas con nombres relacionados. No se altera el esquema de diez tablas. Las consultas de reportes y de páginas con su total usan una instantánea de lectura coherente para evitar resultados de momentos distintos.

La ganancia es una estimación comercial a costo actual, no un cálculo histórico del costo de ventas. El umbral de reposición se supera con una unidad adicional. Los comprobantes son internos y conservan el estado comercial. Los respaldos usan clientes MySQL 8 y un formato SQL controlado que permite restaurar solo el esquema esperado y sus datos en un destino sin tablas ni vistas.
