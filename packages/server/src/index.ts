import { buildServer } from "./server.js";
import { seedGhosts } from "./ghosts.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const seeded = seedGhosts(Date.now());
if (seeded > 0) console.log(`Seeded ${seeded} wandering alchemists.`);

const app = buildServer();
app
  .listen({ port, host })
  .then(() => console.log(`Crucible Critters server listening on http://${host}:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
