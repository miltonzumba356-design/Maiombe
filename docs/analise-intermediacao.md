# MAIOMBE — Guia Completo do Sistema
**Capital & Credit, Lda. · Versão Junho 2026**

> Este documento cobre **tudo**: instalação, autenticação, todos os módulos, a Análise de Intermediação Financeira, o Simulador, os Custos Operacionais e a suite de testes TDD/SDD. Leia de cima para baixo se for a primeira vez. Use o índice se já conhece o sistema.

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Instalação e Arranque](#2-instalação-e-arranque)
3. [Autenticação e Controlo de Acessos](#3-autenticação-e-controlo-de-acessos)
4. [Módulos do Sistema — Guia de Uso](#4-módulos-do-sistema--guia-de-uso)
   - 4.1 Dashboard
   - 4.2 Clientes
   - 4.3 Contratos
   - 4.4 Plano de Amortização
   - 4.5 Fontes de Financiamento
   - 4.6 Taxas, Juros & Comissões
   - 4.7 Alertas
5. [Análise de Intermediação Financeira — Conceito](#5-análise-de-intermediação-financeira--conceito)
6. [Como Registar os Dados (Passo a Passo)](#6-como-registar-os-dados-passo-a-passo)
7. [Custos Operacionais — CRUD Completo](#7-custos-operacionais--crud-completo)
8. [Simulador de Rentabilidade — Guia Completo](#8-simulador-de-rentabilidade--guia-completo)
9. [Análise Real vs Simulador — Diferenças](#9-análise-real-vs-simulador--diferenças)
10. [KPI Cards do Módulo de Taxas](#10-kpi-cards-do-módulo-de-taxas)
11. [API — Endpoints Disponíveis](#11-api--endpoints-disponíveis)
12. [Base de Dados — Estrutura das Tabelas](#12-base-de-dados--estrutura-das-tabelas)
13. [Testes — TDD Backend e SDD Frontend](#13-testes--tdd-backend-e-sdd-frontend)
14. [Perguntas Frequentes](#14-perguntas-frequentes)
15. [Glossário](#15-glossário)

---

## 1. Visão Geral do Sistema

A MAIOMBE é uma plataforma de gestão de crédito e intermediação financeira. O sistema cobre o ciclo de vida completo de uma operação de crédito:

```
CAPTAR DINHEIRO           EMPRESTAR DINHEIRO         MONITORIZAR RESULTADO
(Fontes de Financiamento) (Contratos com Clientes)   (Análise de Intermediação)
         │                          │                           │
   Banco BFA 8% a.a.          MAI-2026-001              Receita Activa
   Accionistas 5% a.a.        15% a.a. / 24m            − Custo Passivo
   Capital Próprio             MAI-2026-002              = Margem Bruta
                               12% a.a. / 36m            − Custos Operacionais
                                                         = Resultado Líquido
```

**Stack Tecnológica**

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + React Router v7 |
| Estado/Fetch | TanStack Query v5 + Axios |
| UI | Tailwind CSS + Lucide React + Motion |
| Backend | Express.js + TypeScript + Node.js |
| Base de Dados | SQLite via `better-sqlite3` |
| Auth | JWT + Argon2 (hash de passwords) |
| Testes Backend | Vitest (TDD) |
| Testes Frontend | Vitest + React Testing Library (SDD) |
| Deploy | Render (backend) + Vercel (frontend) |

---

## 2. Instalação e Arranque

### Pré-requisitos

- Node.js 18 ou superior
- npm 9 ou superior
- Git

### Clonar o repositório

```bash
git clone <url-do-repositório>
cd Mayombe_Front
```

### Backend (servidor Express)

```bash
cd server
npm install

# Primeira execução — criar a base de dados e o schema
npm run db:migrate

# (Opcional) Criar utilizadores por defeito manualmente
npm run db:reset-users
# → cria os 8 utilizadores com password "12345"
# NOTA: em produção (Render) isto é feito automaticamente no arranque

# Arrancar em modo de desenvolvimento (hot-reload)
npm run dev

# Compilar para produção
npm run build

# Arrancar em produção
npm start
```

> **Nota Render:** O servidor detecta automaticamente se a tabela `users` está vazia e cria os utilizadores padrão. Não é necessário correr `db:reset-users` manualmente.

### Frontend (cliente React)

```bash
cd client
npm install

# Arrancar em modo de desenvolvimento
npm run dev
# → disponível em http://localhost:5173

# Build de produção
npm run build

# Pré-visualizar build local
npm run preview
```

### Variáveis de Ambiente

**`server/.env`** (criar manualmente)

```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/maiombe.db
JWT_SECRET=chave-secreta-longa-e-aleatoria
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:5173
```

**`client/.env`** (criar manualmente)

```env
VITE_API_URL=http://localhost:3001/api
```

> Em produção, `VITE_API_URL` deve apontar para o URL do Render, ex: `https://maiombe-server.onrender.com/api`

---

## 3. Autenticação e Controlo de Acessos

### Utilizadores Padrão

Ao arrancar com base de dados vazia, o sistema cria automaticamente 8 contas:

| Email | Password | Papel | Acesso |
|---|---|---|---|
| `administrador@sistema.com` | `12345` | Administrador | Total |
| `director_executivo@sistema.com` | `12345` | Director Executivo | Total |
| `director_financeiro@sistema.com` | `12345` | Director Financeiro | Finanças |
| `gestor_carteira@sistema.com` | `12345` | Gestor de Carteira | Contratos |
| `analista_risco@sistema.com` | `12345` | Analista de Risco | Risco |
| `juridico@sistema.com` | `12345` | Jurídico | Contratos (leitura) |
| `contabilidade@sistema.com` | `12345` | Contabilidade | Taxas, relatórios |
| `auditor@sistema.com` | `12345` | Auditor | Leitura total |

### Como fazer login

1. Abrir `http://localhost:5173` (ou o URL de produção)
2. Inserir email e password
3. Clicar **Entrar**

O token JWT é guardado em `localStorage` e renovado automaticamente dentro do prazo de validade (8h por defeito).

### Permissões por Módulo

| Módulo | Permissão necessária |
|---|---|
| Dashboard | `dashboard / read` |
| Clientes | `clientes / read` e `clientes / write` |
| Contratos | `contratos / read` e `contratos / write` |
| Fontes de Financiamento | `fontes / read` e `fontes / write` |
| Taxas e Juros | `taxas / read` e `taxas / write` |
| Alertas | `alertas / read` |

---

## 4. Módulos do Sistema — Guia de Uso

### 4.1 Dashboard

Visão geral executiva com:
- **KPIs principais:** Total Carteira, Contratos Activos, Exposição, Taxa Média
- **Alertas activos:** contratos em risco, vencimentos próximos
- **Distribuição de carteira** por tipo de entidade
- **Evolução mensal** de desembolsos

Actualize a página para ver dados em tempo real. Todos os números são calculados a partir dos contratos e clientes registados.

---

### 4.2 Clientes

**Criar um cliente:**

1. Menu → **Clientes** → botão **+ Novo Cliente**
2. Preencher obrigatoriamente:
   - Nome completo / Denominação social
   - NIF (único no sistema)
   - Tipo de entidade (ver lista abaixo)
3. Campos opcionais: representante legal, endereço, província, email, telefone
4. Guardar → código `CLI-XXX` é gerado automaticamente

**Tipos de entidade disponíveis:**

| Código | Descrição |
|---|---|
| `governo_central` | Governo Central |
| `ministerio` | Ministério |
| `governo_provincial` | Governo Provincial |
| `administracao_municipal` | Administração Municipal |
| `empresa_publica` | Empresa Pública |
| `empresa_dominio_publico` | Empresa de Domínio Público |
| `empresa_privada` | Empresa Privada |
| `particular` | Particular |
| `entidade_mista` | Entidade Mista |

**Filtros de pesquisa:**
- Por nome ou NIF (campo search)
- Por tipo de entidade
- Paginação: 20 por página por defeito

**Ficha de cliente** (clicar no nome):
- Dados de identificação
- Histórico de contratos
- Avaliações de risco anteriores

---

### 4.3 Contratos

**Criar um contrato:**

1. Menu → **Contratos** → **+ Novo Contrato**
2. Seleccionar o cliente (pesquisa por nome ou NIF)
3. Preencher:

| Campo | Descrição |
|---|---|
| Tipo de Contrato | Modelo A (público), B (privado), C (projecto) |
| Montante (Kz) | Capital a desembolsar |
| Taxa de Juro (% a.a.) | Taxa cobrada ao cliente |
| Prazo (meses) | Duração total do contrato |
| Frequência de Pagamento | Mensal, Bimestral, Trimestral, Semestral, Anual, Única Vencimento |
| Data de Celebração | Data de assinatura do contrato |
| Período de Carência (meses) | Meses iniciais sem amortização (só juros) |
| Taxa de Mora (% a.a.) | Taxa aplicada em caso de atraso |
| Comissão de Abertura (%) | Cobrada na assinatura |

4. Guardar → referência `MAI-AAAA-NNN` gerada automaticamente
5. O plano de amortização é calculado e guardado automaticamente

**Estados do contrato:**

| Estado | Significa |
|---|---|
| `elaboracao` | Em preparação, não activo |
| `em_formalizacao` | A ser formalizado |
| `recebidos` | Activo, capital desembolsado |
| `em_vigor` | Em curso, prestações a decorrer |
| `em_risco` | Sinalizado com risco elevado |
| `vencido` | Prazo ultrapassado sem liquidação |
| `liquidado` | Totalmente pago |
| `cancelado` | Anulado |

> **Importante:** Só contratos com estado **`recebidos`** aparecem na Análise de Intermediação como receita activa.

---

### 4.4 Plano de Amortização

Gerado automaticamente ao criar o contrato. Acessível na ficha do contrato.

**O que cada coluna significa:**

| Coluna | Fórmula |
|---|---|
| Capital Inicial | Capital em dívida no início do período |
| Amortização | Capital Inicial ÷ Nº de períodos sem carência |
| Juros | Capital Inicial × (taxa a.a. / 100 / 12) × nº meses do período |
| Total Prestação | Amortização + Juros |
| Capital Residual | Capital Inicial − Amortização |

**Frequências e número de prestações:**

| Frequência | Meses por período | Prestações para 12 meses |
|---|---|---|
| Mensal | 1 | 12 |
| Bimestral | 2 | 6 |
| Trimestral | 3 | 4 |
| Semestral | 6 | 2 |
| Anual | 12 | 1 |
| Única Vencimento | = prazo total | 1 |

**Período de carência:**
- Durante os N meses de carência: Amortização = 0, só são cobrados juros
- Após a carência: amortização começa a correr sobre o número de períodos restantes

---

### 4.5 Fontes de Financiamento

O módulo de passivo — regista todo o dinheiro captado pela MAIOMBE.

**Criar uma fonte:**

1. Menu → **Fontes de Financiamento** → **+ Nova Fonte**
2. Preencher:

| Campo | Descrição |
|---|---|
| Designação | Nome da fonte (ex: "Linha BFA") |
| Tipo de Fonte | `linha_bancaria`, `capital_proprio`, `debentures`, `obrigacoes`, `fundo`, `outros` |
| Instituição | Nome do banco ou entidade |
| Montante Total (Kz) | Capital total disponibilizado |
| Montante Utilizado (Kz) | Parte já afecta a contratos |
| Taxa de Juro (% a.a.) | Taxa que a MAIOMBE paga a esta fonte |
| Data de Maturidade | Quando termina o contrato com a fonte |
| Garantia Dada | Activos dados em garantia |

3. Guardar → a fonte aparece imediatamente na Análise de Intermediação

**Estados das fontes:**

| Estado | Significa |
|---|---|
| `activa` | Disponível, conta para o custo do passivo |
| `expirada` | Prazo terminou |
| `em_execucao` | Em processo de liquidação |

> Só fontes com estado **`activa`** contribuem para o custo do passivo na análise.

**KPIs das Fontes:**
- Total Captado: soma de todas as fontes activas
- Linhas Bancárias: subtotal de `linha_bancaria`
- Capital Próprio: subtotal de `capital_proprio`
- Taxa Passiva Média: média ponderada das taxas das fontes activas

---

### 4.6 Taxas, Juros & Comissões

Este é o módulo mais rico do sistema. Divide-se em:

**Secção superior — KPIs:**
- Taxa de Juro Base Média
- Custo Médio do Passivo
- Spread Médio
- Tipos de Mutuário
- **Resultado Líquido** (após todos os custos)

**Tabela de Taxas por Tipo de Mutuário:**
Define intervalos de taxa permitidos por tipo de entidade cliente.

**Política de Comissões:**
Define os intervalos de comissão (abertura, gestão, mora, imobilização) aceites internamente.

**Simulador de Rentabilidade:**
Permite simular uma operação antes de a criar. Ver secção 8 para detalhe completo.

**Análise de Intermediação Financeira:**
Visão consolidada com dados reais. Ver secção 5 para detalhe completo.

---

### 4.7 Alertas

O sistema gera alertas automáticos baseados em eventos:

| Tipo | Condição | Urgência |
|---|---|---|
| Prestação vencida | Data de vencimento ultrapassada sem pagamento | Alta |
| Contrato em risco | Score de risco elevado | Média |
| Fonte a expirar | Maturidade nos próximos 30 dias | Média |
| Exposição excessiva | Mutuário com exposição > limite aprovado | Alta |

Os alertas aparecem no Dashboard e no módulo dedicado. Podem ser marcados como lidos ou resolvidos.

---

## 5. Análise de Intermediação Financeira — Conceito

### O que é

A MAIOMBE capta dinheiro a uma taxa (passivo) e empresta a outra taxa superior (activo). A diferença é a base do negócio. Esta secção torna isso visível com dados reais.

### Modelo financeiro

```
RECEITA ACTIVA
= Σ (Capital do contrato × Taxa activa) para cada contrato recebido/activo

CUSTO DO PASSIVO
= Σ (Montante da fonte × Taxa da fonte) para cada fonte activa

MARGEM BRUTA
= Receita Activa − Custo do Passivo

CUSTOS OPERACIONAIS (anuais)
= Σ (Custo mensal × 12) para cada custo operacional activo

RESULTADO LÍQUIDO
= Margem Bruta − Custos Operacionais
```

### Estrutura visual da secção

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ANÁLISE DE INTERMEDIAÇÃO FINANCEIRA                                    │
├──────────┬──────────┬────────────┬──────────────────┬───────────────────┤
│ Receita  │  Custo   │  Margem    │ Custos           │  Resultado        │
│ Activa   │ Passivo  │  Bruta     │ Operacionais     │  Líquido          │
│ (anual)  │ (anual)  │            │ (anual)          │                   │
├──────────┴──────────┴────────────┴──────────────────┴───────────────────┤
│                                                                         │
│  COLUNA 1: Cascata     │  COLUNA 2: Detalhe     │  COLUNA 3: Custos   │
│                        │                         │  Operacionais       │
│  + Receita Activa      │  Fontes de Financ.:     │                     │
│  − Custo do Passivo    │  • Banco BFA      32M   │  [+ Adicionar]      │
│  = Margem Bruta    ███ │  • Accionista     10M   │                     │
│  − Custos Op.          │                         │  Pessoal   8M/mês   │
│  = Resultado Líquido   │  Contratos Activos:     │  Sistema   1M/mês   │
│                        │  • MAI-2026-001   75M   │  Jurídico  0.5M/mês │
│  Spread: +6.5 pp       │  • MAI-2026-002   36M   │                     │
│                        │                         │  Total: 114M Kz/ano │
└────────────────────────┴─────────────────────────┴─────────────────────┘
```

### Como interpretar cada métrica

#### Receita Activa Anual (projectada)

Quanto a MAIOMBE vai receber de juros **num ano** se todos os contratos activos pagarem na totalidade.

```
Exemplo:
  MAI-2026-001: 500.000.000 Kz × 15% = 75.000.000 Kz/ano
  MAI-2026-002: 300.000.000 Kz × 12% = 36.000.000 Kz/ano
  ─────────────────────────────────────────────────────
  Receita Activa Total = 111.000.000 Kz/ano (111 M Kz)
```

> Nota: é uma projecção anualizada. Não inclui comissões avulsas nem juros de mora.

#### Custo do Passivo Anual (projectado)

Quanto a MAIOMBE paga de juros às suas fontes de financiamento **num ano**.

```
Exemplo:
  Banco BFA: 400.000.000 Kz × 8% = 32.000.000 Kz/ano
  Accionista: 200.000.000 Kz × 5% = 10.000.000 Kz/ano
  ─────────────────────────────────────────────────────
  Custo Passivo Total = 42.000.000 Kz/ano (42 M Kz)
```

#### Margem Bruta

```
111 M Kz (Receita Activa)
−  42 M Kz (Custo Passivo)
─────────────────────────
=  69 M Kz (Margem Bruta)
```

#### Spread de Intermediação

```
Taxa Activa Média  = 13.5% a.a.
Taxa Passiva Média =  6.5% a.a.
─────────────────────────────────
Spread             =  +7.0 pp
```

Um spread positivo significa que a MAIOMBE cobra mais do que paga. Spread negativo significa prejuízo antes mesmo dos custos fixos.

#### Custos Operacionais

Custos internos da MAIOMBE registados manualmente. Cada item tem um valor mensal; o sistema multiplica por 12 para o valor anual.

```
Exemplo:
  Salários equipa: 8.000.000 Kz/mês × 12 = 96.000.000 Kz/ano
  Licenças e TI:   1.000.000 Kz/mês × 12 = 12.000.000 Kz/ano
  Jurídico:          500.000 Kz/mês × 12 =  6.000.000 Kz/ano
  ─────────────────────────────────────────────────────────────
  Total Custos Operacionais = 114.000.000 Kz/ano (114 M Kz)
```

#### Resultado Líquido

```
 69 M Kz (Margem Bruta)
−114 M Kz (Custos Operacionais)
────────────────────────────────
= −45 M Kz (Resultado Líquido — prejuízo)
```

Se negativo: os custos superam a margem. Acção necessária.  
Se positivo: a MAIOMBE está a gerar resultado após todos os custos.

---

## 6. Como Registar os Dados (Passo a Passo)

Este é o fluxo completo para ter a análise preenchida com dados reais.

### Passo 1 — Registar Fontes de Financiamento

1. Menu lateral → **Fontes de Financiamento**
2. Clicar **+ Nova Fonte**
3. Preencher:
   - **Designação:** ex. "Linha de Crédito BFA 2026"
   - **Tipo:** `linha_bancaria`
   - **Montante Total (Kz):** 400.000.000
   - **Taxa de Juro (% a.a.):** 8.5
4. Guardar
5. Repetir para todas as fontes activas

**Resultado esperado:** na Análise, a coluna do meio passa a mostrar as fontes com o custo anual calculado.

---

### Passo 2 — Registar Clientes

1. Menu lateral → **Clientes** → **+ Novo Cliente**
2. Preencher Nome, NIF e Tipo de Entidade (obrigatórios)
3. Guardar

---

### Passo 3 — Criar Contratos

1. Menu lateral → **Contratos** → **+ Novo Contrato**
2. Seleccionar o cliente criado no passo anterior
3. Preencher montante, taxa, prazo e frequência
4. Data de Celebração = hoje (ou data real de assinatura)
5. Guardar

**Estado inicial:** `elaboracao` — ainda não conta para a análise.

6. Alterar o estado para **`recebidos`** quando o capital for desembolsado

**Resultado esperado:** o contrato aparece na secção "Contratos Activos" da análise com a receita anual calculada.

---

### Passo 4 — Registar Custos Operacionais

1. Ir ao módulo **Taxas, Juros & Comissões**
2. Descer até à secção **Análise de Intermediação Financeira**
3. Na coluna da direita (Custos Operacionais), clicar **Adicionar**
4. Preencher:
   - **Designação:** ex. "Salários Equipa"
   - **Categoria:** Pessoal
   - **Valor Mensal (Kz):** 8.000.000
5. Guardar

**Resultado esperado:** o custo aparece na lista, o total anual actualiza e o Resultado Líquido recalcula.

---

### Passo 5 — Verificar a Análise

Após os passos anteriores, a secção mostra:
- ✅ Cascata com todos os valores preenchidos
- ✅ Lista de fontes com custo anual por fonte
- ✅ Lista de contratos activos com receita anual por contrato
- ✅ Total de custos operacionais activos
- ✅ Resultado Líquido no KPI card superior

---

## 7. Custos Operacionais — CRUD Completo

### Categorias disponíveis

| Código | Label | Cor |
|---|---|---|
| `pessoal` | Pessoal | Azul |
| `sistema` | Sistema / TI | Roxo |
| `juridico` | Jurídico | Laranja |
| `administrativo` | Administrativo | Verde |
| `outros` | Outros | Cinzento |

### Adicionar um custo

1. Clicar **Adicionar** (coluna Custos Operacionais)
2. Preencher Designação, Categoria e Valor Mensal
3. Clicar **Guardar**

O custo fica activo por defeito (`is_active = 1`).

### Editar um custo

1. Clicar no ícone de lápis ao lado do custo
2. Alterar os campos desejados (designação, categoria, valor ou estado activo/inactivo)
3. Guardar

### Desactivar sem eliminar

No formulário de edição, desmarcar o checkbox **Activo**. O custo mantém-se na lista mas com opacidade reduzida e não conta para o total.

### Eliminar um custo

Clicar no ícone de lixo → confirmação → o registo é removido permanentemente.

### Regra de cálculo

```
Total Custos Operacionais Anual = Σ (amount_monthly × 12)
                                  para todos os registos onde is_active = 1
```

### API dos Custos Operacionais

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/operational-costs` | Listar todos |
| `POST` | `/api/operational-costs` | Criar novo |
| `PUT` | `/api/operational-costs/:id` | Actualizar |
| `DELETE` | `/api/operational-costs/:id` | Eliminar |

Exemplo de body para criação:
```json
{
  "name": "Salários Equipa",
  "category": "pessoal",
  "amount_monthly": 8000000,
  "notes": "Inclui todos os colaboradores directos"
}
```

---

## 8. Simulador de Rentabilidade — Guia Completo

O Simulador está disponível na coluna lateral direita do módulo **Taxas, Juros & Comissões**. Permite testar o resultado financeiro de uma operação **antes de criar o contrato**.

### Campos de entrada

| Campo | Unidade | O que representa |
|---|---|---|
| Capital Mutuado | M Kz | Valor do empréstimo a simular |
| Taxa de Juro Activa | % a.a. | Taxa cobrada ao cliente |
| Prazo | meses | Duração do contrato |
| Com. Abertura | % | Comissão cobrada na assinatura (sobre o capital) |
| Com. Gestão Anual | % | Comissão anual de acompanhamento |
| Capital Não Desembolsado | M Kz | Capital aprovado mas ainda não entregue |
| Dias em Atraso | dias | Para simular acumulação de mora |
| Custo do Passivo | % a.a. | Taxa média paga às fontes de financiamento |
| Custos Op. Mensais | M Kz | **Carregado automaticamente** dos custos registados |

> O campo **Custos Op. Mensais** é pré-preenchido com a soma dos custos operacionais activos da base de dados. Pode ser alterado manualmente para simular cenários.

### Cascata de cálculo completa

```
(+) Juros de Capital
    = Capital × (Taxa Activa / 100) × (Prazo / 12)

(+) Comissão de Abertura
    = Capital × (Com. Abertura / 100)
    (cobrada uma única vez na assinatura)

(+) Comissão de Gestão Anual
    = Capital × (Com. Gestão / 100) × (Prazo / 12)

(+) Comissão de Imobilização   [só se Capital Não Desembolsado > 0]
    = Capital Não Desembolsado × 0.25% × Prazo (meses)

(+) Juros de Mora              [só se Dias em Atraso > 0]
    = Capital × 0.05% × Dias em Atraso
────────────────────────────────────────────────────────
(=) TOTAL RECEITAS

(−) Custo do Passivo
    = Capital × (Custo Passivo / 100) × (Prazo / 12)
────────────────────────────────────────────────────────
(=) MARGEM BRUTA

(−) Custos Operacionais
    = Custos Op. Mensais × Prazo (meses)
────────────────────────────────────────────────────────
(=) RESULTADO LÍQUIDO
```

### Indicadores calculados

| Indicador | Fórmula | Interpretação |
|---|---|---|
| **TIR Efectiva** | Rentabilidade anualizada da operação | > Taxa Passiva = rentável |
| **Spread** | Taxa Activa − Custo do Passivo | > 0 = margem positiva |
| **Resultado / Capital** | Resultado Líquido ÷ Capital × 100 | % de retorno líquido |
| **Capital Recapitalizado (6m)** | Capital × (1 + taxa/12)^6 | Projecção com juro composto |

### Validação da Política de Comissões

O simulador compara automaticamente as comissões introduzidas com os intervalos da Política Interna:

- **Verde:** dentro do intervalo permitido para o tipo de mutuário
- **Laranja + aviso:** fora do intervalo — requer aprovação adicional

### Exemplo prático completo

```
Capital Mutuado:         500 M Kz
Taxa Activa:              15% a.a.
Prazo:                    24 meses
Com. Abertura:            1.5%
Com. Gestão Anual:        0.5%
Custo do Passivo:         8% a.a.
Custos Op. Mensais:       9.5 M Kz

────────── CÁLCULO ──────────
Juros de Capital  = 500M × 15% × 2        = 150.0 M Kz
Com. Abertura     = 500M × 1.5%            =   7.5 M Kz
Com. Gestão       = 500M × 0.5% × 2       =   5.0 M Kz
──────────────────────────────────────────────────────
TOTAL RECEITAS                             = 162.5 M Kz

Custo Passivo     = 500M × 8% × 2         =  80.0 M Kz
──────────────────────────────────────────────────────
MARGEM BRUTA                               =  82.5 M Kz

Custos Op.        = 9.5M × 24             = 228.0 M Kz
──────────────────────────────────────────────────────
RESULTADO LÍQUIDO                          = −145.5 M Kz ⚠️

→ Interpretação: a operação isolada não cobre os custos operacionais totais
  de 24 meses. É necessário ter mais contratos activos para diluir os custos.
```

---

## 9. Análise Real vs Simulador — Diferenças

| Aspecto | Simulador | Análise de Intermediação |
|---|---|---|
| **Fonte de dados** | Campos inseridos manualmente | Base de dados (dados reais) |
| **Contratos** | 1 contrato hipotético | Todos os contratos com estado `recebidos` |
| **Fontes de financiamento** | Custo passivo médio (um número) | Cada fonte individualmente |
| **Custos operacionais** | Carregados da BD (editáveis) | Todos os custos activos da BD |
| **Finalidade** | Decisão pré-contrato | Monitorização contínua |
| **Granularidade** | Por operação | Toda a carteira |
| **Comissões incluídas** | Sim (abertura, gestão, mora) | Não (só juros base) |

---

## 10. KPI Cards do Módulo de Taxas

O módulo de Taxas mostra 5 cards no topo da página:

| Card | Fonte de dados | Quando é negativo |
|---|---|---|
| **Taxa de Juro Base Média** | Média das taxas da Tabela de Taxas | N/A |
| **Custo Médio do Passivo** | Média ponderada das fontes activas | N/A |
| **Spread Médio** | Taxa Activa Média − Taxa Passiva Média | Quando spread < 0 |
| **Tipos de Mutuário** | Contagem de linhas na Tabela de Taxas | N/A |
| **Resultado Líquido** | `marginTotais.resultadoLiquido` | Quando resultado < 0 (card vermelho) |

O card **Resultado Líquido** actualiza em tempo real com os dados da API `/api/margin`.

---

## 11. API — Endpoints Disponíveis

Todos os endpoints requerem header `Authorization: Bearer <token>`.

### Autenticação

| Método | URL | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login — devolve `{ token, user }` |
| `POST` | `/api/auth/logout` | Logout (invalida sessão) |
| `GET` | `/api/auth/me` | Dados do utilizador autenticado |

### Clientes

| Método | URL | Query Params |
|---|---|---|
| `GET` | `/api/clients` | `search`, `entity_type`, `page`, `limit` |
| `GET` | `/api/clients/:id` | — |
| `POST` | `/api/clients` | — |
| `PUT` | `/api/clients/:id` | — |
| `DELETE` | `/api/clients/:id` | — (soft delete) |

### Contratos

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/contracts` | Listar com filtros |
| `GET` | `/api/contracts/:id` | Detalhe + plano amortização |
| `POST` | `/api/contracts` | Criar contrato + gerar plano |
| `PUT` | `/api/contracts/:id` | Actualizar campos |
| `PUT` | `/api/contracts/:id/status` | Alterar estado |
| `DELETE` | `/api/contracts/:id` | Soft delete |
| `GET` | `/api/contracts/:id/schedule` | Plano de amortização |
| `POST` | `/api/contracts/:id/payment` | Registar pagamento |

### Fontes de Financiamento

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/funding-sources` | Listar todas |
| `GET` | `/api/funding-sources/kpis` | KPIs agregados |
| `GET` | `/api/funding-sources/:id` | Detalhe |
| `POST` | `/api/funding-sources` | Criar |
| `PUT` | `/api/funding-sources/:id` | Actualizar |
| `DELETE` | `/api/funding-sources/:id` | Eliminar |

### Taxas & Análise

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/rates` | Tabela de taxas por mutuário |
| `POST` | `/api/rates` | Criar linha de taxa |
| `PUT` | `/api/rates/:id` | Actualizar |
| `DELETE` | `/api/rates/:id` | Eliminar |
| `GET` | `/api/commission-policy` | Política de comissões |
| `POST` | `/api/commission-policy` | Criar política |
| `PUT` | `/api/commission-policy/:id` | Actualizar |
| `GET` | `/api/margin` | **Análise de intermediação completa** |

### Custos Operacionais

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/operational-costs` | Listar todos |
| `POST` | `/api/operational-costs` | Criar |
| `PUT` | `/api/operational-costs/:id` | Actualizar |
| `DELETE` | `/api/operational-costs/:id` | Eliminar |

### Alertas

| Método | URL | Descrição |
|---|---|---|
| `GET` | `/api/alerts` | Listar alertas activos |
| `PUT` | `/api/alerts/:id/read` | Marcar como lido |
| `GET` | `/api/alerts/stream` | SSE — stream em tempo real |

### Resposta do endpoint `/api/margin`

```json
{
  "fontes": [
    {
      "id": "uuid",
      "name": "Linha BFA",
      "interest_rate": 8.5,
      "total_amount": 400000000,
      "custoAnual": 34000000
    }
  ],
  "contratos": [
    {
      "id": "uuid",
      "reference": "MAI-2026-001",
      "amount": 500000000,
      "interest_rate": 15,
      "client_name": "Ministério das Finanças",
      "receitaAnual": 75000000
    }
  ],
  "custosOp": [
    {
      "id": "uuid",
      "name": "Salários Equipa",
      "category": "pessoal",
      "amount_monthly": 8000000,
      "is_active": 1
    }
  ],
  "totais": {
    "receitaActiva": 111000000,
    "custoPassivo": 42000000,
    "margemBruta": 69000000,
    "custosOperacionais": 114000000,
    "resultadoLiquido": -45000000,
    "taxaActivaMedia": 13.5,
    "taxaPassivaMedia": 6.5,
    "spread": 7.0,
    "totalFontes": 600000000,
    "totalContratos": 800000000
  }
}
```

---

## 12. Base de Dados — Estrutura das Tabelas

O ficheiro SQLite está em `server/data/maiombe.db`.

### Tabelas principais

```
users                    → utilizadores do sistema
clients                  → mutuários (entidades que recebem crédito)
contracts                → contratos de crédito
amortization_schedules   → plano de amortização (linhas calculadas)
payments                 → pagamentos registados
risk_assessments         → avaliações de risco por contrato/cliente
funding_sources          → fontes de financiamento (passivo)
operational_costs        → custos operacionais internos
rates                    → tabela de taxas por tipo de mutuário
commission_policy        → política de comissões
alerts                   → alertas automáticos e manuais
```

### Tabela `operational_costs`

```sql
CREATE TABLE operational_costs (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL CHECK(category IN (
                   'pessoal','sistema','juridico','administrativo','outros'
                 )),
  amount_monthly REAL NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela `funding_sources`

```sql
CREATE TABLE funding_sources (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  source_type      TEXT NOT NULL,
  institution      TEXT,
  product          TEXT,
  total_amount     REAL NOT NULL,
  utilized_amount  REAL NOT NULL DEFAULT 0,
  interest_rate    REAL NOT NULL DEFAULT 0,
  maturity_date    TEXT,
  guarantee_given  TEXT,
  status           TEXT NOT NULL DEFAULT 'activa',
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Relações entre tabelas

```
users ──────────┐
                ▼
clients ───→ contracts ───→ amortization_schedules
                │
                └──────────→ payments
                └──────────→ risk_assessments

funding_sources  (independente dos contratos — visão agregada)
operational_costs (independente — custos internos)
```

---

## 13. Testes — TDD Backend e SDD Frontend

### Filosofia

- **TDD (Test-Driven Development)** no backend: os testes especificam o comportamento dos serviços e da lógica de negócio
- **SDD (Specification-Driven Development)** no frontend: os testes descrevem o que cada componente deve exibir e como deve se comportar

### Como correr os testes

```bash
# Backend — todos os testes
cd server
npm test

# Backend — modo watch (re-corre ao guardar)
npm test -- --watch

# Backend — com cobertura
npm test -- --coverage

# Frontend — todos os testes
cd client
npm test

# Frontend — modo watch
npm test -- --watch

# Frontend — com cobertura
npm run test:coverage
```

### Suite de Testes Backend (Vitest)

#### Estrutura de ficheiros

```
server/
├── vitest.config.ts
└── src/
    └── tests/
        ├── setup.ts                    ← silencia o logger
        ├── helpers/
        │   └── testDb.ts               ← DB in-memory com schema completo
        ├── amortization.test.ts        ← TDD da função mais crítica
        ├── clients.service.test.ts     ← TDD do serviço de clientes
        ├── funding.service.test.ts     ← TDD do serviço de fontes
        └── errors.test.ts              ← TDD da hierarquia de erros
```

#### `testDb.ts` — Base de dados de teste

Cria uma instância SQLite **in-memory** (`:memory:`) com o schema completo aplicado. Cada suite de testes tem a sua própria instância isolada.

```typescript
import { createTestDb, clearTable } from './helpers/testDb';

beforeAll(() => {
  db = createTestDb(); // DB isolada, descartada no fim
});

afterEach(() => {
  clearTable(db, 'clients'); // Limpa entre testes
});
```

#### Como o mock funciona

O `getDatabase()` é um singleton no código de produção. Nos testes, é substituído via `vi.mock`:

```typescript
let db: Database.Database;

vi.mock('../database/connection', () => ({
  getDatabase: () => db,   // ← aponta para a BD in-memory
  closeDatabase: vi.fn(),
}));

beforeAll(() => {
  db = createTestDb();     // ← cria a BD antes dos testes
});
```

O `vi.mock` é içado (*hoisted*) pelo Vitest antes da execução, garantindo que o módulo do serviço vê sempre a BD de teste.

#### Cobertura dos testes backend (44 testes)

**`amortization.test.ts` — 15 testes**

| Grupo | Teste |
|---|---|
| Nº de prestações | mensal/12 → 12 prestações |
| Nº de prestações | trimestral/12 → 4 prestações |
| Nº de prestações | semestral/24 → 4 prestações |
| Nº de prestações | única vencimento → 1 prestação |
| Capital residual | última prestação = 0 |
| Capital residual | 1ª prestação = montante inicial |
| Capital residual | decresce monotonicamente |
| Período carência | durante carência: amortização = 0 |
| Período carência | após carência: amortização > 0 |
| Juros | 1ª prestação = capital × taxa mensal |
| Juros | total de juros < juro simples |
| Total prestação | total ≈ amortização + juros (±1 Kz) |
| Numeração | installment_number sequencial 1..N |
| Datas | due_date avança pelo período da frequência |
| Gravação | linhas guardadas na tabela amortization_schedules |

**`clients.service.test.ts` — 11 testes**

| Método | Teste |
|---|---|
| `create()` | Cria cliente com id gerado |
| `create()` | Gera código CLI-XXX automático |
| `create()` | Rejeita NIF duplicado |
| `list()` | Devolve lista vazia |
| `list()` | Devolve clientes criados |
| `list()` | Filtra por entity_type |
| `list()` | Filtra por search (nome) |
| `list()` | Respeita paginação (page/limit) |
| `findById()` | Encontra por id |
| `findById()` | Lança NotFoundError para id inexistente |
| `update()` | Actualiza campos do cliente |

**`funding.service.test.ts` — 9 testes**

| Método | Teste |
|---|---|
| `create()` | Cria com status activa por defeito |
| `create()` | utilized_amount assume 0 |
| `list()` | Devolve lista vazia |
| `list()` | Ordena por total_amount desc |
| `getKpis()` | totalCaptado = soma das fontes activas |
| `getKpis()` | linhasBancarias filtra só linha_bancaria |
| `getKpis()` | KPIs zerados sem fontes |
| `findById()` | Encontra por id |
| `findById()` | Lança erro para id inexistente |

**`errors.test.ts` — 9 testes**

Valida toda a hierarquia de erros: `AppError`, `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ValidationError` (422), `ConflictError` (409).

---

### Suite de Testes Frontend (Vitest + React Testing Library)

#### Estrutura de ficheiros

```
client/
├── vitest.config.ts
└── src/
    ├── tests/
    │   └── setup.ts                      ← importa @testing-library/jest-dom
    ├── lib/
    │   ├── utils.test.ts                 ← SDD dos utilitários de formatação
    │   └── toast.test.ts                 ← SDD do store de notificações
    └── components/
        └── ui/
            ├── KpiCard.test.tsx          ← SDD do componente KpiCard
            └── Badge.test.tsx            ← SDD de Badge, RepaymentTag, ProgressBar
```

#### Configuração (`vitest.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',         // simula o browser
    setupFiles: ['src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

#### Cobertura dos testes frontend (81 testes)

**`utils.test.ts` — 21 testes**

Valida as funções puras de formatação usadas em toda a aplicação:

| Função | Casos testados |
|---|---|
| `formatKz()` | null → "—", undefined → "—", zero, positivo, compacto com "Kz", negativo |
| `formatPercent()` | null → "—", inclui %, 2 casas decimais, 1 casa por defeito, zero |
| `formatDate()` | string vazia → "—", null → "—", ISO date → "dd/mm/yyyy", ISO datetime |
| `getStatusLabel()` | recebidos, elaboracao, em_vigor, vencido, cancelado, liquidado, desconhecido |
| `getRiskBadgeClass()` | baixo→badge-low, medio→badge-med, alto→badge-hi, critico→badge-crit |
| `getStatusBadgeClass()` | recebidos→badge-low, em_vigor→badge-low, vencido→badge-crit |

**`toast.test.ts` — 11 testes**

Valida o store de notificações pub/sub:

| Comportamento | Teste |
|---|---|
| `subscribe()` | Listener é chamado ao push |
| `subscribe()` | Unsubscribe remove o listener |
| `push()` | Cria toast com mensagem e tipo |
| `push()` | IDs são únicos entre pushes |
| `push()` | Toast desaparece após duração (fake timers) |
| `push()` | Tipo por defeito é "info" |
| `dismiss()` | Remove toast pelo id |
| `success()` | Cria tipo success |
| `error()` | Cria tipo error |
| `warning()` | Cria tipo warning |
| `info()` | Cria tipo info |

**`KpiCard.test.tsx` — 13 testes**

Especificação do componente KpiCard por comportamento observável:

```typescript
// Exemplo de teste SDD:
it('deve mostrar o label fornecido', () => {
  render(<KpiCard label="Total de Contratos" value="42" />);
  expect(screen.getByText('Total de Contratos')).toBeInTheDocument();
});
```

Cobre: label, valor, unidade, delta (variação), sub-texto, variantes de estilo (gold/cr/em), className extra, valores edge case (0, "—", strings longas).

**`Badge.test.tsx` — 36 testes**

Especificação de `Badge`, `RepaymentTag` e `ProgressBar`:

- **Badge tipo status:** labels traduzidos, classes CSS correctas para cada estado
- **Badge tipo risk:** labels em português, classes badge-low/med/hi/crit
- **Badge tipo custom:** usa customClass, exibe valor bruto
- **RepaymentTag:** OT+Cash, OT 5a, BT 91d, Cash, JSON inválido não lança erro
- **ProgressBar:** limitação a 100%, cor personalizada, zero, valores negativos

---

### Adicionar novos testes

**Backend — novo serviço:**

```typescript
// server/src/tests/meu-servico.test.ts
import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createTestDb, clearTable } from './helpers/testDb';
import type Database from 'better-sqlite3';

let db: Database.Database;

vi.mock('../database/connection', () => ({
  getDatabase: () => db,
  closeDatabase: vi.fn(),
}));

beforeAll(() => { db = createTestDb(); });
afterEach(() => { clearTable(db, 'minha_tabela'); });

async function getSvc() {
  const { MeuServico } = await import('../services/meu-servico.service');
  return new MeuServico();
}

describe('MeuServico', () => {
  it('...', async () => {
    const svc = await getSvc();
    const result = svc.metodo(dados);
    expect(result).toBeDefined();
  });
});
```

**Frontend — novo componente:**

```typescript
// client/src/components/ui/MeuComponente.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeuComponente from './MeuComponente';

describe('MeuComponente', () => {
  it('Especificação: exibe o título', () => {
    render(<MeuComponente title="Olá" />);
    expect(screen.getByText('Olá')).toBeInTheDocument();
  });
});
```

---

## 14. Perguntas Frequentes

**P: Os valores da Análise actualizam automaticamente?**
R: Sim. Cada vez que a página é aberta, os dados são carregados via `GET /api/margin`. Não há tempo real — pressione F5 para ver os últimos dados.

**P: Um contrato em "Elaboração" aparece na análise?**
R: Não. Apenas contratos com estado `recebidos` contribuem para a receita activa na análise.

**P: Posso ter custos operacionais inactivos?**
R: Sim. No formulário de edição, desmarque **Activo**. O custo fica visível na lista mas não conta para o total. É útil para custos sazonais ou encerrados.

**P: O custo do passivo no simulador é o mesmo da análise real?**
R: O simulador carrega o custo passivo médio calculado a partir das fontes activas. A análise real decompõe cada fonte individualmente.

**P: O que fazer se o Resultado Líquido for negativo?**
R: Há três alavancas: (1) aumentar as taxas activas dos contratos, (2) reduzir os custos operacionais, (3) captar financiamento a taxas mais baixas. O simulador permite testar o impacto de cada alteração antes de a implementar.

**P: Porque é que o F5 numa página diferente da raiz devolvia 404?**
R: O frontend é uma SPA (Single Page Application). O Vercel precisa de um ficheiro `vercel.json` para redirecionar todas as rotas para `index.html`. Já está configurado em `client/vercel.json`.

**P: Os testes correm contra a base de dados de produção?**
R: Não. Os testes backend usam exclusivamente uma base de dados SQLite **in-memory** (`:memory:`) criada de raiz para cada suite. A base de dados de produção nunca é tocada.

**P: A password padrão é segura para produção?**
R: Não. As contas padrão (`12345`) são apenas para arranque inicial. Altere todas as passwords imediatamente após o primeiro login em produção.

**P: Posso ter múltiplas fontes de financiamento activas ao mesmo tempo?**
R: Sim. Não há limite. Todas as fontes com estado `activa` são somadas para o custo do passivo.

**P: O spread pode ser negativo?**
R: Sim. Se a taxa activa média for inferior à taxa passiva média, o spread é negativo — a MAIOMBE está a emprestar mais barato do que capta. É um sinal de alerta crítico.

---

## 15. Glossário

| Termo | Definição |
|---|---|
| **Receita Activa** | Juros recebidos dos mutuários. "Activo" refere-se ao lado do activo do balanço (empréstimos dados). |
| **Custo Passivo** | Juros pagos às fontes de financiamento. "Passivo" refere-se ao lado do passivo do balanço (dívidas da MAIOMBE). |
| **Margem Bruta** | Receita Activa menos Custo Passivo. O que sobra antes dos custos internos. |
| **Resultado Líquido** | Margem Bruta menos Custos Operacionais. O que efectivamente fica em conta. |
| **Spread** | Diferença entre a taxa activa média e a taxa passiva média, em pontos percentuais. |
| **Intermediação Financeira** | O negócio de captar dinheiro a uma taxa e emprestar a outra taxa superior. |
| **Amortização** | Devolução do capital em prestações periódicas. |
| **Período de Carência** | Período inicial em que só se pagam juros, sem redução do capital. |
| **TIR** | Taxa Interna de Retorno — a taxa que iguala o valor actual das entradas e saídas de caixa. |
| **pp** | Pontos percentuais — diferença aritmética entre duas percentagens. Ex: 10% − 7% = 3 pp. |
| **SPA** | Single Page Application — aplicação web onde a navegação é gerida pelo JavaScript sem recarregar a página. |
| **TDD** | Test-Driven Development — escrever testes antes ou em paralelo com o código. |
| **SDD** | Specification-Driven Development — testes que descrevem o comportamento esperado como especificação. |
| **in-memory** | Base de dados que existe apenas na RAM durante a execução dos testes, sem persistência em disco. |

---

*Sistema MAIOMBE — Capital & Credit, Lda.*
*Documentação atualizada: Junho 2026*
*Módulos cobertos: Clientes, Contratos, Fontes de Financiamento, Taxas & Intermediação, Alertas*
*Suite de testes: 44 testes backend (TDD) + 81 testes frontend (SDD) — 125 testes no total*
