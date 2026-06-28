# Análise de Intermediação Financeira — MAIOMBE

**Módulo:** Taxas, Juros & Comissões  
**Localização:** Menu lateral → Taxas → secção inferior da página  
**Permissão necessária:** `taxas / read` (visualização) · `taxas / write` (editar custos)

---

## O que é esta funcionalidade

A MAIOMBE funciona como intermediário financeiro:

1. **Capta dinheiro** de fontes externas (bancos, accionistas, investidores) pagando uma taxa de juro — o **custo do passivo**
2. **Empresta esse dinheiro** a mutuários (clientes) cobrando uma taxa superior — a **receita activa**
3. A diferença entre o que recebe e o que paga é a **margem bruta**
4. Após descontar os **custos operacionais** (salários, sistema, jurídico, etc.) obtém o **resultado líquido**

Esta secção mostra exatamente isso — com dados reais da base de dados, em tempo real.

---

## Estrutura visual da secção

```
┌─────────────────────────────────────────────────────────────────────┐
│  ANÁLISE DE INTERMEDIAÇÃO FINANCEIRA                                │
├──────────┬──────────┬────────────┬─────────────────┬───────────────┤
│ Receita  │  Custo   │  Margem    │ Custos          │  Resultado    │
│ Activa   │ Passivo  │  Bruta     │ Operacionais    │  Líquido      │
│ (anual)  │ (anual)  │            │ (anual)         │               │
├──────────┴──────────┴────────────┴─────────────────┴───────────────┤
│  CASCATA          │  FONTES vs CONTRATOS  │  CUSTOS OPERACIONAIS   │
│                   │                        │                        │
│  + Receita Activa │  Fontes de finan.:     │  [+ Adicionar]        │
│  − Custo Passivo  │  • Banco X  − Kz       │                        │
│  = Margem Bruta   │  • Accionista − Kz     │  Pessoal   X Kz/mês  │
│  − Custos Op.     │                        │  Sistema   Y Kz/mês  │
│  = Resultado      │  Contratos activos:    │  Jurídico  Z Kz/mês  │
│                   │  • MAI-2026-001 + Kz   │                        │
│  [Spread badge]   │  • MAI-2026-002 + Kz   │  Total anual: N Kz   │
└───────────────────┴────────────────────────┴───────────────────────┘
```

---

## Como interpretar cada número

### 1. Receita Activa (anual projectada)

**Fórmula:** `SUM( capital_do_contrato × taxa_de_juro ) para cada contrato em vigor`

Exemplo:
- Contrato MAI-2026-001: 500 M Kz × 15% = **75 M Kz/ano**
- Contrato MAI-2026-002: 300 M Kz × 12% = **36 M Kz/ano**
- **Total Receita Activa = 111 M Kz/ano**

> Esta é a receita projectada assumindo 1 ano completo. Não inclui juro de mora nem comissões avulsas — apenas o juro base dos contratos activos.

---

### 2. Custo do Passivo (anual projectado)

**Fórmula:** `SUM( montante_fonte × taxa_da_fonte ) para cada fonte de financiamento activa`

Exemplo:
- Banco BFA: 400 M Kz × 8% = **32 M Kz/ano**
- Accionista: 200 M Kz × 5% = **10 M Kz/ano**
- **Total Custo Passivo = 42 M Kz/ano**

> Este é o custo que a MAIOMBE paga às entidades que lhe emprestaram dinheiro.

---

### 3. Margem Bruta

**Fórmula:** `Receita Activa − Custo do Passivo`

Exemplo:
- 111 M Kz − 42 M Kz = **69 M Kz/ano**

> A margem bruta mede a eficiência da intermediação financeira antes de qualquer custo interno.

---

### 4. Spread de Intermediação

**Fórmula:** `Taxa Activa Média − Taxa Passiva Média` (em pontos percentuais)

Exemplo:
- Taxa activa média dos contratos: 13.5%
- Taxa passiva média das fontes: 6.5%
- **Spread = +7.0 pp**

> Um spread positivo significa que a MAIOMBE cobra mais do que paga. Spread negativo significa prejuízo operacional antes mesmo dos custos fixos.

---

### 5. Custos Operacionais (anuais)

São os custos internos da MAIOMBE, configurados manualmente nesta secção. Dividem-se em 5 categorias:

| Categoria      | Exemplos                                    |
|----------------|---------------------------------------------|
| Pessoal        | Salários, subsídios, seguro social          |
| Sistema/TI     | Licenças de software, servidores, domínios  |
| Jurídico       | Advogados, notários, registos               |
| Administrativo | Rendas, electricidade, material escritório  |
| Outros         | Viagens, formações, custos eventuais        |

Cada custo é registado com o **valor mensal em Kz**. O sistema multiplica por 12 para obter o custo anual.

---

### 6. Resultado Líquido

**Fórmula:** `Margem Bruta − Custos Operacionais`

Exemplo:
- 69 M Kz − 24 M Kz = **45 M Kz/ano**

> Este é o dinheiro que efectivamente fica em conta após pagar as fontes de financiamento E os custos internos.

---

## Como registar os dados

### Passo 1 — Registar Fontes de Financiamento

1. Ir a **Fontes de Financiamento** no menu lateral
2. Clicar **+ Nova Fonte**
3. Preencher:
   - **Nome/Designação:** nome do banco ou entidade
   - **Tipo de Fonte:** linha bancária, capital próprio, accionista, etc.
   - **Montante Total (Kz):** valor captado
   - **Taxa de Juro (% a.a.):** taxa que a MAIOMBE paga a esta fonte
