# MAIOMBE — Manual de Inserção de Dados

## Credenciais de Acesso

| Email | Senha | Perfil |
|---|---|---|
| `administrador@sistema.com` | `12345` | Acesso total |
| `director_executivo@sistema.com` | `12345` | Dashboard + Contratos |
| `director_financeiro@sistema.com` | `12345` | Financeiro completo |
| `gestor_carteira@sistema.com` | `12345` | Carteira + Clientes |
| `analista_risco@sistema.com` | `12345` | Risco + BI |
| `juridico@sistema.com` | `12345` | Garantias + Contratos |
| `contabilidade@sistema.com` | `12345` | Passivo + Cobrança |
| `auditor@sistema.com` | `12345` | Só leitura |

---

## Ordem de Inserção Recomendada

O sistema é relacional. Siga esta ordem para que os módulos se liguem correctamente:

```
1. Clientes
2. Fontes de Financiamento
3. Contratos (ligados a Clientes)
4. Garantias (ligadas a Contratos)
5. Obrigações / Passivo (ligado a Fontes)
6. Projectos (ligados a Contratos)
7. Títulos OT/BT (ligados a Clientes e Contratos)
8. Avaliações de Risco (ligadas a Contratos)
9. Alertas
10. Cobrança (automática — gerada pelos Contratos)
```

---

## Módulo 1 — Dashboard Executivo

**Onde:** Menu principal → Dashboard

**O que mostra:** KPIs consolidados de toda a carteira — só leitura, gerado automaticamente.

**Depende de:** Contratos, Fontes, Garantias, Pagamentos, Avaliações de Risco.

**Como activar os dados:**
- Registar Clientes → Contratos → os KPIs aparecem automaticamente.
- Registar Fontes → o painel "Fontes — Resumo" é preenchido.
- Registar pagamentos (via Cobrança) → "Evolução da Carteira" e "Cronograma 2026" são actualizados.

---

## Módulo 2 — Clientes

**Onde:** Menu → Clientes

**Campos obrigatórios:** Nome/Entidade, NIF, Tipo de Entidade.

**Campos opcionais:** Representante legal, Província, Email, Telefone, Morada.

**Ligações:**
- Um cliente pode ter vários **Contratos**.
- A página de detalhe (`/clientes/:id`) agrega todos os contratos e avaliações de risco do cliente.
- O campo `risk_rating` é actualizado automaticamente pela última avaliação de risco do contrato.

**Tipos de entidade disponíveis:**
`governo_central`, `ministerio`, `governo_provincial`, `administracao_municipal`,
`empresa_publica`, `empresa_dominio_publico`, `empresa_privada`, `particular`, `entidade_mista`

---

## Módulo 3 — Gestão de Contratos

**Onde:** Menu → Contratos

**Pré-requisito:** Deve existir pelo menos um **Cliente** registado.

**Campos obrigatórios:** Cliente, Tipo de Contrato, Valor (Kz), Taxa de Juro, Prazo (meses), Data de Celebração.

**Campos importantes:**
- `Modelo de reembolso` — define como o mutuário paga: `cash`, `ot`, `bt`, `mix`
- `Período de carência` — meses sem amortização de capital
- `Frequência de pagamento` — mensal, trimestral, semestral, anual

**Estados do contrato:**
- `elaboracao` → Em formalização (ainda não desembolsado)
- `recebidos` → Contrato activo (após aprovação do desembolso)

**Fluxo:**
1. Criar contrato → estado `elaboracao`
2. Aprovar Desembolso → estado `recebidos` + plano de amortização gerado automaticamente
3. Registar pagamentos em **Cobrança**

**Ligações:**
- Gera automaticamente `amortization_schedules` (cronograma de prestações)
- Ligado a **Garantias**, **Projectos**, **Títulos**, **Avaliações de Risco**, **Cobrança**

---

## Módulo 4 — Carteira de Crédito (Portfolio)

**Onde:** Menu → Carteira

**Só leitura.** Agrega todos os contratos com filtros de pesquisa e estado.

**Depende de:** Contratos activos (`status = recebidos`).

---

## Módulo 5 — Cobrança & Recuperação

**Onde:** Menu → Cobrança

**Pré-requisito:** Contratos com estado `recebidos` e plano de amortização gerado.

**O que fazer:**
1. Ver o calendário de vencimentos (automático).
2. Clicar "Registar" na prestação a cobrar.
3. Preencher: Valor Recebido, Data, Meio de Pagamento.

**Meios de pagamento disponíveis:**
`numerario`, `ot`, `bt`, `transferencia`, `moeda_estrangeira`, `dacao_activos`,
`cessao_creditos`, `compensacao`, `dacao_imoveis`, `receitas_futuras`, `letra_cambio`

