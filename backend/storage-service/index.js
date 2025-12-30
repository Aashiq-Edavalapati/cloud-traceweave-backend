import express from "express";
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: process.env.SERVICE_NAME, status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${process.env.SERVICE_NAME} running on ${PORT}`);
});
