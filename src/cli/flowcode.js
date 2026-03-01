#!/usr/bin/env node

import readline from 'readline';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration - Global (user home)
const FLOWCODE_DIR = path.join(os.homedir(), '.flowcode');
const CONFIG_PATH = path.join(FLOWCODE_DIR, 'config.json');
const SESSIONS_DIR = path.join(FLOWCODE_DIR, 'sessions');
const CONTEXTS_DIR = path.join(FLOWCODE_DIR, 'contexts');
const MEMORY_PATH = path.join(FLOWCODE_DIR, 'memory.json');

const GEMINI_MODEL = 'gemini-2.5-flash';

// Default files available for plan generation
const DEFAULT_FILES = [
  { key: 'PRD', label: 'PRD - Product Requirements', selected: true },
  { key: 'ARCHITECTURE', label: 'ARCHITECTURE - System Design', selected: true },
  { key: 'STACK', label: 'STACK - Technology Stack', selected: true },
  { key: 'TASKS', label: 'TASKS - Project Tasks', selected: true },
  { key: 'STRUCTURE', label: 'STRUCTURE - File Structure', selected: true },
  { key: 'SCHEMA', label: 'SCHEMA - Data Schema', selected: true },
  { key: 'CONVENTIONS', label: 'CONVENTIONS - Coding Conventions', selected: true },
  { key: 'ENV', label: 'ENV - Environment Variables', selected: true },
  { key: 'API', label: 'API - API Design', selected: true },
  { key: 'UI', label: 'UI - UI/UX Design', selected: false },
  { key: 'ERRORS', label: 'ERRORS - Error Handling', selected: true },
  { key: 'ORCHESTRATOR', label: 'ORCHESTRATOR - Agent Orchestration', selected: false },
  { key: 'TESTING', label: 'TESTING - Testing Strategy', selected: true },
  { key: 'INTELLIGENCE', label: 'INTELLIGENCE - AI Logic', selected: false },
  { key: 'WORKFLOW', label: 'WORKFLOW - Agent Workflow', selected: false },
  { key: 'PROMPTS', label: 'PROMPTS - Prompt Templates', selected: false },
  { key: 'EVALUATION', label: 'EVALUATION - Quality Metrics', selected: false },
  { key: 'DEPENDENCIES', label: 'DEPENDENCIES - Dependencies List', selected: true },
  { key: 'SECURITY', label: 'SECURITY - Security Practices', selected: true },
  { key: 'DEPLOYMENT', label: 'DEPLOYMENT - Deployment Guide', selected: true },
  { key: 'MONITORING', label: 'MONITORING - Logging & Observability', selected: false },
];

// Project templates
const PROJECT_TEMPLATES = {
  'web-app': {
    name: 'Web Application',
    defaultFiles: ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'SCHEMA', 'API', 'UI', 'ERRORS', 'TESTING', 'SECURITY', 'DEPLOYMENT'],
    description: 'Full-stack web application with frontend and backend'
  },
  'api-service': {
    name: 'API Service',
    defaultFiles: ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'SCHEMA', 'API', 'ERRORS', 'TESTING', 'SECURITY', 'DEPLOYMENT', 'MONITORING'],
    description: 'Backend API or microservice'
  },
  'ai-agent': {
    name: 'AI Agent System',
    defaultFiles: ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'ORCHESTRATOR', 'INTELLIGENCE', 'WORKFLOW', 'PROMPTS', 'TESTING', 'EVALUATION', 'SECURITY'],
    description: 'AI-powered agent or automation system'
  },
  'cli-tool': {
    name: 'CLI Tool',
    defaultFiles: ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'CONVENTIONS', 'TESTING', 'DEPLOYMENT'],
    description: 'Command-line interface tool'
  },
  'mobile-app': {
    name: 'Mobile Application',
    defaultFiles: ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'API', 'UI', 'ERRORS', 'TESTING', 'SECURITY', 'DEPLOYMENT'],
    description: 'iOS/Android mobile application'
  },
  'custom': {
    name: 'Custom Project',
    defaultFiles: DEFAULT_FILES.filter(f => f.selected).map(f => f.key),
    description: 'Fully customizable project type'
  }
};

