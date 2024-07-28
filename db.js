// db.js
const sql = require("mssql");

const dbConfig = {
  user: "your_username",
  password: "your_password",
  server: "your_server",
  database: "your_database",
  options: {
    encrypt: true, // for Azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise,
};
