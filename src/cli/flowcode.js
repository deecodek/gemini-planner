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

// Config functions
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
      selectedFiles: DEFAULT_FILES.map(f => f.key)
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
    selectedFiles: config.selectedFiles || DEFAULT_FILES.filter(f => f.selected).map(f => f.key)
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
  /export     - Export plan files to a folder
  /context    - Export conversation context
  /import     - Import conversation context
  /instructions - Set custom AI instructions
  /custom     - Add custom markdown file
  /exit       - Exit FlowCode
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