// Memory functions - Learn from all projects
function loadMemory() {
  if (!fs.existsSync(MEMORY_PATH)) {
    return {
      preferences: {},
      patterns: [],
      projectCount: 0
    };
  }
  const content = fs.readFileSync(MEMORY_PATH, 'utf-8');
  return JSON.parse(content);
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

function learnFromProject(session, generatedFiles) {
  const memory = loadMemory();
  
  // Extract patterns from this project
  const patterns = {
    projectId: session.id,
    projectName: session.projectName,
    timestamp: Date.now(),
    filesGenerated: Object.keys(generatedFiles),
    messageCount: session.messages.length,
    keywords: extractKeywords(session.messages)
  };
  
  memory.patterns.push(patterns);
  memory.projectCount++;
  
  // Keep only last 50 projects
  if (memory.patterns.length > 50) {
    memory.patterns = memory.patterns.slice(-50);
  }
  
  saveMemory(memory);
  return memory;
}

function extractKeywords(messages) {
  const text = messages.map(m => m.content).join(' ').toLowerCase();
  const techKeywords = [
    'typescript', 'javascript', 'python', 'react', 'node', 'docker', 
    'kubernetes', 'aws', 'mongodb', 'postgresql', 'graphql', 'rest',
    'microservices', 'serverless', 'mobile', 'ios', 'android'
  ];
  
  return techKeywords.filter(keyword => text.includes(keyword));
}

function getLearnedPreferences() {
  const memory = loadMemory();
  if (memory.patterns.length === 0) return {};
  
  // Analyze patterns to find preferences
  const keywordCount = {};
  memory.patterns.forEach(pattern => {
    pattern.keywords.forEach(kw => {
      keywordCount[kw] = (keywordCount[kw] || 0) + 1;
    });
  });
  
  // Return top preferences
  const sorted = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);
  
  return {
    preferredTechnologies: sorted,
    projectCount: memory.projectCount
  };
}

// Consistency checker - Validate plan files don't contradict
function checkConsistency(files) {
  const issues = [];
  
  // Check for technology mismatches
  const stack = files.STACK || '';
  const schema = files.SCHEMA || '';
  const architecture = files.ARCHITECTURE || '';
  
  // Database consistency
  const stackDb = extractDatabases(stack);
  const schemaDb = extractDatabases(schema);
  
  if (stackDb.length > 0 && schemaDb.length > 0) {
    const hasConflict = !stackDb.some(db => schemaDb.includes(db));
    if (hasConflict) {
      issues.push({
        type: 'database_mismatch',
        severity: 'warning',
        message: `STACK mentions ${stackDb.join(', ')} but SCHEMA mentions ${schemaDb.join(', ')}`,
        files: ['STACK', 'SCHEMA']
      });
    }
  }
  
  // Check if TASKS reference files that exist in STRUCTURE
  if (files.TASKS && files.STRUCTURE) {
    const taskFiles = extractFileReferences(files.TASKS);
    const structureFiles = extractFileReferences(files.STRUCTURE);
    
    taskFiles.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py')) {
        // Check if parent directory exists in structure
        const parentDir = path.dirname(file);
        if (parentDir !== '.' && !structureFiles.some(f => f.includes(parentDir))) {
          issues.push({
            type: 'missing_directory',
            severity: 'info',
            message: `TASKS references ${file} but directory may not exist in STRUCTURE`,
            files: ['TASKS', 'STRUCTURE']
          });
        }
      }
    });
  }
  
  // Check API endpoints match architecture
  if (files.API && files.ARCHITECTURE) {
    const apiEndpoints = extractEndpoints(files.API);
    const archEndpoints = extractEndpoints(files.ARCHITECTURE);
    
    if (apiEndpoints.length > 0 && archEndpoints.length > 0) {
      const missingInArch = apiEndpoints.filter(ep => !archEndpoints.includes(ep));
      if (missingInArch.length > 0) {
        issues.push({
          type: 'api_architecture_mismatch',
          severity: 'warning',
          message: `API defines endpoints not mentioned in ARCHITECTURE: ${missingInArch.slice(0, 3).join(', ')}`,
          files: ['API', 'ARCHITECTURE']
        });
      }
    }
  }
  
  return issues;
}

function extractDatabases(text) {
  const dbs = ['postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'firebase', 'supabase'];
  return dbs.filter(db => text.toLowerCase().includes(db));
}

function extractFileReferences(text) {
  // Match file paths like src/index.ts, components/Button.tsx, etc.
  const matches = text.match(/[a-zA-Z0-9_\-\/]+\.[a-z]{2,4}/g) || [];
  return matches;
}

function extractEndpoints(text) {
  // Match API endpoints like /api/users, POST /items, etc.
  const matches = text.match(/(GET|POST|PUT|DELETE|PATCH)?\s*\/[a-zA-Z0-9_\-\/]+/g) || [];
  return matches;
}

function ensureConfigExists() {
  if (!fs.existsSync(FLOWCODE_DIR)) {
    fs.mkdirSync(FLOWCODE_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONTEXTS_DIR)) {
    fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      geminiApiKey: '',
      planFolderName: 'plan',
      customInstructions: '',
      customFiles: [],
      selectedFiles: DEFAULT_FILES.map(f => f.key),
      projectTemplate: 'custom'
    }, null, 2));
  }
}

