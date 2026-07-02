# Specway — Spec-Driven + TDD Methodology

[![npm](https://img.shields.io/npm/v/@lucasfelipe23/specway)](https://www.npmjs.com/package/@lucasfelipe23/specway)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Methodology](https://img.shields.io/badge/methodology-spec--driven_%2B_TDD-blue)](https://github.com/lucasfelipe24/sdd-kit/blob/master/METHODOLOGY.md)
[![AI Ready](https://img.shields.io/badge/AI_Agent-ready-green)](https://github.com/lucasfelipe24/sdd-kit/blob/master/AGENTS.md)
![Status](https://img.shields.io/badge/status-stable-brightgreen)

Um kit de partida para projetos de software com metodologia integrada de engenharia de requisitos, desenvolvimento orientado a especificações e TDD.

## Metodologia

Este Specway implementa um fluxo completo de engenharia de software:

```
IDEA BRUTA
  → ELICITAÇÃO (gather-requirements: User Stories, Use Cases, Job Stories, BDD)
    → ANÁLISE (MoSCoW, stakeholders, riscos, dependências)
      → ESPECIFICAÇÃO (specs em .specs/changes/)
        → TDD (Red → Green → Refactor)
          → ARQUIVO (specs completas em .specs/archive/)
        ↙
MEMÓRIA (clean-code.md, component-catalog.md)
CONSISTÊNCIA (check-consistency pré-commit)
```

### Pilares

| Pilar | Descrição |
|---|---|
| **Requirements Engineering** | Elicitação e análise de requisitos antes de qualquer código |
| **Spec-Driven Development** | Toda mudança passa por um documento de especificação |
| **Test-Driven Development** | Testes escritos antes da implementação (Red → Green → Refactor) |
| **ADR (Architecture Decision Records)** | Decisões de arquitetura documentadas e rastreáveis |
| **Clean Code** | SOLID, métricas e anti-padrões definidos em `.specs/memory/clean-code.md` |
| **Reusable Catalog** | Catálogo vivo de componentes reutilizáveis em `.specs/memory/component-catalog.md` |
| **Consistency** | Validação automática de skills e convenções via `check-consistency` |
| **AI-Agent Friendly** | Estrutura otimizada para agentes de IA via `AGENTS.md` e skills |

## Uso Rápido

### 0. (Mais rápido) Via CLI, sem clonar

Sem clonar nada, rode a CLI direto do NPM (o `npx` baixa o pacote e copia os arquivos para o
diretório atual):

```bash
npx @lucasfelipe23/specway init      # novo projeto (scaffold + CHANGELOG limpo + tooling)
npx @lucasfelipe23/specway adopt     # projeto existente: sobrepõe sem clobber
npx @lucasfelipe23/specway upgrade   # projeto que já usa a metodologia: aplica só o delta
npx @lucasfelipe23/specway check     # roda os checks de consistência aqui
```

A CLI faz a parte **determinística** (copiar templates, resetar CHANGELOG, atualizar tooling, regenerar
o índice, carimbar a versão); depois você roda a **skill** correspondente (`init-project` /
`scan-project` / `upgrade-methodology`) para a parte de **julgamento** (stack, memória, merges). Fixe
uma versão com `@X.Y.Z` para builds reprodutíveis. Ela nunca executa passos outward-facing (git, releases).

### 1. (Recomendado) One-shot com skill

Diga ao seu agente de IA: `"criar novo projeto"` ou `"create new project"`

A skill `create-project` faz **tudo automaticamente**: clona o repositório do Specway, limpa o `.git`, e inicia o bootstrap interativo com as 9 perguntas da stack. Nenhum comando manual necessário.

### 2. (Alternativo) Clone manual

```bash
git clone https://github.com/lucasfelipe24/sdd-kit.git meu-projeto
cd meu-projeto
rm -rf .git
git init
```

Diga ao seu agente de IA: `"start project"` ou `"iniciar projeto"`

A skill `init-project` fará 9 perguntas sobre sua stack (shell, frontend, backend, banco, testes, cobertura, linguagem, package manager) e preencherá os templates automaticamente.

### Projeto já existente? Adote a metodologia

Se você **já tem um projeto** com código, não use `create-project`/`init-project` (são para projeto
novo). Dentro do repositório existente, diga: `"scan project"` ou `"adopt methodology"`.

A skill `scan-project` **detecta** sua stack (sem perguntas cegas), traz os arquivos da metodologia
**sem sobrescrever** nada do projeto, **rascunha** os documentos de memória a partir do seu código
real (convenções, catálogo de componentes, schema, ADR da stack) e registra um **baseline de
cobertura forward-only** (TDD obrigatório só para mudanças novas).

### Já usa a metodologia? Atualize para a versão mais nova

Se o projeto **já adotou** a metodologia e você quer só **as melhorias mais recentes** (novas skills,
templates, regras do checker, páginas de memória), não rode `scan-project` de novo. Diga:
`"atualizar metodologia"` ou `"upgrade methodology"`.

A skill `upgrade-methodology` é **versão-aware**: compara a versão da metodologia do projeto
(`.specs/config.md## Methodology Version`) com a do Specway e aplica **apenas o delta**, de forma
não-destrutiva — adiciona o que falta, atualiza o tooling do kit, e *anexa* (sem sobrescrever) as
novas seções aos docs do projeto. Veja o changelog de estrutura em `METHODOLOGY.md## Methodology Versions`.

### 3. Comece a desenvolver

Diga ao agente: `"levantar requisitos"` para iniciar a elicitação com a skill `gather-requirements`,
ou `"mudança rápida"` para o caminho leve.

## Estrutura de Diretórios

```
├── .claude/
│   ├── settings.json               # Hook SessionStart: "onde paramos" (Claude Code; opencode ignora)
│   └── skills/                     # Skills (descobertas por opencode E Claude Code)
│       ├── INDEX.md                # Catálogo gerado (name + purpose de cada skill)
│       └── <nome>/SKILL.md         # Uma pasta por skill, com frontmatter name+description
│
├── bin/
│   └── specway.mjs               # CLI: init | adopt | upgrade | check (npx, sem clonar)
│
├── scripts/
│   ├── check-consistency.mjs       # Validador determinístico (roda no CI)
│   ├── update-skills-index.mjs     # Gera .claude/skills/INDEX.md a partir das skills
│   ├── session-context.mjs         # Resumo "onde paramos" (log + specs ativos)
│   ├── cut-release.mjs             # Prepara release (corta CHANGELOG; não taggea)
│   └── update-changelog.mjs        # Gera changelog a partir do archive (idempotente)
│
├── .github/workflows/consistency.yml  # CI: valida skills + changelog em cada push/PR
│
├── .specs/
│   ├── config.md                  # Fonte única de constantes (URL, stacks, defaults, formato de skill)
│   ├── requirements/              # Documentos de elicitação e análise
│   │   └── <nnn>-<slug>/
│   │       └── requirements.md
│   ├── changes/                   # Specs ativas (implementação)
│   │   └── <nnn>-<slug>/
│   │       ├── spec.md
│   │       └── alignment-review.md # Veredito semântico spec↔requisitos (gate de archive)
│   ├── templates/                 # Templates reutilizáveis
│   │   ├── requirements-spec.md   # Template de requisitos (15 seções)
│   │   ├── feature-spec.md        # Template de feature
│   │   ├── bugfix-spec.md         # Template de bugfix
│   │   ├── migration-spec.md      # Template de migração
│   │   ├── test-spec.md           # Template de cobertura de testes
│   │   └── changelog-template.md  # CHANGELOG.md limpo (reset no bootstrap do projeto)
│   ├── archive/                   # Specs concluídas
│   ├── memory/                    # Conhecimento persistente (LLM-Wiki: ver METHODOLOGY.md §6)
│   │   ├── architecture.md        # ADRs
│   │   ├── clean-code.md          # Padrões de código limpo (SOLID, métricas)
│   │   ├── component-catalog.md   # Catálogo de código reutilizável
│   │   ├── conventions.md         # Convenções de código
│   │   ├── glossary.md            # Glossário de domínio
│   │   ├── troubleshooting.md     # Memória de erros e estratégias de correção (TRB-NN)
│   │   └── log.md                 # Journal cronológico append-only (sessão a sessão)
│   └── shared/                    # Documentos de referência
│       ├── schema-current.md
│       ├── schema-target.md
│       └── entity-map.md
│
├── AGENTS.md                      # Instrução-raiz para agentes (índice de skills, fast-path)
├── CLAUDE.md                      # Importa AGENTS.md (@AGENTS.md) — evita divergência
├── CHANGELOG.md                   # Histórico de mudanças (gerado do archive)
├── METHODOLOGY.md                 # Guia completo da metodologia
├── package.json                   # Scripts de tooling do kit (check, changelog)
└── README.md
```

## Templates de Especificação

| Template | Quando usar |
|---|---|
| `requirements-spec.md` | Elicitação: problem statement, stakeholders, user stories, use cases, job stories, BDD, MoSCoW |
| `feature-spec.md` | Features novas: design, estados, edge cases, traceability |
| `bugfix-spec.md` | Correções: reprodução, causa raiz, teste de regressão |
| `migration-spec.md` | Migrações: schema, dados, rollback |
| `test-spec.md` | Cobertura de testes: plano de testes unitários, integração, e2e |

## Skills Disponíveis

O catálogo completo de skills (nome + propósito) é **gerado** em
[`.claude/skills/INDEX.md`](.claude/skills/INDEX.md) a partir das próprias skills
(`node scripts/update-skills-index.mjs`), validado pelo `check-consistency` — não há lista mantida à
mão. Os **gatilhos** (trigger phrases) de cada skill estão na *Referência Rápida de Comandos* abaixo.

## Tecnologias Suportadas

O Specway é agnóstico a tecnologia. Veja `.specs/config.md` para a lista completa de stacks suportadas.

| Camada | Opções |
|---|---|
| **Shell** | Tauri, Electron, Wails, Web, CLI, Mobile, Library |
| **Frontend** | React, Vue, Svelte, Angular, Solid, HTMX, Vanilla |
| **Backend** | Rust, Node, Python, Go, C#, Java, Elixir |
| **Database** | SQLite, PostgreSQL, MySQL, MongoDB, SurrealDB |
| **Testes** | Vitest, Jest, Pytest, Cargo test, Go test, JUnit, xUnit |

## Convenções

- **Backend:** Repository (dados locais), Adapter (API externa), Service (lógica de negócio)
- **Clean Code:** SOLID, funções ≤20 linhas, ≤3 parâmetros, injeção de dependência — veja `.specs/memory/clean-code.md`
- **Reutilização:** consulte `.specs/memory/component-catalog.md` antes de criar código novo
- **IDs sequenciais** por projeto: o mesmo número rastreia `requirements/` → `changes/` → `archive/`
- **Slugs kebab-case**: `001-search-fields`, `002-fix-encoding`
- **Placeholders** `{ENTRE_CHAVES}`: devem ser substituídos por valores reais do projeto
- **Testes primeiro**: nunca escreva implementação antes de testes
- **Bugfix = regression test**: todo bugfix começa com um teste que reproduz o bug
- **Consistência**: execute `"verificar consistência"` antes de commits em skills ou config

## Referência Rápida de Comandos

| Comando | Descrição |
|---|---|
| `"criar novo projeto"` | One-shot: criar projeto do zero (clone + bootstrap) |
| `"iniciar projeto"` | Bootstrap interativo (projeto já clonado) |
| `"scan project"` | Adotar a metodologia em projeto existente (detecta stack, sem clobber) |
| `"atualizar metodologia"` | Atualizar um projeto que já usa a metodologia para a versão mais nova (só o delta) |
| `"mudança rápida"` | Roteador de cerimônia: leve vs completo |
| `"levantar requisitos"` | Iniciar elicitação de requisitos |
| `"revisar alinhamento"` | Verificar semanticamente se o spec cobre os requisitos (gate de archive) |
| `"executar TDD"` | Ciclo Red → Green → Refactor |
| `"registrar troubleshooting"` | Gravar erro + estratégia de correção em `memory/troubleshooting.md` |
| `"criar skill"` | Criar nova skill padronizada |
| `"verificar consistência"` | Validar skills, catálogo e convenções |
| `"atualizar changelog"` | Gerar changelog a partir do archive |
| Ver `METHODOLOGY.md` | Guia completo da metodologia |

## Licença

MIT
