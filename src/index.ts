import express from "express";
import { Client } from "pg";
import { init } from "./db/init";
import route from "./routes";

export const app = express();

const port = process.env.port || 5000;

const client = new Client({
  database: "dbms_project",
  user: "srivathsan",
  password: "srivathsan",
  host: "localhost",
  port: 5432,
  ssl: false,
});

async function main() {
  // init(client);
  await client.connect();
  route(client);
  app.listen(port, () =>
    console.log(`the app is running at http://localhost:${port}`)
  );
}

main();
