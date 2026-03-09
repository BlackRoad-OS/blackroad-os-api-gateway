# Contributing to blackroad-os-api-gateway

**BlackRoad OS, Inc. — Proprietary Software**

> ⚠️ **ACCESS REQUIRED**: You must obtain a contributor access key before making any contributions. See the [Access Gate](#access-gate) section below.

---

## Access Gate

BlackRoad OS uses a **converter API** to control who can access and contribute to this repository. This applies to both human contributors and AI agents.

### Step 1 — Request Access

```bash
curl -X POST https://gateway.blackroad.io/access/request \
  -H 'Content-Type: application/json' \
  -d '{
    "githubHandle": "your-github-handle",
    "purpose": "Describe what you want to contribute and why",
    "agentType": "human"
  }'
```

### Step 2 — Include Your Key

Once approved, include your key in all API requests:

```
x-blackroad-access-key: brk_<your-key>
```

### AI Agents

Only **@blackboxprogramming** and **@lucidia** are pre-approved AI contributors. All other AI agents (OpenAI Codex, GitHub Copilot, Anthropic Claude, etc.) are **blocked at the edge** and will be rejected with `403 Forbidden`.

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When suggesting an enhancement:

- **Use a clear title** describing the enhancement
- **Provide detailed description** of the suggested feature
- **Explain why** this enhancement would be useful
- **Include examples** of how it would work

### Pull Requests

1. **Obtain** a contributor access key (see [Access Gate](#access-gate))
2. **Fork** the repository
3. **Create** a new branch (`git checkout -b feature/amazing-feature`)
4. **Make** your changes
5. **Test** your changes thoroughly
6. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
7. **Push** to your fork (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

#### Pull Request Guidelines

- Follow the existing code style
- Write clear commit messages
- Update documentation as needed
- Add tests for new features
- Ensure all tests pass
- Link related issues

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/blackroad-os-api-gateway.git
cd blackroad-os-api-gateway

# Add upstream remote
git remote add upstream https://github.com/BlackRoad-OS/blackroad-os-api-gateway.git

# Install dependencies
pnpm install

# Run tests
pnpm test
```

## Coding Standards

- Follow language-specific best practices
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names
- Mark any auth/payment/compliance path with `// COMPLIANCE-SENSITIVE GATEWAY PATH`

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): Add OAuth 2.0 PKCE authorization flow
fix(stripe): Correct webhook signature verification
docs(readme): Update quickstart instructions
```

## BlackRoad OS Principles

When contributing, please align with our core principles:

- 🔱 **Sovereignty**: Users own their data and infrastructure
- 🔒 **Privacy**: No telemetry, tracking, or external AI dependencies
- 🌐 **Offline-First**: Features should work without internet where possible
- 🎨 **Design Excellence**: Follow BlackRoad design system
- 🚀 **Production Quality**: Code should be reliable and scalable

### What We Don't Accept

- ❌ Adding external analytics or telemetry
- ❌ Routing traffic to OpenAI, Anthropic, or other third-party AI vendors
- ❌ Required internet connectivity for core features
- ❌ Vendor lock-in mechanisms
- ❌ Cloud-only functionality
- ❌ Compromising user privacy
- ❌ Contributions from unapproved AI agents

## Questions?

- **GitHub Issues**: For bug reports and feature requests
- **Email**: blackroad.systems@gmail.com
- **Website**: [blackroad.io](https://blackroad.io)

---

**Thank you for contributing to BlackRoad OS!** 💜

*The road remembers every contribution.* 🌌