function getConfig() {
  ensureConfigExists();
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(content);
  // Merge with defaults
  return {
    geminiApiKey: config.geminiApiKey || '',
    planFolderName: config.planFolderName || 'plan',
    customInstructions: config.customInstructions || '',
    customFiles: config.customFiles || [],
    selectedFiles: config.selectedFiles || DEFAULT_FILES.filter(f => f.selected).map(f => f.key),
    projectTemplate: config.projectTemplate || 'custom'
  };
}

function saveConfig(config) {
  ensureConfigExists();
  const current = getConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

// Session functions
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getSessionPath(sessionId) {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

function createSession(projectPath, projectName) {
  const session = {
    id: generateSessionId(),
    projectName,
    projectPath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    planGenerated: false,
    planVersion: 0
  };
  saveSession(session);
  return session;
}

function getSession(sessionId) {
  const sessionPath = getSessionPath(sessionId);
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  const content = fs.readFileSync(sessionPath, 'utf-8');
  return JSON.parse(content);
}

function saveSession(session) {
  session.updatedAt = Date.now();
  const sessionPath = getSessionPath(session.id);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
}

function addMessage(sessionId, message) {
  const session = getSession(sessionId);
  if (!session) return null;
  session.messages.push(message);
  saveSession(session);
  return session;
}

function getAllSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  const sessions = files.map(file => {
    const content = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
    return JSON.parse(content);
  });
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Context export/import functions
function exportContext(session) {
  const contextPath = path.join(CONTEXTS_DIR, `${session.id}_context.json`);
  const context = {
    sessionId: session.id,
    projectName: session.projectName,
    exportedAt: Date.now(),
    messages: session.messages
  };
  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
  return contextPath;
}

function importContext(contextPath) {
  if (!fs.existsSync(contextPath)) {
    return null;
  }
  const content = fs.readFileSync(contextPath, 'utf-8');
  return JSON.parse(content);
}

// Plan functions
function getPlanFolderPath(projectPath) {
  const config = getConfig();
  return path.join(projectPath, config.planFolderName);
}

function getVersionedPlanFolderPath(projectPath, version) {
  return path.join(getPlanFolderPath(projectPath), `v${version}`);
}

function getNextPlanVersion(projectPath) {
  const planFolder = getPlanFolderPath(projectPath);
  if (!fs.existsSync(planFolder)) {
    return 1;
  }
  const dirs = fs.readdirSync(planFolder).filter(d => d.startsWith('v') && /^\d+$/.test(d.substring(1)));
  if (dirs.length === 0) return 1;
  const versions = dirs.map(d => parseInt(d.substring(1)));
  return Math.max(...versions) + 1;
}

function writePlanFiles(projectPath, files, version) {
  const versionedFolder = getVersionedPlanFolderPath(projectPath, version);
  
  if (!fs.existsSync(versionedFolder)) {
    fs.mkdirSync(versionedFolder, { recursive: true });
  }
  
  const fileOrder = Object.keys(files);
  
  console.log('\n📝 Generating plan files...\n');
  
  // Write ONLY to versioned folder (no duplicates in root plan folder)
  for (const fileName of fileOrder) {
    if (files[fileName]) {
      const filePath = path.join(versionedFolder, `${fileName.toLowerCase()}.md`);
      fs.writeFileSync(filePath, files[fileName]);
      console.log(`   ✅ ${fileName}.md`);
    }
  }
  
  console.log('');
}

// Multi-step generation with validation
async function generatePlanInSteps(messages, apiKey, files) {
  console.log('\n🔄 Generating plan in steps...\n');
  
  const generatedFiles = {};
  const stepResults = [];
  
  // Step 1: Generate core files first
  const coreFiles = ['PRD', 'ARCHITECTURE', 'STACK'];
  console.log('Step 1/3: Generating core files...');
  for (const file of coreFiles) {
    if (files.includes(file)) {
      console.log(`  Generating ${file}...`);
      const content = await generateSingleFile(messages, apiKey, file, files);
      generatedFiles[file] = content;
      stepResults.push({ file, status: 'done' });
    }
  }
  
  // Step 2: Generate dependent files with context from core
  const dependentFiles = ['STRUCTURE', 'SCHEMA', 'API', 'TASKS'];
  console.log('\nStep 2/3: Generating dependent files...');
  for (const file of dependentFiles) {
    if (files.includes(file)) {
      console.log(`  Generating ${file}...`);
      const content = await generateSingleFile(messages, apiKey, file, files, generatedFiles);
      generatedFiles[file] = content;
      stepResults.push({ file, status: 'done' });
    }
  }
  
  // Step 3: Generate remaining files
  const remainingFiles = files.filter(f => !coreFiles.includes(f) && !dependentFiles.includes(f));
  console.log('\nStep 3/3: Generating remaining files...');
  for (const file of remainingFiles) {
    console.log(`  Generating ${file}...`);
    const content = await generateSingleFile(messages, apiKey, file, files, generatedFiles);
    generatedFiles[file] = content;
    stepResults.push({ file, status: 'done' });
  }
  
  // Validate consistency
  console.log('\n✅ Validating consistency...');
  const issues = checkConsistency(generatedFiles);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Found ${issues.length} consistency issue(s):\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      console.log(`     Files: ${issue.files.join(', ')}\n`);
    });
    
    // Ask user if they want to fix
    const rl = createReadlineInterface();
    const answer = await question(rl, '\nFix consistency issues? (y/n): ');
    rl.close();
    
    if (answer.toLowerCase() === 'y') {
      console.log('\n🔄 Fixing issues...\n');
      for (const issue of issues) {
        if (issue.severity === 'warning') {
          for (const file of issue.files) {
            if (generatedFiles[file]) {
              console.log(`  Refining ${file}...`);
              const refinedContent = await refineFile(messages, apiKey, file, generatedFiles, issue);
              generatedFiles[file] = refinedContent;
            }
          }
        }
      }
      console.log('✅ Issues fixed!\n');
    }
  } else {
    console.log('✅ No consistency issues found!\n');
  }
  
  return { generatedFiles, stepResults, issues };
}

