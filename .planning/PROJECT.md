# La Home Zap

## What This Is

Uma extensão exclusiva do Google Chrome para o WhatsApp Web/Business que permite aos atendentes da La Home Care gerenciar e repassar demandas recebidas do Hapvida de forma rápida, eficiente e centralizada. O projeto é de uso interno e focado em otimizar a comunicação diária sem a necessidade de uma infraestrutura de servidor complexa.

## Core Value

Agilizar o repasse de demandas do Hapvida para os prestadores/equipe internos diretamente no WhatsApp Web, eliminando tarefas repetitivas e garantindo rastreabilidade do atendimento.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Painel lateral de demandas (Mini-Kanban) injetado no WhatsApp Web
- [ ] Detecção automática de mensagens do contato Hapvida para gerar demandas
- [ ] Repasse rápido de mensagens com 1 clique para grupos/prestadores pré-definidos
- [ ] Menu de menções rápidas digitando `@@` (favoritos por grupo)
- [ ] Menção rápida em lote (`@todos` do grupo)
- [ ] Menção urgente com formatação automática (`@Nome 🚨 URGENTE:`)
- [ ] Etiquetas coloridas de status para conversas/grupos (Aguardando Hapvida, Em Triagem, Atribuído, Atendido)
- [ ] Inserção de frases padrão/templates com substituição de variáveis
- [ ] Assinatura/identificação automática do atendente nas mensagens enviadas
- [ ] Tela de configurações (Options) para números do Hapvida, favoritos, templates e atendentes
- [ ] Sincronização de configurações e status usando `chrome.storage.sync`

### Out of Scope

- [ ] Plataforma SaaS multi-tenant comercial — o sistema é de uso exclusivo interno
- [ ] Servidor backend tradicional próprio — mantendo o custo de infraestrutura zero
- [ ] Relatórios analíticos e BI complexos — o foco é operacional

## Context

A La Home Care coordena atendimentos de pacientes vindos do Hapvida, acionando prestadores (técnicos, fisioterapeutas, cuidadores) via grupos de WhatsApp. Atualmente, usam o Manyzap, mas querem uma ferramenta própria integrada ao WhatsApp Web para 4-10 atendentes locais. O uso do `chrome.storage.sync` resolve a sincronização de dados desde que todos usem contas Google da empresa no Chrome.

## Constraints

- **Tech Stack**: Extensão Chrome Manifest V3, HTML/CSS/JS (React + Vite + TypeScript).
- **Dependência do DOM do WhatsApp**: Alterações visuais feitas pela Meta no WhatsApp Web podem quebrar seletores da extensão, exigindo manutenção centralizada dos seletores.
- **Limites do Storage**: O `chrome.storage.sync` possui limites de cota por item (8KB) e total (100KB), o que restringe o volume de dados salvos (adequado para o escopo de 4-10 atendentes e dados leves).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sincronização via `chrome.storage.sync` | Evita a necessidade de servidor backend próprio, aproveitando contas corporativas do Google Workspace dos atendentes. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-26 after initialization*
