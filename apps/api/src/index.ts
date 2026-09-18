import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { catalogRouter } from "./routes/catalog.js";
import { checkoutRouter } from "./routes/checkout.js";
import { ordersRouter } from "./routes/orders.js";
import { authRouter } from "./routes/auth.js";
import { paymentsRouter } from "./routes/payments.js";
import { adminRouter } from "./routes/admin.js";
import { createSocketServer } from "./realtime/socket.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(
  cors({
    origin: [env.WEB_ORIGIN, env.ADMIN_ORIGIN],
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);

const io = await createSocketServer(httpServer);
app.set("io", io);

httpServer.listen(env.API_PORT, () => {
  console.log(`API listening on :${env.API_PORT}`);
});