async function generateSingleFile(messages, apiKey, fileName, allFiles, context = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const config = getConfig();
  
  const contextPrompt = Object.keys(context).length > 0 ? `
  
Context from already-generated files:
${Object.entries(context).slice(0, 3).map(([k, v]) => `${k}: ${v.substring(0, 200)}...`).join('\n')}

Ensure consistency with these files.` : '';
  
  const prompt = `Generate ONLY the content for ${fileName}.md file.

Project context from conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
${contextPrompt}

Requirements:
- Write comprehensive, production-ready content
- Use proper markdown formatting
- Include code examples where relevant
- Be specific to this project, not generic
- Output ONLY the markdown content, no explanations

Generate ${fileName}.md content:`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function refineFile(messages, apiKey, fileName, currentFiles, issue) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const prompt = `Refine ${fileName} to fix this consistency issue:

Issue: ${issue.message}

Current content:
${currentFiles[fileName]?.substring(0, 2000) || 'N/A'}

Generate improved content that resolves the issue while maintaining quality.
Output ONLY the revised markdown content:`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Quality scoring for generated plan
function scorePlanQuality(files) {
  let score = 0;
  const maxScore = 100;
  const checks = [];
  
  // Check 1: File count (20 points)
  const fileCount = Object.keys(files).length;
  const fileScore = Math.min(20, (fileCount / 15) * 20);
  score += fileScore;
  checks.push({ name: 'File Coverage', score: fileScore, max: 20 });
  
  // Check 2: Content length (30 points)
  let totalLength = 0;
  Object.values(files).forEach(content => {
    totalLength += content.length;
  });
  const avgLength = totalLength / fileCount;
  const lengthScore = Math.min(30, (avgLength / 1000) * 30);
  score += lengthScore;
  checks.push({ name: 'Content Depth', score: lengthScore, max: 30 });
  
  // Check 3: Has code examples (20 points)
  let hasCodeExamples = false;
  Object.values(files).forEach(content => {
    if (content.includes('```')) hasCodeExamples = true;
  });
  const codeScore = hasCodeExamples ? 20 : 5;
  score += codeScore;
  checks.push({ name: 'Code Examples', score: codeScore, max: 20 });
  
  // Check 4: Has specific details (30 points)
  let hasSpecifics = false;
  Object.values(files).forEach(content => {
    if (content.match(/\b(should|must|will|api|endpoint|database|component|function)\b/i)) {
      hasSpecifics = true;
    }
  });
  const specificsScore = hasSpecifics ? 30 : 10;
  score += specificsScore;
  checks.push({ name: 'Specific Details', score: specificsScore, max: 30 });
  
  return {
    totalScore: Math.round(score),
    maxScore,
    checks,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  };
}

// Gemini functions
function getSystemPrompt() {
  const config = getConfig();
  
  const selectedFiles = config.selectedFiles.length > 0 
    ? config.selectedFiles 
    : DEFAULT_FILES.filter(f => f.selected).map(f => f.key);
  
  const customFiles = config.customFiles || [];
  
  let filesSection = selectedFiles.map(key => {
    const file = DEFAULT_FILES.find(f => f.key === key);
    const desc = file ? file.label.split(' - ')[1] : 'markdown content';
    return `    "${key}": "${desc}",`;
  }).join('\n');
  
  // Add custom files
  customFiles.forEach(cf => {
    filesSection += `\n    "${cf.name}": "${cf.description || 'custom markdown content'}",`;
  });
  
  const customInstructions = config.customInstructions 
    ? `\n\nCUSTOM INSTRUCTIONS: ${config.customInstructions}` 
    : '';
  
  return `You are FlowCode AI, a warm and curious senior engineer friend who helps users shape their software ideas into actionable plans. You are conversational, asking one question at a time to understand the user's vision deeply.

YOUR PERSONALITY:
- Warm, friendly, and approachable - like a senior engineer friend
- Ask clarifying questions one at a time, not in batches
- Show genuine curiosity about the user's idea
- Share insights and suggest best practices naturally in conversation
- Be encouraging but honest about complexity${customInstructions}

YOUR GOAL:
Guide the user through shaping their idea into a clear, actionable plan. Once you have enough information, generate a structured JSON plan.

PLAN JSON FORMAT:
When ready, output the JSON wrapped in markdown code blocks like this:

\`\`\`md
{
  "projectName": "string",
  "planVersion": 1,
  "files": {
${filesSection}
  }
}
\`\`\`

IMPORTANT RULES:
- Always wrap the JSON in \`\`\`md code blocks (NOT \`\`\`json)
- After generating the plan, tell the user the plan is ready
- Keep responses concise and conversational
- Generate meaningful content for all requested files based on the project
`;
}

async function chatWithGemini(messages, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = getSystemPrompt();
  
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt
  });

  const chat = model.startChat({
    history: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  });

  const result = await chat.sendMessageStream(messages[messages.length - 1].content);
  
  const chunks = [];
  for await (const chunk of result.stream) {
    const text = chunk.text();
    chunks.push(text);
    process.stdout.write(text);
  }
  
  return chunks.join('');
}

