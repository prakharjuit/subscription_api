const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Increase payload size limit to handle large datasets
app.use(express.json({ limit: "50mb" }));
app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

// Function to calculate subscription price
function calculateSubscriptionPrice(
  user,
  basePrice,
  pricePerCreditLine,
  pricePerCreditScorePoint
) {
  const subscriptionPrice =
    basePrice +
    pricePerCreditLine * parseInt(user.CreditLines) +
    pricePerCreditScorePoint * parseInt(user.CreditScore);

  return subscriptionPrice;
}

// Endpoint to handle file upload
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const filePath = req.file.path;

  const users = [];
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", (data) => {
      users.push(data);
    })
    .on("end", () => {
      const basePrice = req.body.BasePrice;
      const pricePerCreditLine = req.body.PricePerCreditLine;
      const pricePerCreditScorePoint = req.body.PricePerCreditScorePoint;

      const usersWithPrices = users.map((user) => ({
        ...user,
        SubscriptionPrice: calculateSubscriptionPrice(
          user,
          basePrice,
          pricePerCreditLine,
          pricePerCreditScorePoint
        ),
      }));
      res.json(usersWithPrices);
    })
    .on("error", (err) => {
      console.error("Error parsing CSV:", err);
      res.status(500).send("Error parsing CSV.");
    });
});

// Endpoint to handle subscription price calculation
app.post("/calculate", (req, res) => {
  const { data, BasePrice, PricePerCreditLine, PricePerCreditScorePoint } =
    req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Data is not an array." });
  }

  const calculatedPrices = data.map((user) => {
    const subscriptionPrice = calculateSubscriptionPrice(
      user,
      BasePrice,
      PricePerCreditLine,
      PricePerCreditScorePoint
    );
    return { ...user, SubscriptionPrice: subscriptionPrice };
  });

  res.json(calculatedPrices);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
