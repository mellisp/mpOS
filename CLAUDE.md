# CLAUDE.md

## Project Overview

**Bits-and-bobs** is a collection of miscellaneous utilities, scripts, and small projects. This repository serves as a general-purpose workspace for standalone tools and experiments.

## Repository Structure

This is a multi-purpose repository. Files and directories are organized by topic or function at the top level. When adding new content, group related files into their own directory with a descriptive name.

## Development Guidelines

### General Conventions

- Keep each utility or script self-contained where possible
- Include usage comments or a README within subdirectories for non-trivial projects
- Prefer clarity over cleverness in all code
- Use descriptive file and directory names that convey purpose

### Git Workflow

- Use feature branches for new additions
- Write clear, descriptive commit messages summarizing the "why" not just the "what"
- Keep commits focused and atomic (one logical change per commit)

### Adding New Content

When adding a new utility or project:

1. Create a dedicated directory if it involves multiple files
2. Include any necessary dependency or build instructions in the directory
3. Ensure scripts are executable and include a shebang line where appropriate
4. Add a brief description of what the tool does at the top of the main file

### Code Quality

- No secrets, credentials, or API keys should be committed
- Scripts should handle errors gracefully and provide useful error messages
- Use consistent formatting within each file (follow the conventions of the language being used)