function extractPlanJson(response) {
  const lines = response.split('\n');
  let jsonContent = '';
  let inJsonBlock = false;
  let braceCount = 0;
  let started = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inJsonBlock && (line.trim().startsWith('```md') || line.trim().startsWith('```json'))) {
      inJsonBlock = true;
      started = false;
      braceCount = 0;
      jsonContent = '';
      continue;
    }
    
    if (inJsonBlock) {
      if (line.trim() === '```' && started && braceCount === 0) {
        break;
      }
      
      if (!started && line.trim().startsWith('{')) {
        started = true;
      }
      
      if (started) {
        jsonContent += line + '\n';
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
      }
    }
  }
  
  if (jsonContent.trim()) {
    try {
      return JSON.parse(jsonContent);
    } catch (e) {
      console.log('[DEBUG] Failed to parse JSON:', e.message);
      return null;
    }
  }
  
  const jsonMatch = response.match(/\{[\s\S]*"files"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  
  return null;
}

// CLI functions
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
}

function printBanner() {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 FlowCode - AI Software Planner');
  console.log('  Chat with AI to plan your next project');
  console.log('  21 markdown files | Custom instructions | Context export');
  console.log('='.repeat(60) + '\n');
}

function printHelp() {
  console.log(`
Commands:
  /help       - Show this help message
  /new        - Start a new conversation
  /sessions   - List all sessions
  /resume     - Resume a previous session
  /config     - Configure API key and settings
  /files      - Select which markdown files to generate
  /template   - Choose from project templates (web-app, api-service, ai-agent, etc.)
  /export     - Export plan files to a folder
  /context    - Export conversation context
  /import     - Import conversation context
  /instructions - Set custom AI instructions
  /custom     - Add custom markdown file
  /memory     - View learned preferences from all projects
  /quality    - Check plan quality score and consistency
  /exit       - Exit FlowCode

Advanced Features:
  • Multi-step generation with validation
  • Consistency checking across files
  • Quality scoring (A-F grade)
  • Project memory & pattern learning
  • Smart templates for common project types
`);
}

function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupApiKey(rl) {
  const config = getConfig();
  
  if (config.geminiApiKey) {
    const masked = config.geminiApiKey.substring(0, 4) + '...' + config.geminiApiKey.substring(-4);
    console.log(`\n✅ API key found: ${masked}`);
    const answer = await question(rl, 'Use saved key or enter new one? (use/new): ');
    
    if (answer.toLowerCase() === 'new') {
      const newKey = await question(rl, 'Enter new API key: ');
      if (newKey) {
        const updated = saveConfig({ geminiApiKey: newKey });
        console.log('✅ API key updated!\n');
        return updated;
      }
    }
    return config;
  }
  
  console.log('\n⚠️  No API key configured.\n');
  const apiKey = await question(rl, 'Enter your Gemini API key: ');
  const updated = saveConfig({ geminiApiKey: apiKey });
  console.log('✅ API key saved!\n');
  return updated;
}

