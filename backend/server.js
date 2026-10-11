import express from "express";
import "dotenv/config";
import caseRoutes from "./routes/caseRoutes.js";

import db from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import dependentRoutes from "./routes/dependentRoutes.js";
import proceedingRoutes from "./routes/proceedingRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import calculatorRoutes from "./routes/calculatorRoutes.js";


import authMiddleware from "./middleware/authMiddleware.js";

const app = express();

const PORT = 5000;
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/dependents", dependentRoutes);
app.use("/api/proceedings", proceedingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/calculator", calculatorRoutes);
app.use("/api/documents", documentRoutes);

app.use("/api/orders", orderRoutes);


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is runing",
  });
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});



app.listen(PORT, () => {
  console.log(`Server is running ${PORT}`);
});
