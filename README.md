# FlowCode - AI Software Planner

🚀 **Transform your software ideas into actionable plans with AI-powered guidance**

FlowCode is an intelligent CLI tool that helps you shape your software ideas into comprehensive, production-ready project plans. Powered by Google's Gemini AI, it acts like a senior engineer friend who asks the right questions and generates detailed documentation across 21 specialized markdown files.

---

## ✨ Features

### 🤖 AI-Powered Planning
- **Conversational Interface**: Chat naturally about your idea
- **Smart Questioning**: AI asks one question at a time to understand your vision
- **Context-Aware**: Remembers your entire conversation history
- **Custom Instructions**: Set personalized AI behavior for your workflow

### 📚 Comprehensive Documentation (21 Files)
Generate production-ready markdown files covering every aspect:

**Core Files**
- PRD, Architecture, Stack, Tasks, Structure, Schema
- Conventions, ENV, API, UI, Errors

**AI Agent Files**
- Orchestrator, Testing, Intelligence, Workflow, Prompts, Evaluation

**Production Files**
- Dependencies, Security, Deployment, Monitoring

### 🎯 Customization
- **File Selection**: Choose only the files you need (toggle 21 files)
- **Custom Files**: Add project-specific files (e.g., KUBERNETES.md, DOCKER.md)
- **Custom Instructions**: Set AI behavior preferences
- **Version Control**: Plans are versioned (v1, v2, v3...) for iteration

### 💾 Session Management
- **Auto-Save**: Every conversation is saved automatically
- **Resume Anytime**: Pick up where you left off
- **Context Export**: Export/import conversation context
- **Multi-Project**: Manage multiple projects simultaneously

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Google Gemini API key ([Get it free](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/deecodek/gemini-planner.git
cd gemini-planner

# Install dependencies
npm install

# Link globally (optional - allows running from anywhere)
npm link
```

### First Run

```bash
# Run from project directory
npm start

# Or if linked globally
flowcode
```

On first run:
1. Enter your Gemini API key
2. Name your project
3. Start chatting about your idea!

---

## 📖 Usage Guide

### Basic Commands

```
/help       - Show all available commands
/new        - Start a new conversation/project
/sessions   - List all previous sessions
/resume     - Resume a previous session
/config     - View/update API key and settings
/files      - Select which markdown files to generate
/export     - Export plan files to a folder
/context    - Export conversation context
/import     - Import conversation context
/instructions - Set custom AI instructions
/custom     - Add custom markdown file
/exit       - Exit FlowCode
```

### Example Workflow

```bash
# 1. Start FlowCode
flowcode

# 2. Enter API key (first time only)
Enter your Gemini API key: AIzaSy...

# 3. Name your project
Project name: Fake Job Detection System

# 4. Chat about your idea
> I want to build a fake job detection system using Gemini AI

# 5. Answer AI's questions (one at a time)
# 6. When ready, AI generates the plan
> generate the plan

# 7. View generated files
📝 Generating plan files...
   ✅ PRD.md
   ✅ ARCHITECTURE.md
   ✅ STACK.md
   ...

# 8. Export to your project
/export
Enter export folder name: ./docs
```

### Advanced Features

#### Select Specific Files
```bash
/files
# Toggle files by number, press Enter when done
# Only selected files will be generated
```

#### Set Custom Instructions
```bash
/instructions
# Example: "Focus on microservices and cloud-native patterns"
# Example: "Keep explanations brief and technical"
```

#### Add Custom Files
```bash
/custom
Custom file name: KUBERNETES
Description: Kubernetes deployment configurations
```

#### Export/Import Context
```bash
# Export conversation to share or backup
/context

# Import conversation on another machine
/import
Enter context file path: ~/.flowcode/contexts/session_xxx.json
```

---

## 📁 Project Structure

After generating a plan:

```
YourProject/
├── plan/
│   └── v1/
│       ├── prd.md
│       ├── architecture.md
│       ├── stack.md
│       ├── tasks.md
│       ├── structure.md
│       ├── schema.md
│       ├── conventions.md
│       ├── env.md
│       ├── api.md
│       ├── ui.md
│       ├── errors.md
│       ├── orchestrator.md
│       ├── testing.md
│       ├── intelligence.md
│       ├── workflow.md
│       ├── prompts.md
│       ├── evaluation.md
│       ├── dependencies.md
│       ├── security.md
│       ├── deployment.md
│       └── monitoring.md
└── .flowcode/
    └── sessions/
        └── session_xxx.json
```

---

## ⚙️ Configuration

Config is stored at `~/.flowcode/config.json`

```json
{
  "geminiApiKey": "your-api-key",
  "planFolderName": "plan",
  "customInstructions": "Focus on scalability and security",
  "customFiles": [
    { "name": "KUBERNETES", "description": "K8s deployment configs" }
  ],
  "selectedFiles": ["PRD", "ARCHITECTURE", "STACK", ...]
}
```

---

## 🎯 Use Cases

### For Developers
- Plan new features before coding
- Generate technical documentation
- Create onboarding docs for team members

### For Teams
- Collaborative project planning
- Standardize documentation across projects
- Knowledge transfer and handoffs

### For AI Agents
- Generate structured prompts for coding agents
- Create testing specifications
- Define agent workflows and orchestration

---

## 🔐 Privacy & Security

- **Local Storage**: All conversations stored locally at `~/.flowcode/`
- **No Cloud**: Your data never leaves your machine (except Gemini API calls)
- **API Key Safety**: Keys stored in user home directory, not project folders
- **Export Control**: You choose what to export and where

---

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests (if available)
npm test
```

---

## 📝 Examples

### Example 1: Web Application
```
> I want to build a task management app for remote teams
> - Users can create, assign, and track tasks
> - Real-time collaboration features
> - Integration with Slack and GitHub
> - Should scale to 10,000 users
```

### Example 2: AI Agent System
```
> I need an AI agent that monitors server logs and detects anomalies
> - Uses machine learning for pattern recognition
> - Sends alerts via email and SMS
> - Dashboard for viewing detected issues
> - Must handle 1M log entries per day
```

### Example 3: API Service
```
> Building a payment processing API
> - Stripe integration
> - Webhook handling
> - Transaction history
> - PCI compliance requirements
> - Multi-currency support
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- Powered by [Google Gemini AI](https://ai.google.dev/)
- Built with Node.js and readline interface
- Inspired by senior engineers who love asking "Have you considered...?"

---

## 📬 Support

- **Issues**: [GitHub Issues](https://github.com/deecodek/gemini-planner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/deecodek/gemini-planner/discussions)
- **Email**: [Your contact email]

---

## 🌟 Star History

If you find FlowCode useful, please consider giving it a ⭐ star on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=deecodek/gemini-planner&type=Date)](https://star-history.com/#deecodek/gemini-planner&Date)

---

**Made with ❤️ by [Your Name/Team]**