async function selectFiles(rl) {
  const config = getConfig();
  let selected = config.selectedFiles.length > 0 
    ? config.selectedFiles 
    : DEFAULT_FILES.filter(f => f.selected).map(f => f.key);
  
  console.log('\n📋 Select which markdown files to generate:\n');
  
  const allFiles = [...DEFAULT_FILES, ...config.customFiles.map(cf => ({ 
    key: cf.name, 
    label: `${cf.name} - ${cf.description || 'Custom file'}`,
    selected: selected.includes(cf.name)
  }))];
  
  console.log('Files (toggle by number, press Enter when done):\n');
  
  let done = false;
  while (!done) {
    allFiles.forEach((f, i) => {
      const isSelected = selected.includes(f.key);
      console.log(`  ${i + 1}. [${isSelected ? '✓' : ' '}] ${f.label}`);
    });
    
    const answer = await question(rl, '\nToggle file number (or Enter to finish): ');
    
    if (!answer.trim()) {
      done = true;
      break;
    }
    
    const num = parseInt(answer) - 1;
    if (num >= 0 && num < allFiles.length) {
      const key = allFiles[num].key;
      if (selected.includes(key)) {
        selected = selected.filter(k => k !== key);
      } else {
        selected.push(key);
      }
    }
  }
  
  saveConfig({ selectedFiles: selected });
  console.log(`\n✅ Selected ${selected.length} files\n`);
  return selected;
}

async function selectSession(rl) {
  const sessions = getAllSessions();
  
  if (sessions.length === 0) {
    console.log('No previous sessions found.');
    return null;
  }
  
  console.log('\nPrevious sessions:');
  sessions.forEach((session, index) => {
    const date = new Date(session.createdAt).toLocaleString();
    console.log(`  ${index + 1}. ${session.projectName} - ${date} (${session.messages.length} messages)`);
  });
  
  const answer = await question(rl, '\nSelect session number (or 0 to cancel): ');
  const index = parseInt(answer) - 1;
  
  if (index >= 0 && index < sessions.length) {
    return sessions[index];
  }
  
  return null;
}

