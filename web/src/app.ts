import express from "express";
import buildRoutes from "./routes/build.route"

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"))

app.get("/api/health", (req, res) => {
  res.json({status: "ok"});
});

app.use("/api/v2/builds/", buildRoutes);

export default app;