**Ligações:**
- Actualiza `execution_pct` dos contratos (% de prestações pagas).
- Alimenta o KPI "Recuperado (mês)" e o gráfico BI.
- Um pagamento com método `ot` ou `bt` alimenta o indicador "OT como % dos Recebimentos" no BI.

---

## Módulo 6 — Gestão do Passivo Financeiro

**Onde:** Menu → Passivo

**O que registar:** Obrigações contraídas pela Maiombe junto de credores (bancos, acionistas, investidores).

**Campos obrigatórios:** Nome do credor, Tipo, Montante total, Data de início.

**Campos opcionais:** Saldo em dívida, Taxa de juro, Taxa de mora, Garantia dada, Notas.

**Frequências:** mensal, bimestral, trimestral, semestral, anual.

**Ligações:**
- Alimenta o dashboard KPI "Capital Captado".
- O resumo de fontes no Dashboard usa os dados activos do passivo.
- Ligado com **Fontes de Financiamento** (os passivos são a versão detalhada das fontes).

---

## Módulo 7 — Garantias

**Onde:** Menu → Garantias

**Pré-requisito:** Deve existir um **Contrato** ao qual a garantia está associada.

**Campos obrigatórios:** Tipo de garantia, Garante/Bem, Contrato associado, Valor (Kz).

**Tipos de garantia:** `bancaria`, `cessao_credito`, `hipoteca`, `penhor`, `aval`, `outro`

**Ligações:**
- Alimenta o índice de cobertura de garantias no BI.
- A cobertura (%) é calculada automaticamente: `valor_garantia / valor_contrato × 100`.
- Alertas são gerados automaticamente para garantias a vencer nos próximos 30 dias.

---

## Módulo 8 — Títulos (Obrigações do Tesouro / Bilhetes do Tesouro)

**Onde:** Menu → Títulos

**Pré-requisito:** Cliente registado. Contrato opcional (para vincular entrega).

**Campos obrigatórios:** Cliente, Tipo (OT ou BT), Série/Referência, Valor Facial (Kz), Data de Entrega.

**Campos importantes:**
- `Desconto aceite (%)` — o campo real é `discount_accepted`; determina o valor de realização
- `Taxa de cupão (%)` — para OT; define o rendimento anual
- `Prazo de vencimento` — para OT

**Política de negociação (botão "Política"):**
Define os limites institucionais: desconto máximo, yield mínima, % mínima em cash.

**Ligações:**
- Os pagamentos registados com método `ot` ou `bt` em Cobrança ficam visíveis aqui como liquidações.
- O KPI "OT como % dos Recebimentos" no BI é calculado a partir deste cruzamento.

---

## Módulo 9 — Gestão de Risco

**Onde:** Menu → Risco

**Pré-requisito:** Contrato registado.

**Como registar uma avaliação:**
1. Clicar "+ Nova Avaliação"
2. Seleccionar o contrato
3. Definir: Nível de risco (baixo/médio/alto/crítico), Score Global (0–10)
4. Preencher scores individuais por indicador (opcional)
5. Acção recomendada + prazo

**Os 6 indicadores de scoring:**
| Indicador | Peso |
|---|---|
| Histórico de Pagamento | 30% |
| Situação Financeira | 25% |
| Risco Político / Institucional | 20% |
| Risco Contratual | 10% |
| Risco de Execução | 10% |
| Risco de Liquidez | 5% |

**Ligações:**
- Actualiza o `risk_level` do contrato no Dashboard e Carteira.
- Contratos com risco `alto` ou `crítico` entram na Watchlist.
- O rating por tipo de entidade é calculado a partir das avaliações registadas.
- Alimenta a Matriz de Risco no Dashboard.
- O `healthScore` do Dashboard é calculado a partir da taxa de recuperação e NPL derivados das avaliações.

---

## Módulo 10 — Projectos

**Onde:** Menu → Projectos

**Pré-requisito:** Contrato registado (opcional mas recomendado).

**Campos obrigatórios:** Nome do projecto, Sector, Entidade executora.

**Campos importantes:**
- `Sector` — alimenta o gráfico "Exposição por Sector" no BI
- `Contrato associado` — liga o projecto à carteira de crédito
- `% de execução` — progresso físico do projecto (0–100%)
- `Valor total` e `Valor financiado` — para análise de cobertura

**Sectores disponíveis:**
`saude`, `educacao`, `infraestrutura`, `energia`, `habitacao`, `agua_saneamento`,
`agricultura`, `transportes`, `telecomunicacoes`, `outro`

