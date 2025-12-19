require('dotenv').config();

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Load Groq API key from environment variable for security
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.warn(
    'Warning: GROQ_API_KEY environment variable is not set. ' +
      'The /api/analyze endpoint will return an error until it is configured.'
  );
}

// CORS: allow frontend to call this API from other origins
app.use(
  cors({
    origin: '*', // you can replace '*' with your specific frontend origin for more security
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '11mb' }));

// Serve static files (frontend) from the project root
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main analyze endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res
        .status(500)
        .json({ error: 'Server is not configured with GROQ_API_KEY' });
    }

    const { cvText } = req.body || {};

    if (!cvText || typeof cvText !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing or invalid cvText in request body' });
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an AI-powered CV Analyzer and ATS (Applicant Tracking System) evaluator.

The retrieved documents below contain a candidate's CV extracted from a PDF.
Use them as the ONLY source of information.

Your tasks:
1. Analyze the CV content.
2. Assign an ATS compatibility score from 0 to 100.
3. Identify strengths and weaknesses.
4. Provide clear, actionable recommendations to improve ATS performance.
5. Do NOT invent skills, experience, or qualifications.
6. Do NOT rewrite the entire CV unless explicitly requested.

If no CV content is provided, respond with exactly:
"No CV content provided"

Use professional, concise, and structured language.

Respond using the following format ONLY:

ATS Score: XX / 100

Strengths:
- Bullet points

Weaknesses:
- Bullet points

Improvements:
- Bullet points with examples

(Optional) Keyword Suggestions:
- Bullet list`,
        },
        {
          role: 'user',
          content: cvText,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    };

    const response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return res.status(502).json({
        error: 'Analysis failed',
        status: response.status,
        details: errorText,
      });
    }

    const result = await response.json();
    const analysis = result?.choices?.[0]?.message?.content || '';

    res.json({ text: analysis });
  } catch (err) {
    console.error('Unexpected error in /api/analyze:', err);
    res
      .status(500)
      .json({ error: 'Internal server error while analyzing CV' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


