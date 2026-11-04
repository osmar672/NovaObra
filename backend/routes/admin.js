import { Router } from "express";
import {
  check,
  text,
  id,
  integer,
  flag,
  transaction,
} from "../lib/validation.js";
import { catalog, saveProduct } from "../services/catalog.js";
import { orders, transition } from "../services/orders.js";
export function adminRoutes(pool, access) {
  const router = Router();
  router.use(...access.roles("administrador", "empleado"));
  router.get("/dashboard", async (req, res) => {
    const [[stats]] = await pool.query(
      "SELECT (SELECT COUNT(*) FROM productos WHERE activo=1) AS productos,(SELECT COUNT(*) FROM pedidos WHERE tipo='pedido' AND estado IN ('pendiente','confirmado','preparando','listo','enviado')) AS pendientes,(SELECT COUNT(*) FROM inventario WHERE existencia<=minimo) AS bajos,(SELECT COALESCE(SUM(d.cantidad*d.precio_unitario),0) FROM detalle_pedidos d JOIN pedidos p ON p.id=d.pedido_id WHERE p.tipo='pedido' AND p.estado='entregado') AS ventas",
    );
    const [top] = await pool.query(
      "SELECT pr.nombre,SUM(d.cantidad) AS unidades,SUM(d.cantidad*d.precio_unitario) AS total FROM detalle_pedidos d JOIN pedidos p ON p.id=d.pedido_id JOIN productos pr ON pr.id=d.producto_id WHERE p.tipo='pedido' AND p.estado='entregado' GROUP BY pr.id ORDER BY unidades DESC LIMIT 5",
    );
    const [low] = await pool.query(
      "SELECT p.id,p.nombre,i.* FROM inventario i JOIN productos p ON p.id=i.producto_id WHERE i.existencia<=i.minimo ORDER BY i.existencia LIMIT 100",
    );
    res.json({ ...stats, top, bajoInventario: low });
  });
  router.get("/productos", async (req, res) =>
    res.json(await catalog(pool, req.query, true)),
  );
  router.post("/productos", async (req, res) =>
    res.status(201).json(await saveProduct(pool, req.body)),
  );
  router.put("/productos/:id", async (req, res) =>
    res.json(await saveProduct(pool, req.body, id(req.params.id))),
  );
  for (const table of ["categorias", "marcas"]) {
    router.get(`/${table}`, async (req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY nombre`);
      res.json(rows);
    });
    router.post(`/${table}`, async (req, res) => {
      const [r] = await pool.execute(
        `INSERT INTO ${table} (nombre,descripcion,activo) VALUES (?,?,?)`,
        [
          text(req.body.nombre, "Nombre", 100),
          text(req.body.descripcion || "", "Descripción", 500, false),
          flag(req.body.activo, true),
        ],
      );
      res.status(201).json({ id: r.insertId });
    });
    router.put(`/${table}/:id`, async (req, res) => {
      const [r] = await pool.execute(
        `UPDATE ${table} SET nombre=?,descripcion=?,activo=? WHERE id=?`,
        [
          text(req.body.nombre, "Nombre", 100),
          text(req.body.descripcion || "", "Descripción", 500, false),
          flag(req.body.activo, true),
          id(req.params.id),
        ],
      );
      check(r.affectedRows, "Registro no encontrado.", 404);
      res.json({ ok: true });
    });
  }
  router.get("/pedidos", async (req, res) =>
    res.json(await orders(pool, req.user, true)),
  );
  router.patch("/pedidos/:id", async (req, res) =>
    res.json(
      await transition(pool, req.user, id(req.params.id), req.body.estado),
    ),
  );
  router.get("/inventario", async (req, res) => {
    const [rows] = await pool.query(
      "SELECT m.*,p.nombre,u.nombre AS responsable FROM movimientos_inventario m JOIN productos p ON p.id=m.producto_id JOIN usuarios u ON u.id=m.usuario_id ORDER BY m.id DESC LIMIT 200",
    );
    res.json(rows);
  });
  router.post("/inventario", async (req, res) => {
    const product = id(req.body.producto_id),
      quantity = integer(req.body.cantidad, "Cantidad", -100000, 100000),
      reason = text(req.body.motivo, "Motivo", 200);
    check(quantity !== 0, "La cantidad no puede ser cero.");
    await transaction(pool, async (c) => {
      const [[row]] = await c.execute(
        "SELECT existencia FROM inventario WHERE producto_id=? FOR UPDATE",
        [product],
      );
      check(row, "Producto no encontrado.", 404);
      check(
        row.existencia + quantity >= 0,
        "La salida supera las existencias.",
        409,
      );
      await c.execute(
        "UPDATE inventario SET existencia=existencia+? WHERE producto_id=?",
        [quantity, product],
      );
      await c.execute(
        "INSERT INTO movimientos_inventario (producto_id,usuario_id,cantidad,motivo) VALUES (?,?,?,?)",
        [product, req.user.id, quantity, reason],
      );
    });
    res.status(201).json({ ok: true });
  });
  router.get("/clientes", async (req, res) => {
    const [rows] = await pool.query(
      "SELECT c.*,u.nombre,u.email,u.activo FROM clientes c JOIN usuarios u ON u.id=c.usuario_id ORDER BY c.id DESC LIMIT 200",
    );
    res.json(rows);
  });
  router.get(
    "/usuarios",
    ...access.roles("administrador"),
    async (req, res) => {
      const [rows] = await pool.query(
        "SELECT u.id,u.nombre,u.email,u.rol_id,u.activo,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id ORDER BY u.id DESC LIMIT 200",
      );
      res.json(rows);
    },
  );
  router.patch(
    "/usuarios/:id",
    ...access.roles("administrador"),
    async (req, res) => {
      const target = id(req.params.id),
        role = integer(req.body.rol_id, "Rol", 1, 3);
      check(target !== req.user.id, "No puedes cambiar tu propio acceso.");
      await transaction(pool, async (c) => {
        // All role changes lock this shared role row to serialize last-admin checks.
        await c.query("SELECT id FROM roles WHERE id=1 FOR UPDATE");
        const [[person]] = await c.execute(
          "SELECT rol_id,activo FROM usuarios WHERE id=? FOR UPDATE",
          [target],
        );
        check(person, "Usuario no encontrado.", 404);
        const active = flag(req.body.activo, true);
        if (person.rol_id === 1 && person.activo && (role !== 1 || !active)) {
          const [[count]] = await c.query(
            "SELECT COUNT(*) AS n FROM usuarios WHERE rol_id=1 AND activo=1",
          );
          check(
            count.n > 1,
            "Debe quedar al menos un administrador activo.",
            409,
          );
        }
        await c.execute(
          "UPDATE usuarios SET rol_id=?,activo=?,version_sesion=version_sesion+1 WHERE id=?",
          [role, active, target],
        );
        if (role === 3)
          await c.execute(
            "INSERT IGNORE INTO clientes (usuario_id) VALUES (?)",
            [target],
          );
      });
      res.json({ ok: true });
    },
  );
  return router;
}