async function main() {
  printBanner();
  
  ensureConfigExists();
  const rl = createReadlineInterface();
  const config = await setupApiKey(rl);
  
  // Check for existing sessions
  const sessions = getAllSessions();
  let session = null;
  
  if (sessions.length > 0) {
    console.log(`Found ${sessions.length} previous session(s).`);
    const answer = await question(rl, 'Resume last session? (y/n): ');
    
    if (answer.toLowerCase() === 'y') {
      session = sessions[0];
      console.log(`\n📁 Resumed: ${session.projectName}`);
      console.log(`   Messages: ${session.messages.length}`);
      console.log(`   Plan: ${session.planGenerated ? `v${session.planVersion}` : 'Not generated'}\n`);
    }
  }
  
  if (!session) {
    const projectName = await question(rl, 'Project name: ');
    session = createSession(process.cwd(), projectName || 'New Project');
    console.log(`\n✨ Started new session: ${session.projectName}\n`);
  }
  
  console.log('💬 Start chatting! Type /help for commands.\n');
  console.log('-'.repeat(60));
  
  // Print conversation history
  if (session.messages.length > 0) {
    console.log('\n--- Previous conversation ---\n');
    session.messages.forEach(msg => {
      const prefix = msg.role === 'user' ? '👤 You' : '🤖 AI';
      console.log(`${prefix}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`);
    });
    console.log('\n--- End of history ---\n');
  }
  
  let running = true;
  
  while (running) {
    const input = await question(rl, '> ');
    const trimmed = input.trim();
    
    if (!trimmed) continue;
    
    // Handle commands
    if (trimmed.startsWith('/')) {
      const command = trimmed.toLowerCase().split(' ')[0];
      const args = trimmed.split(' ').slice(1).join(' ');
      
      switch (command) {
        case '/help':
          printHelp();
          break;
          
        case '/exit':
        case '/quit':
          running = false;
          break;
          
        case '/new':
          const newName = await question(rl, 'New project name: ');
          session = createSession(process.cwd(), newName || 'New Project');
          console.log(`\n✨ Started new session: ${session.projectName}\n`);
          break;
          
        case '/sessions':
          const allSessions = getAllSessions();
          if (allSessions.length === 0) {
            console.log('No sessions found.');
          } else {
            console.log('\nAll sessions:');
            allSessions.forEach((s, i) => {
              const date = new Date(s.createdAt).toLocaleString();
              console.log(`  ${i + 1}. ${s.projectName} - ${date} (${s.messages.length} msgs)`);
            });
          }
          break;
          
        case '/resume':
          const selected = await selectSession(rl);
          if (selected) {
            session = selected;
            console.log(`\n📁 Resumed: ${session.projectName}\n`);
          }
          break;
          
        case '/config':
          console.log('\n📝 Configuration:');
          console.log(`   API Key: ${config.geminiApiKey ? '****' + config.geminiApiKey.slice(-4) : 'Not set'}`);
          console.log(`   Plan Folder: ${config.planFolderName}`);
          console.log(`   Selected Files: ${config.selectedFiles.length}`);
          console.log(`   Custom Instructions: ${config.customInstructions ? 'Yes' : 'No'}`);
          console.log(`   Custom Files: ${config.customFiles.length}\n`);
          
          const newKey = await question(rl, 'Enter new API key (or press Enter to keep current): ');
          if (newKey && newKey.trim()) {
            saveConfig({ geminiApiKey: newKey.trim() });
            console.log('✅ API key updated!\n');
          }
          break;
          
        case '/files':
          await selectFiles(rl);
          break;
          
        case '/export':
          if (!session.planGenerated) {
            console.log('\n❌ No plan generated yet for this session.\n');
            break;
          }
          
          const exportFolderName = await question(rl, '\nEnter export folder name (or path): ');
          if (!exportFolderName || !exportFolderName.trim()) {
            console.log('Export cancelled.\n');
            break;
          }
          
          let exportFolder = exportFolderName.trim();
          
          if (!path.isAbsolute(exportFolder)) {
            exportFolder = path.join(process.cwd(), exportFolder);
          }
          
          if (!fs.existsSync(exportFolder)) {
            fs.mkdirSync(exportFolder, { recursive: true });
          }
          
          const versionedPath = getVersionedPlanFolderPath(session.projectPath, session.planVersion || 1);
          const fileOrder = Object.keys(session.messages.find(m => m.isPlanJson)?.content ? {} : {});
          
          let copiedCount = 0;
          console.log(`\n📁 Exporting to: ${exportFolder}\n`);
          
          // Get files from plan
          const planMsg = session.messages.find(m => m.isPlanJson);
          if (planMsg) {
            const planJson = extractPlanJson(planMsg.content);
            if (planJson && planJson.files) {
              for (const [fileName, content] of Object.entries(planJson.files)) {
                const targetFile = path.join(exportFolder, `${fileName.toLowerCase()}.md`);
                fs.writeFileSync(targetFile, content);
                console.log(`   ✅ ${fileName}.md`);
                copiedCount++;
              }
            }
          }
          
          console.log(`\n✅ Exported ${copiedCount} files to ${exportFolder}\n`);
          break;
          
        case '/context':
          const contextPath = exportContext(session);
          console.log(`\n✅ Context exported to: ${contextPath}\n`);
          break;
          
        case '/import':
          const importPath = await question(rl, '\nEnter context file path: ');
          if (!importPath || !fs.existsSync(importPath)) {
            console.log('Invalid path.\n');
            break;
          }
          
          const context = importContext(importPath);
          if (context) {
            session = createSession(process.cwd(), context.projectName);
            session.messages = context.messages || [];
            saveSession(session);
            console.log(`\n✅ Context imported: ${context.projectName} (${session.messages.length} messages)\n`);
          }
          break;
          
        case '/instructions':
          console.log(`\nCurrent instructions: ${config.customInstructions || '(none)'}\n`);
          const instructions = await question(rl, 'Enter custom instructions (or press Enter to clear): ');
          saveConfig({ customInstructions: instructions });
          console.log('✅ Instructions updated!\n');
          break;
          
        case '/custom':
          const customName = await question(rl, 'Custom file name (e.g., KUBERNETES): ');
          if (!customName) {
            console.log('Cancelled.\n');
            break;
          }

          const customDesc = await question(rl, 'Description (e.g., Kubernetes deployment config): ');

          const customFiles = config.customFiles || [];
          customFiles.push({ name: customName.toUpperCase(), description: customDesc });
          saveConfig({ customFiles });
          console.log(`✅ Custom file "${customName}" added!\n`);
          break;
          
        case '/template':
          console.log('\n📋 Project Templates:\n');
          Object.entries(PROJECT_TEMPLATES).forEach(([key, template]) => {
            console.log(`  ${key.padEnd(12)} - ${template.description}`);
            console.log(`               Default files: ${template.defaultFiles.length}\n`);
          });
          
          const templateChoice = await question(rl, 'Select template (or Enter to cancel): ');
          if (templateChoice && PROJECT_TEMPLATES[templateChoice]) {
            const template = PROJECT_TEMPLATES[templateChoice];
            saveConfig({ 
              selectedFiles: template.defaultFiles,
              projectTemplate: templateChoice
            });
            console.log(`\n✅ Template "${template.name}" selected!`);
            console.log(`   ${template.defaultFiles.length} files will be generated\n`);
          }
          break;
          
        case '/memory':
          const memory = loadMemory();
          const preferences = getLearnedPreferences();
          
          console.log('\n🧠 Project Memory:\n');
          console.log(`   Total Projects: ${memory.projectCount || 0}`);
          console.log(`   Preferred Technologies: ${preferences.preferredTechnologies?.join(', ') || 'None yet'}`);
          console.log(`   Recent Projects: ${Math.min(memory.patterns?.length || 0, 5)}\n`);
          
          if (memory.patterns && memory.patterns.length > 0) {
            console.log('   Recent:');
            memory.patterns.slice(-5).forEach((p, i) => {
              const date = new Date(p.timestamp).toLocaleDateString();
              console.log(`     ${i + 1}. ${p.projectName} (${date}) - ${p.filesGenerated.length} files`);
            });
            console.log('');
          }
          break;
          
        case '/quality':
          if (!session.planGenerated) {
            console.log('\n❌ No plan generated yet.\n');
            break;
          }

          // Load plan files and score
          const qualityPlanMsg = session.messages.find(m => m.isPlanJson);
          if (qualityPlanMsg) {
            const planJson = extractPlanJson(qualityPlanMsg.content);
            if (planJson && planJson.files) {
              const qualityScore = scorePlanQuality(planJson.files);
              const consistencyIssues = checkConsistency(planJson.files);

              console.log('\n📊 Plan Quality Report:\n');
              console.log(`   Overall Score: ${qualityScore.totalScore}/${qualityScore.maxScore}`);
              console.log(`   Grade: ${qualityScore.grade}`);
              console.log('\n   Breakdown:');
              qualityScore.checks.forEach(check => {
                console.log(`     ${check.name.padEnd(20)} ${Math.round(check.score)}/${check.max}`);
              });

              if (consistencyIssues.length > 0) {
                console.log(`\n   ⚠️  Consistency Issues: ${consistencyIssues.length}`);
                consistencyIssues.forEach((issue, i) => {
                  console.log(`     ${i + 1}. ${issue.message}`);
                });
              } else {
                console.log('\n   ✅ No consistency issues\n');
              }
            }
          }
          break;

        default:
          console.log(`Unknown command: ${command}. Type /help for help.\n`);
      }
      
      continue;
    }
    
    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    };
    session = addMessage(session.id, userMessage);
    
    // Get AI response
    const messages = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    try {
      const config = getConfig();
      const selectedFiles = config.selectedFiles;
      
      // Ask if user wants multi-step generation with validation
      if (trimmed.toLowerCase().includes('generate') && selectedFiles.length > 5) {
        const rl2 = createReadlineInterface();
        const useAdvanced = await question(rl2, '\n🚀 Use advanced multi-step generation with validation? (y/n): ');
        rl2.close();
        
        if (useAdvanced.toLowerCase() === 'y') {
          console.log('\n🔄 Starting advanced plan generation...\n');
          
          const { generatedFiles, stepResults, issues } = await generatePlanInSteps(
            messages, 
            config.geminiApiKey, 
            selectedFiles
          );
          
          const version = getNextPlanVersion(session.projectPath);
          writePlanFiles(session.projectPath, generatedFiles, version);
          
          // Score quality
          const qualityScore = scorePlanQuality(generatedFiles);
          console.log(`\n📊 Plan Quality Score: ${qualityScore.totalScore}/${qualityScore.maxScore} (Grade: ${qualityScore.grade})`);
          
          // Learn from this project
          learnFromProject(session, generatedFiles);
          
          session.planGenerated = true;
          session.planVersion = version;
          saveSession(session);
          
          console.log(`\n✅ Plan generated successfully!`);
          console.log(`   Location: ${getPlanFolderPath(session.projectPath)}/v${version}/\n`);
          continue;
        }
      }
      
      console.log('\n🤖 AI: ');
      const response = await chatWithGemini(messages, config.geminiApiKey);
      console.log('\n');

      // Add assistant message
      const assistantMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      session = addMessage(session.id, assistantMessage);

      // Check for plan JSON
      const planJson = extractPlanJson(response);

      if (planJson && planJson.files) {
        const version = getNextPlanVersion(session.projectPath);
        writePlanFiles(session.projectPath, planJson.files, version);

        session.planGenerated = true;
        session.planVersion = version;
        saveSession(session);

        console.log('✅ Plan generated successfully!');
        console.log(`   Location: ${getPlanFolderPath(session.projectPath)}/v${version}/\n`);
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  }
  
  rl.close();
  console.log('\n👋 Goodbye!\n');
  process.exit(0);
}

// Run the CLI
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
