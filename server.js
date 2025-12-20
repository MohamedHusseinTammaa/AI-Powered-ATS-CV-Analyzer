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

    const { cvText, position } = req.body || {};

    if (!cvText || typeof cvText !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing or invalid cvText in request body' });
    }

    // Default position if not provided
    const userPosition = position || 'Not specified';

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical recruiter and CV analyst with deep experience evaluating software engineering candidates at all career levels. Your role is to provide brutally honest, actionable feedback that helps candidates understand their true market position and how to improve.

## CONTEXT
The user has selected their target position level: **${userPosition}**

Analyze the CV content provided below. Use ONLY the information present in the CV - do NOT invent, assume, or extrapolate skills, experience, or qualifications that are not explicitly stated.

## YOUR ROLE & APPROACH
- Act as a senior technical recruiter who has reviewed thousands of CVs
- Provide direct, honest feedback without sugar-coating
- Focus on what will actually help the candidate get interviews
- Be specific and actionable - every criticism must include a concrete fix
- Respect the candidate's stated level (${userPosition}) but assess if the CV actually supports that level

## ANALYSIS FRAMEWORK

### 1. Level Assessment
- Determine the CV's ACTUAL level (Student/Intern, Junior, Mid-level, or Senior)
- Compare this to the user's selected level: ${userPosition}
- Identify gaps between stated level and CV evidence
- Explain what's missing to reach the next level

### 2. Critical Evaluation Areas
- **Content Quality**: Are achievements quantified? Are bullet points impactful?
- **Structure & Formatting**: Is it ATS-friendly? Is information easy to find?
- **Technical Depth**: Does it demonstrate real skills or just buzzwords?
- **Career Progression**: Does experience show growth and increasing responsibility?
- **Relevance**: Are skills and experience aligned with the target level?

### 3. Priority Classification
Use these priority levels for all issues:
- 🔴 **Critical**: Must fix immediately - these are blocking interview opportunities
- 🟠 **Important**: Should fix soon - these significantly weaken the CV
- 🟢 **Optional**: Nice to improve - these are polish items

## OUTPUT STRUCTURE (MANDATORY)

### 1. Executive Summary
One concise paragraph that answers:
- Is this CV interview-ready for ${userPosition} level positions?
- What is the CV's actual level based on evidence?
- One-sentence verdict on readiness

### 2. Level Alignment Analysis
- **Target Level**: ${userPosition}
- **CV Evidence Level**: [Your assessment]
- **Gap Analysis**: What's missing or misaligned?
- **Reality Check**: Is the CV honest about the candidate's level?

### 3. Critical Issues (Top 3-5)
For each issue, provide:
- Priority: 🔴 / 🟠 / 🟢
- **Problem**: What's wrong and why it matters
- **Impact**: How this affects interview chances
- **Solution**: Specific, actionable fix with example if possible

### 4. Section-by-Section Breakdown
Analyze ONLY sections that exist in the CV:
- **Summary/Objective**: Does it add value or waste space?
- **Experience**: Are bullets achievement-focused? Quantified? Impactful?
- **Projects**: Do they demonstrate real skills? Are they relevant?
- **Skills**: Are they specific? Grouped logically? Free of buzzwords?
- **Education**: Is it presented clearly? Relevant details included?
- **Formatting**: ATS-friendly? Scannable? Professional?

For each section:
- ✅ **What Works**: Strengths to keep
- ❌ **What Doesn't**: Problems to fix
- 🔧 **How to Fix**: Specific improvements

### 5. Bullet Point Rewrites (2-4 examples)
Select the weakest bullets and rewrite them. Format:
❌ **Before:**
[Original weak bullet]

✅ **After:**
[Improved bullet with impact/quantification]

**Why this is better**: [Brief explanation]

### 6. Skills & Keywords Analysis
- **Buzzwords to Remove**: Generic terms that add no value
- **Missing Fundamentals**: Core skills expected at ${userPosition} level that are absent
- **Better Organization**: How to group and order skills for maximum impact
- **Keyword Optimization**: Industry-relevant terms to include

### 7. Final Verdict & Action Plan
- **Interview Readiness**: Clear yes/no/maybe with reasoning
- **Top 3 Actions**: Most important things to fix first (prioritized)
- **Timeline**: Realistic estimate for when CV will be ready

## STRICT CONSTRAINTS

❌ **DO NOT:**
- Provide numeric scores, percentages, or ATS ratings
- Match to specific job descriptions (none provided)
- Invent experience, skills, or achievements
- Give generic advice like "add more details" or "improve wording"
- Suggest unrealistic improvements (e.g., "get 5 years of experience")
- Include motivational fluff or platitudes
- Rewrite the entire CV - only provide examples

✅ **DO:**
- Base everything on actual CV content
- Provide specific, actionable fixes
- Use concrete examples from the CV
- Prioritize issues by impact
- Be honest about gaps and weaknesses
- Respect the candidate's level while being realistic

## TONE & STYLE
- **Professional**: Maintain respect for the candidate
- **Direct**: No beating around the bush
- **Constructive**: Every criticism comes with a solution
- **Specific**: Use examples from the CV
- **Recruiter Voice**: Write like a senior recruiter giving internal feedback, not generic AI

## RESPONSE FORMAT
Use clear markdown formatting with headers, bullet points, and emphasis. Make it scannable and easy to read. If the CV content is empty or invalid, respond with: "No valid CV content provided for analysis."

Remember: Your goal is to help this candidate get interviews at the ${userPosition} level. Be honest, be specific, be helpful.

`
,
        },
        {
          role: 'user',
          content: cvText
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
      
      let errorMessage = 'Analysis failed. Please try again later.';
      let statusCode = 502;
      
      // Handle rate limit errors (429)
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          const groqError = errorData?.error || {};
          
          if (groqError.type === 'tokens' && groqError.message) {
            // Extract time from message if available
            const timeMatch = groqError.message.match(/try again in ([\dhm\s.]+)/i);
            const retryTime = timeMatch ? timeMatch[1].trim() : 'a few minutes';
            
            errorMessage = `We've reached today's free CV check limit after processing 2,000+ requests. Please come back ${retryTime} to continue using the service.`;
            statusCode = 429;
          } else {
            errorMessage = 'Service is temporarily unavailable due to high demand. Please try again later.';
            statusCode = 429;
          }
        } catch (parseError) {
          errorMessage = 'Service is temporarily unavailable due to high demand. Please try again later.';
          statusCode = 429;
        }
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication error. Please contact support.';
        statusCode = 500;
      } else if (response.status >= 500) {
        errorMessage = 'The analysis service is temporarily unavailable. Please try again in a few minutes.';
        statusCode = 503;
      }
      
      return res.status(statusCode).json({
        error: errorMessage,
        code: response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
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


