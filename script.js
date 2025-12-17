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
let isProcessing = false;

// Configuration
const PREDICTION_ENDPOINT = 'https://cloud.flowiseai.com/api/v1/prediction/24750039-b124-4eea-893e-1bbe76f270da';
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
    if (!VALID_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
        showError('Please upload a PDF, TXT, DOC, or DOCX document');
        return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showError(`File size (${formatFileSize(file.size)}) exceeds the maximum limit of 10MB`);
        return;
    }
    
    if (file.size === 0) {
        showError('The selected file is empty. Please choose a valid file.');
        return;
    }
    
    selectedFile = file;
    hideError();
    showFilePreview(file);
    analyzeBtn.disabled = false;
    
    // Scroll to file preview smoothly
    setTimeout(() => {
        filePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showFilePreview(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreview.classList.remove('hidden');
    dropText.textContent = file.name;
    
    // Add visual feedback
    dropZone.style.borderColor = '#22c55e';
    setTimeout(() => {
        dropZone.style.borderColor = '';
    }, 500);
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
    if (isProcessing) return;
    
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropText.textContent = 'Drop your CV here or click to browse';
    analyzeBtn.disabled = true;
    hideError();
    
    // Smooth transition between sections
    resultsSection.style.opacity = '0';
    setTimeout(() => {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        uploadSection.style.opacity = '0';
        setTimeout(() => {
            uploadSection.style.opacity = '1';
        }, 50);
    }, 300);
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(isLoading) {
    isProcessing = isLoading;
    analyzeBtn.disabled = isLoading;
    
    if (isLoading) {
        btnText.textContent = 'Analyzing...';
        const icon = analyzeBtn.querySelector('.btn-icon');
        if (icon) icon.classList.add('spin');
        analyzeBtn.style.cursor = 'wait';
    } else {
        btnText.textContent = 'Analyze CV';
        const icon = analyzeBtn.querySelector('.btn-icon');
        if (icon) icon.classList.remove('spin');
        analyzeBtn.style.cursor = '';
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
    if (!selectedFile || isProcessing) return;
    
    setLoading(true);
    hideError();
    
    // Smooth scroll to results area
    setTimeout(() => {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    try {
        // Read file content
        btnText.textContent = 'Processing file...';
        let cvText;
        
        // For text files, read as text. For PDFs, extract text
        if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
            cvText = await readFileAsText(selectedFile);
        } else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
            btnText.textContent = 'Extracting text from PDF...';
            cvText = await extractTextFromPDF(selectedFile);
        } else {
            showError('Please upload a PDF or TXT file. DOC/DOCX support coming soon.');
            setLoading(false);
            return;
        }
        
        if (!cvText || cvText.trim().length === 0) {
            showError('Could not extract text from the file. Please ensure the file contains readable text.');
            setLoading(false);
            return;
        }
        
        // Generate unique chat ID
        const chatId = generateUUID();
        
        // Prepare the request payload
        const payload = {
            question: 'analyze',
            chatId: chatId,
            uploads: [
                {
                    data: cvText,
                    type: 'file:full',
                    name: selectedFile.name,
                    mime: selectedFile.type
                }
            ]
        };
        
        // Send request to Flowise API
        btnText.textContent = 'Analyzing CV with AI...';
        console.log('Sending payload:', payload);
        
        const response = await fetch(PREDICTION_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            let errorMessage = `Analysis failed (${response.status})`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Result:', result);
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        showResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        let errorMsg = error.message || 'An error occurred during analysis';
        
        // User-friendly error messages
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            errorMsg = 'Network error. Please check your internet connection and try again.';
        } else if (errorMsg.includes('timeout')) {
            errorMsg = 'Request timed out. Please try again.';
        }
        
        showError(errorMsg);
    } finally {
        setLoading(false);
    }
}

// Helper function to generate UUID
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
    
    // Smooth transition to results
    uploadSection.style.opacity = '0';
    setTimeout(() => {
        uploadSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.style.opacity = '0';
        setTimeout(() => {
            resultsSection.style.opacity = '1';
            // Scroll to results smoothly
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }, 50);
    }, 300);
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