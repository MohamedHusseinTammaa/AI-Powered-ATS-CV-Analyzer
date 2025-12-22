// DOM Elements
const positionSection = document.getElementById('positionSection');
const positionButtons = document.querySelectorAll('.position-btn');
const selectedPositionDiv = document.getElementById('selectedPosition');
const selectedPositionText = document.getElementById('selectedPositionText');
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
const jobRequirementsInput = document.getElementById('jobRequirements');
const compareBtn = document.getElementById('compareBtn');
const compareStatus = document.getElementById('compareStatus');
const compareResults = document.getElementById('compareResults');

// State
let selectedFile = null;
let selectedPosition = null;
let lastCvText = null;

// Backend endpoint - change this based on your environment
// For production (Fly.io):
//const BACKEND_API_ENDPOINT = 'https://ai-powered-ats-cv-analyzer.fly.dev/api/analyze';
// For local development, uncomment the line below and comment the one above:
const BACKEND_API_ENDPOINT = 'http://localhost:3000/api/analyze';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Event Listeners
// Position selection
positionButtons.forEach(btn => {
    btn.addEventListener('click', () => handlePositionSelect(btn));
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
removeBtn.addEventListener('click', resetUpload);
analyzeBtn.addEventListener('click', analyzeCV);
uploadNewBtn.addEventListener('click', resetUpload);
compareBtn.addEventListener('click', compareWithJob);

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

async function compareWithJob() {
    const jobReq = (jobRequirementsInput.value || '').trim();
    if (!jobReq) {
        showError('Please paste a job description to compare.');
        return;
    }
    if (!lastCvText) {
        showError('Please analyze a CV first before comparing.');
        return;
    }

    compareBtn.disabled = true;
    compareStatus.textContent = 'Comparing...';
    compareResults.innerHTML = '';
    hideError();

    try {
        const response = await fetch(`${BACKEND_API_ENDPOINT.replace('/api/analyze', '')}/api/compare`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cvText: lastCvText,
                jobRequirements: jobReq,
                position: selectedPosition || 'Not specified'
            })
        });

        if (!response.ok) {
            let errorMessage = 'Comparison failed. Please try again.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (err) {
                // fallback
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        const formatted = formatAnalysisText(result.text || result.answer || JSON.stringify(result));
        compareResults.innerHTML = formatted;
    } catch (err) {
        showError(err.message || 'Comparison failed. Please try again later.');
    } finally {
        compareBtn.disabled = false;
        compareStatus.textContent = '';
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

function handlePositionSelect(button) {
    // Remove selected class from all buttons
    positionButtons.forEach(btn => btn.classList.remove('selected'));
    
    // Add selected class to clicked button
    button.classList.add('selected');
    
    // Store selected position
    selectedPosition = button.getAttribute('data-position');
    selectedPositionText.textContent = selectedPosition;
    selectedPositionDiv.classList.remove('hidden');
    
    // Show upload section after a short delay for smooth transition
    setTimeout(() => {
        positionSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }, 300);
}

function resetUpload() {
    selectedFile = null;
    selectedPosition = null;
    lastCvText = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropText.textContent = 'Drop your CV here or click to browse';
    analyzeBtn.disabled = true;
    hideError();
    
    // Reset position selection
    positionButtons.forEach(btn => btn.classList.remove('selected'));
    selectedPositionDiv.classList.add('hidden');
    
    // Show position section, hide upload and results
    positionSection.classList.remove('hidden');
    uploadSection.classList.add('hidden');
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
    
    // Validate position is selected
    if (!selectedPosition) {
        showError('Please select your experience level first');
        return;
    }
    
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

        // Keep a copy for later job comparison
        lastCvText = cvText;
        
        // Send request to backend API with CV text and position
        btnText.textContent = 'Analyzing CV...';
        console.log('Sending request to backend API...');
        
        const response = await fetch(BACKEND_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cvText, position: selectedPosition })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            let errorMessage = 'An error occurred during analysis. Please try again.';
            
            try {
                const errorData = await response.json();
                // Backend returns user-friendly error messages
                if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (parseError) {
                // If response is not JSON, try to get text
                try {
                    const errorText = await response.text();
                    console.error('Error response (text):', errorText);
                    
                    // Try to parse if it's JSON string
                    try {
                        const parsed = JSON.parse(errorText);
                        errorMessage = parsed.error || parsed.message || errorMessage;
                    } catch {
                        // If not JSON, use a generic message based on status
                        if (response.status === 429) {
                            errorMessage = "We've reached today's free CV check limit. Please come back tomorrow to continue using the service.";
                        } else if (response.status >= 500) {
                            errorMessage = 'The service is temporarily unavailable. Please try again in a few minutes.';
                        } else if (response.status === 400) {
                            errorMessage = 'Invalid request. Please check your CV file and try again.';
                        }
                    }
                } catch (textError) {
                    console.error('Could not read error response:', textError);
                    // Use default error message based on status code
                    if (response.status === 429) {
                        errorMessage = "We've reached today's free CV check limit. Please come back tomorrow to continue using the service.";
                    } else if (response.status >= 500) {
                        errorMessage = 'The service is temporarily unavailable. Please try again in a few minutes.';
                    }
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Result:', result);
        
        // Backend already returns { text: analysis }
        showResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Handle network errors (fetch failed completely)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Unable to connect to the server. Please check your internet connection and try again.');
        } else {
            // Display user-friendly error message
            showError(error.message || 'An unexpected error occurred. Please try again later.');
        }
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
    
    // Split into lines for processing
    const lines = text.split('\n');
    let result = [];
    let currentPriority = null;
    let currentPriorityItems = [];
    let currentBeforeAfter = null;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            // Flush any pending items
            if (currentPriorityItems.length > 0) {
                const priorityClass = currentPriority === '🔴' ? 'priority-critical' : 
                                    currentPriority === '🟠' ? 'priority-important' : 'priority-optional';
                result.push(`<div class="priority-item ${priorityClass}">`);
                result.push(`<span class="priority-icon">${currentPriority}</span>`);
                result.push('<div class="priority-content">');
                result.push(...currentPriorityItems);
                result.push('</div></div>');
                currentPriorityItems = [];
                currentPriority = null;
            }
            if (currentBeforeAfter) {
                result.push('</div></div></div>');
                currentBeforeAfter = null;
            }
            continue;
        }
        
        // Escape HTML
        line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Numbered section headers (1. Executive Summary)
        if (/^\d+\.\s+[A-Z]/.test(line)) {
            const match = line.match(/^(\d+)\.\s+(.+)$/);
            if (match) {
                result.push(`<h2 class="section-header">${match[1]}. ${match[2]}</h2>`);
                continue;
            }
        }
        
        // Priority: 🔴/🟠/🟢
        if (/^Priority:\s*(🔴|🟠|🟢)/.test(line)) {
            const match = line.match(/Priority:\s*(🔴|🟠|🟢)/);
            if (match) {
                currentPriority = match[1];
                continue;
            }
        }
        
        // Problem/Impact/Solution after Priority
        if (currentPriority) {
            if (/^-\s*Problem:\s*(.+)$/.test(line)) {
                const match = line.match(/^-\s*Problem:\s*(.+)$/);
                currentPriorityItems.push(`<div class="issue-problem"><strong>Problem:</strong> ${match[1]}</div>`);
                continue;
            }
            if (/^-\s*Impact:\s*(.+)$/.test(line)) {
                const match = line.match(/^-\s*Impact:\s*(.+)$/);
                currentPriorityItems.push(`<div class="issue-impact"><strong>Impact:</strong> ${match[1]}</div>`);
                continue;
            }
            if (/^-\s*Solution:\s*(.+)$/.test(line)) {
                const match = line.match(/^-\s*Solution:\s*(.+)$/);
                currentPriorityItems.push(`<div class="issue-solution"><strong>Solution:</strong> ${match[1]}</div>`);
                continue;
            }
        }
        
        // Before/After sections
        if (/^❌\s*Before:\s*(.+)$/.test(line)) {
            const match = line.match(/^❌\s*Before:\s*(.+)$/);
            result.push('<div class="before-after-section">');
            result.push('<div class="before-section">');
            result.push('<span class="before-after-label before-label">❌ Before:</span>');
            result.push(`<div class="before-after-content">${match[1]}</div>`);
            result.push('</div>');
            currentBeforeAfter = 'before';
            continue;
        }
        if (/^✅\s*After:\s*(.+)$/.test(line)) {
            const match = line.match(/^✅\s*After:\s*(.+)$/);
            if (currentBeforeAfter) {
                result.push('<div class="after-section">');
                result.push('<span class="before-after-label after-label">✅ After:</span>');
                result.push(`<div class="before-after-content">${match[1]}</div>`);
                result.push('</div>');
                currentBeforeAfter = 'after';
            }
            continue;
        }
        if (/^Why this is better:\s*(.+)$/.test(line) && currentBeforeAfter === 'after') {
            const match = line.match(/^Why this is better:\s*(.+)$/);
            result.push(`<div class="improvement-note"><strong>Why this is better:</strong> ${match[1]}</div>`);
            result.push('</div>');
            currentBeforeAfter = null;
            continue;
        }
        
        // ✅ What Works / ❌ What Doesn't / 🔧 How to Fix
        if (/^-\s*✅\s*What Works:\s*(.+)$/.test(line)) {
            const match = line.match(/^-\s*✅\s*What Works:\s*(.+)$/);
            result.push(`<div class="positive-item">✅ <strong>What Works:</strong> ${match[1]}</div>`);
            continue;
        }
        if (/^-\s*❌\s*What Doesn'?t:\s*(.+)$/.test(line)) {
            const match = line.match(/^-\s*❌\s*What Doesn'?t:\s*(.+)$/);
            result.push(`<div class="negative-item">❌ <strong>What Doesn't:</strong> ${match[1]}</div>`);
            continue;
        }
        if (/^-\s*🔧\s*How to Fix:\s*(.+)$/.test(line)) {
            const match = line.match(/^-\s*🔧\s*How to Fix:\s*(.+)$/);
            result.push(`<div class="improvement-note">🔧 <strong>How to Fix:</strong> ${match[1]}</div>`);
            continue;
        }
        
        // Markdown headers
        if (/^##\s+(.+)$/.test(line)) {
            const match = line.match(/^##\s+(.+)$/);
            result.push(`<h2 class="section-header">${match[1]}</h2>`);
            continue;
        }
        if (/^###\s+(.+)$/.test(line)) {
            const match = line.match(/^###\s+(.+)$/);
            result.push(`<h3 class="subsection-header">${match[1]}</h3>`);
            continue;
        }
        
        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Code
        line = line.replace(/`(.+?)`/g, '<code>$1</code>');
        
        // Bullet points
        if (/^-\s+(.+)$/.test(line) && !line.includes('Problem:') && !line.includes('Impact:') && 
            !line.includes('Solution:') && !line.includes('What Works:') && !line.includes('What Doesn') &&
            !line.includes('How to Fix:') && !line.includes('Before:') && !line.includes('After:')) {
            const match = line.match(/^-\s+(.+)$/);
            result.push(`<li>${match[1]}</li>`);
            continue;
        }
        
        // Regular text - add as paragraph
        if (line && !line.startsWith('<')) {
            result.push(`<p class="analysis-paragraph">${line}</p>`);
        } else {
            result.push(line);
        }
    }
    
    // Flush any remaining priority items
    if (currentPriorityItems.length > 0) {
        const priorityClass = currentPriority === '🔴' ? 'priority-critical' : 
                            currentPriority === '🟠' ? 'priority-important' : 'priority-optional';
        result.push(`<div class="priority-item ${priorityClass}">`);
        result.push(`<span class="priority-icon">${currentPriority}</span>`);
        result.push('<div class="priority-content">');
        result.push(...currentPriorityItems);
        result.push('</div></div>');
    }
    
    // Wrap consecutive list items
    let html = result.join('\n');
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
        return `<ul class="analysis-list">${match}</ul>`;
    });
    
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