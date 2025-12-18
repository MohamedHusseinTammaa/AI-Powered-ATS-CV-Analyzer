require('dotenv').config();

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

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
          content:
            'You are an expert CV/Resume analyzer. Analyze the provided CV and give detailed feedback including ATS score, strengths, weaknesses, improvements, and keyword suggestions. Format your response using markdown with ## for headers, **bold** for important text, and - for bullet points.',
        },
        {
          role: 'user',
          content: `Please analyze this CV and provide detailed insights:\n\n${cvText}`,
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


