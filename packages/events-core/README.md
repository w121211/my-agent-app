# Cheatsheet

## Command Reference

```sh
# Repomix - Repository packaging tool
pnpm dlx repomix --ignore "node_modules,.log,tmp/"

pnpm dlx repomix src --ignore "**/*.*.ts"

# Syncpack - Dependency management
pnpm dlx syncpack list-mismatches
pnpm dlx syncpack fix-mismatches --types '!local'

# Tree - Display directory structure using git-tracked files
git ls-files | sort | tree --fromfile

# Jest - Run tests
pnpm jest
```
