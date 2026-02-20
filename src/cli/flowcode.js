#!/usr/bin/env node

import readline from 'readline';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration
const FLOWCODE_DIR = path.join(os.homedir(), '.flowcode');
const CONFIG_PATH = path.join(FLOWCODE_DIR, 'config.json');
const SESSIONS_DIR = path.join(FLOWCODE_DIR, 'sessions');

const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_SYSTEM_PROMPT = `You are FlowCode AI, a warm and curious senior engineer friend who helps users shape their software ideas into actionable plans. You are conversational, asking one question at a time to understand the user's vision deeply.

YOUR PERSONALITY:
- Warm, friendly, and approachable - like a senior engineer friend
- Ask clarifying questions one at a time, not in batches
- Show genuine curiosity about the user's idea
- Share insights and suggest best practices naturally in conversation
- Be encouraging but honest about complexity

YOUR GOAL:
Guide the user through shaping their idea into a clear, actionable plan. Once you have enough information, generate a structured JSON plan.

PLAN JSON FORMAT:
When ready, output the JSON wrapped in markdown code blocks like this:

\`\`\`md
{
  "projectName": "string",
  "planVersion": 1,
  "files": {
    "PRD": "markdown content for PRD",
    "ARCHITECTURE": "markdown content for Architecture",
    "STACK": "markdown content for Tech Stack",
    "TASKS": "markdown content for Tasks",
    "STRUCTURE": "markdown content for Project Structure",
    "SCHEMA": "markdown content for Data Schema",
    "CONVENTIONS": "markdown content for Coding Conventions",
    "ENV": "markdown content for Environment Variables",
    "API": "markdown content for API Design",
    "UI": "markdown content for UI/UX Design",
    "ERRORS": "markdown content for Error Handling"
  }
}
\`\`\`

IMPORTANT RULES:
- Always wrap the JSON in \`\`\`md code blocks (NOT \`\`\`json)
- After generating the plan, tell the user the plan is ready
- Keep responses concise and conversational
`;

// Config functions
function ensureConfigExists() {
  if (!fs.existsSync(FLOWCODE_DIR)) {
    fs.mkdirSync(FLOWCODE_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      geminiApiKey: '',
      planFolderName: 'plan'
    }, null, 2));
  }
}

function getConfig() {
  ensureConfigExists();
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
}

function saveConfig(config) {
  ensureConfigExists();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
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

// Plan functions
function getPlanFolderPath(projectPath) {
  const config = getConfig();
  return path.join(projectPath, config.planFolderName || 'plan');
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
  
  const fileOrder = ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'SCHEMA', 'CONVENTIONS', 'ENV', 'API', 'UI', 'ERRORS'];
  
  console.log('\n📝 Generating plan files...\n');
  
  // Write to versioned folder
  for (const fileName of fileOrder) {
    if (files[fileName]) {
      const filePath = path.join(versionedFolder, `${fileName.toLowerCase()}.md`);
      fs.writeFileSync(filePath, files[fileName]);
      console.log(`   ✅ ${fileName}.md`);
    }
  }
  
  // Also write to root plan folder
  const planFolder = getPlanFolderPath(projectPath);
  for (const fileName of fileOrder) {
    if (files[fileName]) {
      const filePath = path.join(planFolder, `${fileName.toLowerCase()}.md`);
      fs.writeFileSync(filePath, files[fileName]);
    }
  }
  
  console.log('');
}

