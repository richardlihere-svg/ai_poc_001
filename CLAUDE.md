# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **AI POC 001** - a minimal playground for AI-assisted development focused on maintaining high code quality when generating or refactoring code with AI assistance.

## Architecture

This is a documentation and template repository containing:

- **AI_CODEGEN_RULES.md**: Comprehensive engineering rules (7,096 bytes) covering SOLID/DRY/KISS/YAGNI principles, security guidelines, and language-specific conventions for TypeScript/JavaScript, Python, and Go
- **prd.md**: Epic stories and acceptance criteria for a logistics management system (written in Chinese) - serves as example requirements documentation
- **README.md**: Project overview emphasizing quality-first development and atomic PR workflow

The repository serves as a foundation for AI-assisted development projects where code quality and engineering principles are paramount.

## Development Standards

### Engineering Principles
Always follow the comprehensive rules in `AI_CODEGEN_RULES.md` which enforce:

- **SOLID principles**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY**: Extract common logic, avoid copy-paste implementations
- **KISS**: Choose simplest working designs, limit nesting to 2-3 levels
- **YAGNI**: Don't implement features not driven by current requirements

### Code Quality Requirements
- Functions should be small (≤40-60 lines) and single-purpose
- Function parameters ≤3 (use objects for more)
- Use semantic naming with complete words, no arbitrary abbreviations
- Extract magic numbers/strings as named constants
- Implement proper error handling with consistent error models
- Add logging at appropriate levels (debug/info/warn/error)

### Language-Specific Rules
When working with:
- **TypeScript/JavaScript**: Use strict mode, avoid `any`, prefer `async/await`
- **Python**: Full type annotations, use context managers for I/O, enable static checking
- **Go**: Small focused interfaces, use `context.Context`, handle all errors explicitly

### Security & Safety
- Never store secrets/credentials in code
- Validate all external inputs
- Set timeouts/retries for external calls
- Avoid `eval`, SQL injection, and other common vulnerabilities

## Development Workflow

- Start small, iterate quickly, commit frequently
- Keep PRs atomic and reviewable
- Follow Conventional Commits format (`feat:`, `fix:`, etc.)
- Ensure all checks pass before opening PRs

## Usage as Template

When implementing actual code in this repository or using it as a template:

1. **Reference AI_CODEGEN_RULES.md** before writing any code
2. **Use prd.md** as an example of how to structure requirements with Epics and acceptance criteria
3. **Follow the commit message format** specified in README.md (Conventional Commits: `feat:`, `fix:`, etc.)

No build tools, test frameworks, or package managers are currently configured since this is a documentation/template repository.

## Quality Assurance

Before any code submission, verify:
1. Semantic naming, single-responsibility functions, no magic constants
2. Public interfaces documented with examples
3. No duplicated code, common logic extracted
4. Consistent error handling and clear logging
5. Necessary tests added and passing
6. Code formatted and passes static checks
7. Performance and security boundaries evaluated