import express from "express";
import path from "node:path";

const port = process.env.PORT || 8001;
const dist = path.join(import.meta.dirname, "dist");

const app = express();

app.use(express.static(dist));
app.use((_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(port, () => {
  console.log(`frontend: http://localhost:${port}`);
});
