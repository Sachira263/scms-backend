const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/menu", require("./routes/menuRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/cashflow", require("./routes/cashFlowRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "SCMS Backend is running" });
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

module.exports = app;




