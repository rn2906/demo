const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let shouldCancel = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEvent = (res, event) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};

app.get("/start-sequence", async (req, res) => {
  shouldCancel = false;
  console.log("Sequence started");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const baseUrl = "http://localhost:3001";
    const refererUrl = `${baseUrl}/start-sequence`;

    sendEvent(res, {
      status: "Starting",
      route: "Route 1",
      message: "Starting Route 1",
      progress: 0,
    });

    let response = await axios.get(`${baseUrl}/route1`, {
      headers: {
        Referer: refererUrl,
      },
    });
    if (shouldCancel) throw new Error("Cancelled at Route 1");
    console.log(response.data);
    sendEvent(res, {
      status: "Processing",
      route: "Route 1",
      message: response.data,
      progress: 12.5,
    });

    sendEvent(res, {
      status: "Starting",
      route: "Route 2",
      message: "Starting Route 2",
      progress: 12.5,
    });
    await delay(1000);
    response = await axios.get(`${baseUrl}/route2`, {
      headers: {
        Referer: refererUrl,
      },
    });
    if (shouldCancel) throw new Error("Cancelled at Route 2");
    console.log(response.data);
    sendEvent(res, {
      status: "Processing",
      route: "Route 2",
      message: response.data,
      progress: 25,
    });

    sendEvent(res, {
      status: "Starting",
      route: "Route 3",
      message: "Starting Route 3",
      progress: 25,
    });
    await delay(1000);
    response = await axios.get(`${baseUrl}/route3`, {
      headers: {
        Referer: refererUrl,
      },
    });
    if (shouldCancel) throw new Error("Cancelled at Route 3");
    console.log(response.data);
    sendEvent(res, {
      status: "Processing",
      route: "Route 3",
      message: response.data,
      progress: 37.5,
    });

    sendEvent(res, {
      status: "Starting",
      route: "Route 4",
      message: "Starting Route 4",
      progress: 37.5,
    });
    await delay(1000);
    response = await axios.get(`${baseUrl}/route4`, {
      headers: {
        Referer: refererUrl,
      },
    });
    if (shouldCancel) throw new Error("Cancelled at Route 4");
    console.log(response.data);
    sendEvent(res, {
      status: "Processing",
      route: "Route 4",
      message: response.data,
      progress: 50,
    });

    sendEvent(res, {
      status: "Completed",
      route: "Route 4",
      message: "Reached Route 4",
      progress: 100,
    });
  } catch (error) {
    console.log(error.message);
    sendEvent(res, {
      status: "Cancelled",
      route: error.message.split(" ")[2],
      message: error.message,
      progress: 0,
    });
    res.end();
  }
});

app.get("/cancel-sequence", (req, res) => {
  shouldCancel = true;
  console.log("Sequence cancel requested");
  console.log("Referrer:", req.get("referer"));
  res.send("Cancel request received");
});

app.get("/route1", (req, res) => {
  console.log("I am route 1");
  console.log("Referrer:", req.get("referer"));
  res.send("Route 1 response");
});

app.get("/route2", (req, res) => {
  console.log("I am route 2");
  console.log("Referrer:", req.get("referer"));
  res.send("Route 2 response");
});

app.get("/route3", (req, res) => {
  console.log("I am route 3");
  console.log("Referrer:", req.get("referer"));
  res.send("Route 3 response");
});

app.get("/route4", (req, res) => {
  console.log("I am route 4");
  console.log("Referrer:", req.get("referer"));
  res.send("Route 4 response");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