**Ligações:**
- A distribuição sectorial no BI é calculada a partir de: sector do projecto × valor do contrato associado.
- Sem projectos com contrato associado, o gráfico sectorial fica vazio.

---

## Módulo 11 — Fontes de Financiamento

**Onde:** Menu → Fontes

**O que registar:** Linhas de crédito, capital próprio, debêntures e outros instrumentos de captação.

**Campos obrigatórios:** Nome, Tipo de fonte, Montante total (Kz).

**Tipos disponíveis:**
`linha_bancaria`, `credito_bancario`, `banco`, `credito_sindico`, `linha_especial`,
`capital_proprio`, `acionista`, `investidor_privado`, `debentures`, `obrigacoes`,
`fundo`, `parceiro`, `suprimentos`, `outro`

**Ligações:**
- Alimenta o KPI "Capital Captado" e o painel "Fontes — Resumo" no Dashboard.
- O spread financeiro no BI usa a taxa de juro média das fontes (`avg(interest_rate)`) versus a taxa média dos contratos.
- Fontes com `status = activa` são incluídas nos cálculos.

---

## Módulo 12 — Taxas, Juros & Comissões

**Onde:** Menu → Taxas

**O que faz:** Define as tabelas de taxas por tipo de mutuário (editável inline).

**Para editar:** Clicar "Editar" na linha, alterar os valores, clicar "Salvar".

**Campos editáveis por tipo de mutuário:**
- Taxa Mín. % / Taxa Base % / Taxa Máx. %
- Comissão de Gestão % / Comissão de Abertura %

**Nota:** As tabelas de taxas são referência interna. Os contratos têm a sua própria taxa definida individualmente.

**Ligações:**
- O KPI "Taxa de Juro Base Média" no módulo é calculado como média das taxas base da tabela.
- O Simulador de Rentabilidade usa estas taxas como ponto de partida sugerido.

---

## Módulo 13 — Alertas

**Onde:** Menu → Alertas

**Criação automática:** Alguns alertas são gerados pelo sistema (garantias a vencer, prestações vencidas).

**Criação manual:** Botão "+ Novo Alerta".

**Campos:** Título, Descrição, Severidade (urgente / atencao / informativo), Tipo, Entidade relacionada.

**Ligações:**
- Os alertas activos aparecem no painel "Alertas" do Dashboard.
- O badge de count no Dashboard mostra o total de alertas não resolvidos.

---

## Módulo 14 — Gestão de Risco (BI & Analytics)

**Onde:** Menu → BI

**Só leitura.** Calculado automaticamente a partir de:

| KPI | Fonte dos dados |
|---|---|
| Taxa de Recuperação | `payments.amount` / `amortization_schedules.total_installment` |
| Índice Cobertura Garantias | `SUM(guarantees.value)` / `SUM(contracts.amount)` |
| NPL Ratio | Prestações vencidas / Total aplicado |
| Spread Médio | `AVG(contracts.interest_rate)` − `AVG(funding_sources.interest_rate)` |
| OT como % dos Recebimentos | `payments` com `payment_method IN ('ot','bt')` / total recebido |
| Concentração Top-3 | Soma dos 3 maiores mutuários / carteira total |

---

## Módulo 15 — Capital de Gestão

**Onde:** Menu → Capital de Gestão

**O que registar:** Movimentos de capital interno (reservas, provisões, retenções).

**Campos:** Tipo de movimento, Valor, Descrição, Data.

**Ligações:** Alimenta o balanço activo/passivo na análise de liquidez.

---

## Módulo 16 — Auditoria

**Onde:** Acessível via API (`GET /audit`) — futura página de interface.

**O que regista automaticamente:** Todas as operações de criação, actualização e aprovação com utilizador, timestamp e entidade afectada.

---

## Reset da Base de Dados

Para limpar todos os dados e reiniciar com utilizadores padrão:

```bash
cd server
npm run db:reset-users
```

Apaga todas as tabelas de dados e recria os 8 utilizadores com `perfil@sistema.com` / `12345`.

---

## Interligações Entre Módulos (Mapa)

```
Clientes ──────────────────────────┐
    │                               │
    ▼                               │
Contratos ──┬──► Cobrança           │
    │       ├──► Garantias          │
    │       ├──► Projectos ──► BI  │
    │       ├──► Títulos (OT/BT) ◄─┘
    │       └──► Avaliações Risco
    │                   │
    ▼                   ▼
Dashboard ◄──── Todas as tabelas
    │
    └──► KPIs: Capital, NPL, Spread, HealthScore

Fontes de Financiamento ──► Dashboard (Capital Captado)
                        └──► BI (Spread, Custo Passivo)

Passivo Financeiro ──► Balanceamento Activo/Passivo
```
