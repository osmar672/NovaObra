import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
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
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const cert=process.env.TLS_CERT_PATH,key=process.env.TLS_KEY_PATH;
  if(Boolean(cert)!==Boolean(key))throw new Error('Configura TLS_CERT_PATH y TLS_KEY_PATH juntos.');
  const host=process.env.HOST||'127.0.0.1';
  const trustProxy=process.env.TRUST_PROXY==='loopback';
  if(process.env.TRUST_PROXY&&!trustProxy)throw new Error('TRUST_PROXY solo permite loopback.');
  if(trustProxy&&!['127.0.0.1','::1'].includes(host))throw new Error('El proxy requiere HOST de loopback.');
  if(production&&!cert&&!trustProxy)throw new Error('Producción requiere TLS nativo o TRUST_PROXY=loopback detrás de HTTPS.');
  if(cert&&publicUrl.protocol!=='https:')throw new Error('TLS requiere PUBLIC_URL=https://...');
  const redirectPort=process.env.HTTP_REDIRECT_PORT?Number(process.env.HTTP_REDIRECT_PORT):null;
  if(redirectPort!==null&&(!cert||!Number.isInteger(redirectPort)||redirectPort<1||redirectPort>65535||redirectPort===port))throw new Error('HTTP_REDIRECT_PORT requiere TLS y un puerto distinto válido.');
  const accessTokenSeconds=Number(process.env.ACCESS_TOKEN_TTL_SECONDS||900);
  const refreshTokenSeconds=Number(process.env.REFRESH_TOKEN_TTL_SECONDS||604800);
  if(!Number.isInteger(accessTokenSeconds)||accessTokenSeconds<30||accessTokenSeconds>3600)throw new Error('ACCESS_TOKEN_TTL_SECONDS: 30 a 3600.');
  if(!Number.isInteger(refreshTokenSeconds)||refreshTokenSeconds<86400||refreshTokenSeconds>2592000)throw new Error('REFRESH_TOKEN_TTL_SECONDS: 86400 a 2592000.');
  const fee = process.env.DELIVERY_FEE;
  if (fee && !/^\d{1,8}(\.\d{1,2})?$/.test(fee))
    throw new Error("DELIVERY_FEE no válido.");
  return {
    accessTokenSeconds,refreshTokenSeconds,trustProxy,redirectPort,
    tls:cert?{cert:resolve(root,cert),key:resolve(root,key)}:null,
    secureCookies:publicUrl.protocol==='https:',
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
