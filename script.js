// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropText = document.getElementById('dropText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText = document.getElementById('btnText');
const uploadSection = document.getElementById('uploadSection');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const uploadNewBtn = document.getElementById('uploadNewBtn');

// State
let selectedFile = null;

// Configuration
// In production this script is served from https://ai-powered-ats-cv-analyzer.fly.dev,
// so we call the backend on the same origin to avoid CORS issues.
const BACKEND_API_ENDPOINT = '/api/analyze';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
removeBtn.addEventListener('click', resetUpload);
analyzeBtn.addEventListener('click', analyzeCV);
uploadNewBtn.addEventListener('click', resetUpload);

// Drag and Drop Events
dropZone.addEventListener('dragenter', handleDragEnter);
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-active');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-active');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-active');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validate file type
    if (!VALID_TYPES.includes(file.type) && !file.name.endsWith('.txt')) {
        showError('Please upload a PDF, TXT, or Word document');
        return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showError('File size should be less than 10MB');
        return;
    }
    
    selectedFile = file;
    hideError();
    showFilePreview(file);
    analyzeBtn.disabled = false;
}

function showFilePreview(file) {
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
    filePreview.classList.remove('hidden');
    dropText.textContent = file.name;
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorText.textContent = '';
}

function resetUpload() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropText.textContent = 'Drop your CV here or click to browse';
    analyzeBtn.disabled = true;
    hideError();
    uploadSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

function setLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    
    if (isLoading) {
        btnText.textContent = 'Analyzing...';
        const icon = analyzeBtn.querySelector('.btn-icon');
        icon.classList.add('spin');
    } else {
        btnText.textContent = 'Analyze CV';
        const icon = analyzeBtn.querySelector('.btn-icon');
        icon.classList.remove('spin');
    }
}

// Helper function to extract text from PDF
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Load PDF.js library from CDN if not already loaded
                if (typeof pdfjsLib === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                    script.onload = () => extractPDFText(e.target.result, resolve, reject);
                    script.onerror = () => reject(new Error('Failed to load PDF.js'));
                    document.head.appendChild(script);
                } else {
                    await extractPDFText(e.target.result, resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

async function extractPDFText(arrayBuffer, resolve, reject) {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        resolve(fullText.trim());
    } catch (error) {
        reject(error);
    }
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

async function analyzeCV() {
    if (!selectedFile) return;
    
    setLoading(true);
    hideError();
    
    try {
        // Read file content
        btnText.textContent = 'Processing file...';
        let cvText;
        
        // For text files, read as text. For PDFs, extract text
        if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
            cvText = await readFileAsText(selectedFile);
        } else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
            cvText = await extractTextFromPDF(selectedFile);
        } else {
            showError('Please upload a PDF or TXT file');
            setLoading(false);
            return;
        }
        
        // Prepare the request payload for Groq API
        const payload = {
            model: "llama-3.3-70b-versatile", // or "mixtral-8x7b-32768"
            messages: [
                {
                    role: "system",
                    content: "You are an expert CV/Resume analyzer. Analyze the provided CV and give detailed feedback including ATS score, strengths, weaknesses, improvements, and keyword suggestions. Format your response using markdown with ## for headers, **bold** for important text, and - for bullet points."
                },
                {
                    role: "user",
                    content: `Please analyze this CV and provide detailed insights:\n\n${cvText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 2048
        };
        
        // Send request to Groq API
        btnText.textContent = 'Analyzing CV...';
        console.log('Sending request to backend API...');
        
        const response = await fetch(BACKEND_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cvText })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Analysis failed (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Result:', result);
        
        // Backend already returns { text: analysis }
        showResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred during analysis');
    } finally {
        setLoading(false);
    }
}

// Helper function to generate UUID (no longer needed but kept for compatibility)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function showResults(data) {
    // Extract the text from the response
    let analysisText = '';
    if (data.text) {
        analysisText = data.text;
    } else if (data.answer) {
        analysisText = data.answer;
    } else if (typeof data === 'string') {
        analysisText = data;
    } else {
        analysisText = JSON.stringify(data, null, 2);
    }
    
    // Convert markdown-style text to HTML
    const formattedHTML = formatAnalysisText(analysisText);
    resultsContent.innerHTML = formattedHTML;
    
    uploadSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
}
function formatAnalysisText(text) {
    if (!text) return '<p>No analysis results available.</p>';
    
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers (## Header)
    html = html.replace(/^##\s+(.*?)$/gm, '<h3>$1</h3>');
    
    // Headers (### Subheader)
    html = html.replace(/^###\s+(.*?)$/gm, '<h4>$1</h4>');

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Numbered lists
    html = html.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    
    // Bullet points (- or *)
    html = html.replace(/^[-*]\s+(.*?)$/gm, '<li>$1</li>');

    // Wrap consecutive list items in <ul> or <ol>
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
        const isNumbered = match.match(/^\d+\./);
        const tag = isNumbered ? 'ol' : 'ul';
        return `<${tag}>${match}</${tag}>`;
    });

    // Paragraphs
    html = html
        .split('\n\n')
        .map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<h3>') || p.startsWith('<h4>') || p.startsWith('<ul>') || p.startsWith('<ol>')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        })
        .filter(p => p)
        .join('');

    return html || '<p>Analysis completed successfully.</p>';
}

// Prevent default drag behavior on the document
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

// Add keyboard accessibility
fileInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

analyzeBtn.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !analyzeBtn.disabled) {
        e.preventDefault();
        analyzeCV();
    }
});

// Improve touch device support
if ('ontouchstart' in window) {
    dropZone.style.cursor = 'pointer';
}

// Add loading state management for better UX
window.addEventListener('beforeunload', (e) => {
    if (isProcessing) {
        e.preventDefault();
        e.returnValue = 'Analysis is in progress. Are you sure you want to leave?';
    }
});