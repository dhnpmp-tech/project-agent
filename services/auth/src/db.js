import postgres from "postgres";

const required = (name) => {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
};

export const sql = postgres({
  host: required("PG_HOST"),
  port: Number(process.env.PG_PORT ?? 5432),
  database: required("PG_DATABASE"),
  username: required("PG_USER"),
  password: required("PG_PASSWORD"),
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  // Use prepared statements where it helps; never in transactions
  prepare: true,
});
