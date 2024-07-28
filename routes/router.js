// routes/records.js
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const fs = require("fs").promises;
const path = require("path");

const axios = require("axios");

// Retrieve all records
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT * FROM TransactionsSecurities");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error retrieving records:", err);
    res.status(500).send("Error retrieving records");
  }
});

// Retrieve record based on Transaction_Number
router.post("/getRecord", async (req, res) => {
  const { transactionNumber } = req.body;

  if (!transactionNumber) {
    return res.status(400).send("Transaction number is required");
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("TransactionNumber", sql.NVarChar, transactionNumber)
      .query(
        "SELECT * FROM TransactionsSecurities WHERE Transaction_No = @TransactionNumber"
      );

    if (result.recordset.length === 0) {
      res.status(404).send("Record not found");
    } else {
      res.json(result.recordset[0]);
    }
  } catch (err) {
    console.error("Error retrieving record:", err);
    res.status(500).send("Error retrieving record");
  }
});

// Delete record by Transaction_Number
router.delete("/:transactionNumber", async (req, res) => {
  const { transactionNumber } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("TransactionNumber", sql.NVarChar, transactionNumber)
      .query(
        "DELETE FROM TransactionsSecurities WHERE Transaction_Number = @TransactionNumber"
      );
    if (result.rowsAffected[0] === 0) {
      res.status(404).send("Record not found");
    } else {
      res.send("Record deleted successfully");
    }
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).send("Error deleting record");
  }
});

// Define the insert query

const insertQuery = `INSERT INTO TransactionsSecurities (Security_ID, ISIN, Coupon_Rate, Maturity_Date, Issue_Date,Transaction_No, Activity, Quantity, Price, Principle,Interest, Net_Amount, Trade_Date, Settlement_Date, Extra_Info)
    VALUES (@Security_ID, @ISIN, @Coupon_Rate, @Maturity_Date, @Issue_Date,@Transaction_No, @Activity, @Quantity, @Price, @Principle, @Interest, @Net_Amount, @Trade_Date, @Settlement_Date, @Extra_Info)`;

// Route to call the Flask API
router.post("/extract", async (req, res) => {
  const { pdfFilePath, jsonFilePath } = req.body;

  if (!pdfFilePath || !jsonFilePath) {
    return res
      .status(400)
      .send("PDF file path and JSON file path are required");
  }

  try {
    // Read the JSON file
    const jsonFileContent = await fs.readFile(
      path.resolve(jsonFilePath),
      "utf-8"
    );
    const jsonData = JSON.parse(jsonFileContent);

    // Send the data to the Flask API
    const response = await axios.post("http://localhost:5000/extract", {
      pdfFilePath: pdfFilePath,
      jsonData: jsonData,
    });

    if (!response.data || response.data.length === 0) {
      return res.status(400).send("No data extracted from the PDF");
    }

    // Forward the extracted data to the store_data route
    const storeResponse = await axios.post(
      "http://localhost:3000/records/store_data",
      response.data
    );
    res.json(storeResponse.data);
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Error processing request");
  }
});

// Route to store data in the database
router.post("/store_data", async (req, res) => {
  const data = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).send("Invalid data format or empty data");
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      const request = new sql.Request(transaction);

      for (const record of data) {
        if (
          !record.Security_ID ||
          !record.Transaction_Number ||
          !record.Quantity ||
          !record.Price
        ) {
          await transaction.rollback();
          return res.status(400).send("Missing required fields in data");
        }

        await request
          .input("Security_ID", sql.VarChar, record.Security_ID)
          .input("ISIN", sql.NVarChar, record.ISIN)
          .input("Coupon_Rate", sql.Decimal(5, 2), record.Coupon_Rate)
          .input("Maturity_Date", sql.Date, record.Maturity_Date)
          .input("Issue_Date", sql.Date, record.Issue_Date)
          .input("Transaction_Number", sql.NVarChar, record.Transaction_Number)
          .input("Activity", sql.NVarChar, record.Activity)
          .input("Quantity", sql.Int, record.Quantity)
          .input("Price", sql.Decimal(10, 2), record.Price)
          .input("Principle", sql.Decimal(10, 2), record.Principle)
          .input("Interest", sql.Decimal(10, 2), record.Interest)
          .input("Net_Amount", sql.Decimal(10, 2), record.Net_Amount)
          .input("Trade_Date", sql.Date, record.Trade_Date)
          .input("Settlement_Date", sql.Date, record.Settlement_Date)
          .query(insertQuery);
      }

      await transaction.commit();
      res.send("Data stored successfully");
    } catch (err) {
      await transaction.rollback();
      console.error("Transaction error:", err);
      res.status(500).send("Error storing data");
    }
  } catch (err) {
    console.error("Error storing data:", err);
    res.status(500).send("Error storing data");
  }
});

module.exports = router;
