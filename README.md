# FlowCode

A CLI AI planner that helps you shape your software idea and generates structured markdown files automatically.

## Features

- **Conversational Planning**: Chat with a Gemini-powered AI assistant in your terminal
- **Structured Plan Generation**: Automatically generates 11 markdown plan files (PRD, Architecture, Stack, Tasks, etc.)
- **Session Management**: All conversations are saved and can be resumed anytime
- **Version Control**: Plans are versioned, allowing you to iterate and compare
- **Pure CLI**: No web server, no browser - just your terminal

## Installation

```bash
npm install
```

## Usage

### Start FlowCode

```bash
npm start
```

Or run directly:

```bash
node src/cli/flowcode.js
```

### First Run

On first run, you'll be prompted to enter your Gemini API key. Get one from [Google AI Studio](https://makersuite.google.com/app/apikey).

### Commands

While chatting, you can use these commands:

- `/help` - Show help message
- `/new` - Start a new conversation
- `/sessions` - List all previous sessions
- `/resume` - Resume a previous session
- `/config` - Update your API key
- `/exit` - Exit FlowCode

## Configuration

Config is stored at `~/.flowcode/config.json`

### Settings

- **geminiApiKey**: Your Gemini API key
- **planFolderName**: Name of the plan folder (default: `plan`)

## Plan Files

When the plan is ready, FlowCode creates 11 markdown files in `<project>/plan/v<version>/`:

1. **PRD.md** - Product Requirements Document
2. **ARCHITECTURE.md** - System Architecture
3. **STACK.md** - Technology Stack
4. **TASKS.md** - Structured task list
5. **STRUCTURE.md** - Project file structure
6. **SCHEMA.md** - Data schema
7. **CONVENTIONS.md** - Coding conventions
8. **ENV.md** - Environment variables
9. **API.md** - API design
10. **UI.md** - UI/UX design
11. **ERRORS.md** - Error handling strategy

## Example Session

```
$ npm start

==================================================
  🚀 FlowCode - AI Software Planner
  Chat with AI to plan your next project
==================================================

⚠️  No API key configured.

Enter your Gemini API key: AIzaSy...
✅ API key saved!

Project name: My Awesome App

✨ Started new session: My Awesome App

💬 Start chatting! Type /help for commands.

--------------------------------------------------

> I want to build a task management app

🤖 AI: That sounds interesting! A task management app can take many forms. 
      Let me ask - who is your target audience? Is this for personal use, 
      teams, or something else?

> For small teams of 5-10 people

🤖 AI: Great! Small teams have specific needs. What are the core features 
      you envision? For example: task assignment, due dates, collaboration?

> ... (conversation continues)

🤖 AI: I'll generate the plan now

[JSON output detected]

✅ Plan generated successfully!
   Location: ./plan/v1/
   Files: PRD, ARCHITECTURE, STACK, TASKS, STRUCTURE, SCHEMA, 
          CONVENTIONS, ENV, API, UI, ERRORS
```

## Stack

- **Runtime**: Node.js
- **AI**: Google Generative AI SDK (Gemini)
- **Model**: gemini-2.5-flash

## License

MIT
