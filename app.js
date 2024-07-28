// app.js
const express = require("express");
const app = express();
const port = 3000;

const recordsRouter = require("./routes/router");

app.use("/cnf", recordsRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
