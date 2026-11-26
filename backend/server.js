const env = require("./src/config/env");
const { connectDb } = require("./src/config/db");
const app = require("./src/app");

async function start() {
  await connectDb();
  console.log(`Connected to MongoDB (${env.appEnv})`);

  app.listen(env.port, () => {
    console.log(`TranpTech API listening on port ${env.port} (${env.tz})`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