// Gemini functions
async function chatWithGemini(messages, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: GEMINI_SYSTEM_PROMPT
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
  // Look for the pattern ```md followed by { and ending with } followed by ```
  // We need to find the FIRST ```md that contains JSON (starts with {)
  const lines = response.split('\n');
  let jsonContent = '';
  let inJsonBlock = false;
  let braceCount = 0;
  let started = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for ```md or ```json start
    if (!inJsonBlock && (line.trim().startsWith('```md') || line.trim().startsWith('```json'))) {
      inJsonBlock = true;
      started = false;
      braceCount = 0;
      jsonContent = '';
      continue;
    }
    
    if (inJsonBlock) {
      // Check for end of code block
      if (line.trim() === '```' && started && braceCount === 0) {
        break;
      }
      
      // Track when we hit the opening brace
      if (!started && line.trim().startsWith('{')) {
        started = true;
      }
      
      if (started) {
        jsonContent += line + '\n';
        // Count braces to handle nested objects
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
  
  // Fallback: try raw JSON extraction
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
  console.log('\n' + '='.repeat(50));
  console.log('  🚀 FlowCode - AI Software Planner');
  console.log('  Chat with AI to plan your next project');
  console.log('='.repeat(50) + '\n');
}

function printHelp() {
  console.log(`
Commands:
  /help     - Show this help message
  /new      - Start a new conversation
  /sessions - List all sessions
  /resume   - Resume a previous session
  /config   - Configure API key
  /folder   - Configure plan folder name
  /export   - Export generated plan files
  /exit     - Exit FlowCode
`);
}

async function setupApiKey(rl) {
  const config = getConfig();
  
  if (!config.geminiApiKey) {
    console.log('\n⚠️  No API key configured.\n');
    return new Promise((resolve) => {
      rl.question('Enter your Gemini API key: ', (apiKey) => {
        config.geminiApiKey = apiKey;
        
        if (!config.planFolderName) {
          rl.question('Plan folder name (default: plan): ', (folderName) => {
            config.planFolderName = folderName.trim() || 'plan';
            saveConfig(config);
            console.log('✅ Configuration saved!\n');
            resolve(config);
          });
        } else {
          saveConfig(config);
          console.log('✅ API key saved!\n');
          resolve(config);
        }
      });
    });
  }
  
  return config;
}

function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
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
  console.log('-'.repeat(50));

  // Print conversation history
  if (session.messages.length > 0) {
    console.log('\n--- Previous conversation ---\n');
    session.messages.forEach(msg => {
      const prefix = msg.role === 'user' ? '👤 You' : '🤖 AI';
      console.log(`${prefix}: ${msg.content}\n`);
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
      const command = trimmed.toLowerCase();

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
              console.log(`  ${i + 1}. ${s.projectName} - ${date}`);
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
          const newKey = await question(rl, 'Enter new API key: ');
          if (newKey) {
            const currentConfig = getConfig();
            currentConfig.geminiApiKey = newKey;
            saveConfig(currentConfig);
            console.log('✅ API key updated!\n');
          }
          break;
          
        case '/folder':
          const currentConfig = getConfig();
          const newFolder = await question(rl, `Current folder: ${currentConfig.planFolderName || 'plan'}. Enter new folder name: `);
          if (newFolder && newFolder.trim()) {
            currentConfig.planFolderName = newFolder.trim();
            saveConfig(currentConfig);
            console.log(`✅ Plan folder updated to: ${newFolder.trim()}\n`);
          } else {
            console.log('Folder name unchanged.\n');
          }
          break;
          
        case '/export':
          const exportConfig = getConfig();
          const exportPath = getPlanFolderPath(session.projectPath);
          const versionedPath = getVersionedPlanFolderPath(session.projectPath, session.planVersion || 1);
          
          if (session.planGenerated) {
            console.log(`\n📁 Plan files location:`);
            console.log(`   Versioned: ${versionedPath}/`);
            console.log(`   Current: ${exportPath}/`);
            console.log(`\n📄 Files generated:`);
            const fileOrder = ['PRD', 'ARCHITECTURE', 'STACK', 'TASKS', 'STRUCTURE', 'SCHEMA', 'CONVENTIONS', 'ENV', 'API', 'UI', 'ERRORS'];
            for (const fileName of fileOrder) {
              const filePath = path.join(versionedPath, `${fileName.toLowerCase()}.md`);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = (stats.size / 1024).toFixed(1);
                console.log(`   ✅ ${fileName}.md (${sizeKB} KB)`);
              } else {
                console.log(`   ❌ ${fileName}.md (not found)`);
              }
            }
            console.log('');
          } else {
            console.log('\n❌ No plan generated yet for this session. Chat with AI to generate a plan first.\n');
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
