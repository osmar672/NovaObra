import dotenv from "dotenv";
dotenv.config({ path: [new URL("../.env", import.meta.url), new URL("../../.env", import.meta.url)], quiet: true });
export function configuration() {
  const database = process.env.DB_NAME || "NovaObraTienda";
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(database))
    throw new Error("DB_NAME no válido.");
  const publicUrl = new URL(process.env.PUBLIC_URL || "http://127.0.0.1:5174");
  if (
    !["http:", "https:"].includes(publicUrl.protocol) ||
    publicUrl.pathname !== "/" ||
    publicUrl.search ||
    publicUrl.hash ||
    publicUrl.username ||
    publicUrl.password
  )
    throw new Error("PUBLIC_URL debe ser un origen HTTP(S).");
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "";
  if (secret.length < 48)
    throw new Error(
      "Configura JWT_SECRET con al menos 48 caracteres aleatorios en .env.",
    );
  const production = process.env.NODE_ENV === "production";
  const port = Number(process.env.PORT || 3003);
  const dbPort = Number(process.env.DB_PORT || 3306);
  for (const [name, value] of [["PORT", port], ["DB_PORT", dbPort]])
    if (!Number.isInteger(value) || value < (name === "PORT" ? 0 : 1) || value > 65535)
      throw new Error(`${name} debe estar entre ${name === "PORT" ? 0 : 1} y 65535.`);
  if (production && publicUrl.protocol !== "https:")
    throw new Error("Producción requiere PUBLIC_URL con HTTPS.");
  const fee = process.env.DELIVERY_FEE;
  if (fee && !/^\d{1,8}(\.\d{1,2})?$/.test(fee))
    throw new Error("DELIVERY_FEE no válido.");
  return {
    database,
    publicUrl: publicUrl.origin,
    secret,
    production,
    host: process.env.HOST || "127.0.0.1",
    port,
    db: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: dbPort,
      user: process.env.DB_USER || "novaobra_tienda",
      password: process.env.DB_PASSWORD || "",
      database,
      decimalNumbers: true,
      timezone: "Z",
      connectionLimit: 10,
      connectTimeout: 10000,
    },
    business: {
      phone: process.env.BUSINESS_PHONE || "",
      whatsapp: (process.env.BUSINESS_WHATSAPP || "").replace(/\D/g, ""),
      email: process.env.BUSINESS_EMAIL || "",
      address: process.env.BUSINESS_ADDRESS || "",
      about: process.env.BUSINESS_ABOUT || "",
      deliveryFee: fee === undefined || fee === "" ? null : Number(fee),
    },
  };
}
