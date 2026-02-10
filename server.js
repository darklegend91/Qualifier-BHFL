const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();

/* ---------- Middlewares ---------- */
app.use(cors());
app.use(express.json({ limit: "10kb" }));

/* ---------- Environment Variables ---------- */
const EMAIL = process.env.OFFICIAL_EMAIL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ---------- Constraints ---------- */
const MAX_FIBONACCI_INPUT = 1000;
const MAX_ARRAY_LENGTH = 1000;
const MAX_ARRAY_VALUE = 1000000;
const MAX_AI_QUESTION_LENGTH = 1000;

/* ---------- Utility Functions ---------- */
const isPrime = (n) => {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a, b) => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b));

const isSafeInteger = (value) =>
  Number.isInteger(value) && Number.isSafeInteger(value);

const validateIntegerArray = (arr, minLength = 1) => {
  if (!Array.isArray(arr)) return { valid: false, error: "Input must be an array" };
  if (arr.length < minLength)
    return { valid: false, error: "Array cannot be empty" };
  if (arr.length > MAX_ARRAY_LENGTH)
    return { valid: false, error: "Array too large" };

  for (let i = 0; i < arr.length; i++) {
    if (!isSafeInteger(arr[i]) || Math.abs(arr[i]) > MAX_ARRAY_VALUE) {
      return { valid: false, error: `Invalid value at index ${i}` };
    }
  }
  return { valid: true };
};

/* ---------- GET /health ---------- */
app.get("/health", (req, res) => {
  if (!EMAIL) {
    return res.status(500).json({ is_success: false });
  }
  res.json({
    is_success: true,
    official_email: EMAIL
  });
});

/* ---------- POST /bfhl ---------- */
app.post("/bfhl", async (req, res) => {
  try {
    if (!EMAIL) {
      return res.status(500).json({ is_success: false });
    }

    const keys = Object.keys(req.body || {});
    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        error: "Request must contain exactly one key"
      });
    }

    const key = keys[0];
    let result;

    /* Fibonacci */
    if (key === "fibonacci") {
      const n = req.body.fibonacci;
      if (!isSafeInteger(n) || n < 0 || n > MAX_FIBONACCI_INPUT) {
        return res.status(400).json({ is_success: false });
      }
      let a = 0, b = 1;
      result = [];
      for (let i = 0; i < n; i++) {
        result.push(a);
        [a, b] = [b, a + b];
      }
    }

    /* Prime */
    else if (key === "prime") {
      const validation = validateIntegerArray(req.body.prime, 0);
      if (!validation.valid) return res.status(400).json({ is_success: false });
      result = req.body.prime.filter(isPrime);
    }

    /* LCM */
    else if (key === "lcm") {
      const validation = validateIntegerArray(req.body.lcm);
      if (!validation.valid) return res.status(400).json({ is_success: false });
      result = req.body.lcm.reduce((a, b) => lcm(a, b));
    }

    /* HCF */
    else if (key === "hcf") {
      const validation = validateIntegerArray(req.body.hcf);
      if (!validation.valid) return res.status(400).json({ is_success: false });
      result = req.body.hcf.reduce((a, b) => gcd(a, b));
    }

    /* AI */
    else if (key === "AI") {
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ is_success: false });
      }

      const question = req.body.AI;
      if (typeof question !== "string" || question.length > MAX_AI_QUESTION_LENGTH) {
        return res.status(400).json({ is_success: false });
      }

      const response = await axios.post(
        GEMINI_URL,
        {
          contents: [
            {
              parts: [
                {
                  text: `Answer in ONE word only: ${question}`
                }
              ]
            }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY
          },
          timeout: 10000
        }
      );

      result =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text
          ?.trim()
          ?.split(/\s+/)[0]
          ?.replace(/[^\w]/g, "") || "Unknown";
    }

    else {
      return res.status(400).json({ is_success: false });
    }

    res.json({
      is_success: true,
      official_email: EMAIL,
      data: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ is_success: false });
  }
});

/* ---------- 404 ---------- */
app.use((req, res) => {
  res.status(404).json({ is_success: false });
});

/* ---------- Server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

module.exports = app;