4. Guardar

Após guardar, a fonte aparece automaticamente na análise com o custo anual calculado.

---

### Passo 2 — Criar Contratos com Clientes

1. Ir a **Contratos** no menu lateral
2. Criar um contrato com:
   - **Montante (Kz):** capital mutuado ao cliente
   - **Taxa de Juro (%):** taxa cobrada ao cliente
   - **Estado:** deve estar em **"Recebidos"** (em vigor) para aparecer na análise
3. Contratos em estado **"Elaboração"** não contam — só os que foram formalizados e estão activos

---

### Passo 3 — Configurar Custos Operacionais

Na própria secção de Análise de Intermediação, coluna da direita:

1. Clicar **Adicionar**
2. Preencher:
   - **Designação:** ex. "Salários Equipa"
   - **Categoria:** Pessoal / Sistema / Jurídico / Administrativo / Outros
   - **Valor Mensal (Kz):** custo mensal deste item
3. Guardar

Podem ser adicionados quantos centros de custo forem necessários. Cada um aparece na lista com o custo mensal e anual calculados automaticamente.

---

## Como usar o Simulador

O **Simulador de Rentabilidade** (coluna da direita da secção de taxas) permite testar cenários antes de criar um contrato real.

### Campos do Simulador

| Campo | O que representa |
|---|---|
| Capital Mutuado (M Kz) | Valor do empréstimo hipotético |
| Taxa de Juro Activa (%) | Taxa que vamos cobrar ao cliente |
| Prazo (meses) | Duração do contrato |
| Com. Abertura (%) | Comissão cobrada na assinatura (sobre o capital) |
| Com. Gestão Anual (%) | Comissão anual de acompanhamento |
| Capital Não Desembolsado (M Kz) | Capital aprovado mas ainda não entregue (gera comissão de imobilização) |
| Dias em Atraso | Para simular juros de mora acumulados |
| Custo do Passivo (%) | Taxa média que pagamos às fontes de financiamento |
| **Custos Operacionais Mensais (M Kz)** | Custo mensal de operar a MAIOMBE — **carregado automaticamente dos custos registados** |

### Cascata de resultados do Simulador

```
(+) Juros de Capital          = Capital × Taxa × Anos
(+) Comissão de Abertura      = Capital × Com.Abertura% (única)
(+) Comissão de Gestão Anual  = Capital × Com.Gestão% × Anos
(+) Comissão de Imobilização  = Cap.Não.Desemb × 0.25%/mês × Prazo  [se aplicável]
(+) Juros de Mora             = Capital × 0.05%/dia × Dias           [se aplicável]
─────────────────────────────────────────────────────────────────────
(=) TOTAL RECEITAS

(−) Custo do Passivo          = Capital × Taxa.Passiva% × Anos
─────────────────────────────────────────────────────────────────────
(=) MARGEM BRUTA

(−) Custos Operacionais       = Custo.Mensal × Prazo(meses)
─────────────────────────────────────────────────────────────────────
(=) RESULTADO LÍQUIDO         ← Dinheiro que fica em conta
```

### Indicadores complementares do Simulador

| Indicador | Significado |
|---|---|
| **TIR Efectiva** | Taxa Interna de Retorno — rentabilidade anualizada da operação |
| **Spread (Activo − Passivo)** | Diferença em pontos percentuais entre o que cobramos e o que pagamos |
| **Resultado / Capital** | Percentagem de retorno líquido sobre o capital mutuado |
| **Capital Recapitalizado (6m)** | Projecção do capital com juro composto ao fim de 6 meses |

### Validação da Política de Comissões

O simulador verifica automaticamente se as comissões introduzidas respeitam os intervalos definidos na **Política Interna de Comissões** (tabela acima):

- **Verde:** dentro do intervalo permitido
- **Laranja + aviso:** fora do intervalo — o contrato pode ser recusado internamente

---

## Diferença entre Simulador e Análise Real

| | Simulador | Análise de Intermediação |
|---|---|---|
| **Dados** | Hipotéticos (inseridos manualmente) | Reais (base de dados) |
| **Contratos** | 1 contrato simulado | Todos os contratos em vigor |
| **Fontes** | Custo passivo médio (%) | Cada fonte de financiamento real |
| **Custos Op.** | Carregados da BD (editáveis) | Todos os custos activos da BD |
| **Uso** | Antes de criar um contrato | Monitorização contínua |

---

## Perguntas Frequentes

**P: Os valores da Análise actualizam automaticamente?**  
R: Sim. Cada vez que abre a página, os dados são carregados da base de dados. O simulador também carrega os custos operacionais automaticamente.

**P: Um contrato em "Elaboração" aparece na análise?**  
R: Não. Só contratos com estado **"Recebidos"** (em vigor) contribuem para a receita activa.

**P: Posso ter custos operacionais inactivos?**  
R: Sim. Ao editar um custo pode desactivá-lo sem o eliminar. Custos inactivos não contam para o total.

**P: O custo passivo no simulador é o mesmo da análise real?**  
R: O simulador carrega o **custo médio do passivo** calculado a partir das liabilities (passivo). A análise real usa cada fonte de financiamento individualmente.

**P: O que fazer se o Resultado Líquido for negativo?**  
R: Significa que os custos (passivo + operacionais) superam as receitas. As acções possíveis são: aumentar taxas activas, reduzir custos operacionais, ou captar financiamento mais barato.

---

*Documentação gerada para o sistema MAIOMBE — Capital & Credit, Lda.*  
*Versão do módulo: Junho 2026*
