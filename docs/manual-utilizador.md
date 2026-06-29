# MAIOMBE — Manual de Formação do Utilizador
**Capital & Credit, Lda. · Para uso interno · Junho 2026**

> Este manual destina-se a **todos os utilizadores do sistema** — directores, gestores, analistas, jurídico e contabilidade. Não é necessário ter conhecimentos técnicos. Basta saber ler este documento e seguir os passos indicados.

---

## Índice

1. [Como Entrar no Sistema (Login)](#1-como-entrar-no-sistema-login)
2. [Navegação Geral — O que está em cada sítio](#2-navegação-geral--o-que-está-em-cada-sítio)
3. [Dashboard — Como Ler os Indicadores](#3-dashboard--como-ler-os-indicadores)
4. [Módulo Clientes — Cadastrar e Consultar](#4-módulo-clientes--cadastrar-e-consultar)
5. [Módulo Contratos — Criar e Gerir](#5-módulo-contratos--criar-e-gerir)
6. [Módulo Fontes de Financiamento — Registar o Passivo](#6-módulo-fontes-de-financiamento--registar-o-passivo)
7. [Módulo Taxas e Juros — Configurar e Analisar](#7-módulo-taxas-e-juros--configurar-e-analisar)
8. [Simulador de Rentabilidade — Testar Cenários](#8-simulador-de-rentabilidade--testar-cenários)
9. [Análise de Intermediação Financeira — Ler os Resultados](#9-análise-de-intermediação-financeira--ler-os-resultados)
10. [Módulo Alertas — Acompanhar Situações de Risco](#10-módulo-alertas--acompanhar-situações-de-risco)
11. [Perguntas Comuns dos Utilizadores](#11-perguntas-comuns-dos-utilizadores)
12. [Erros Comuns e Como Resolver](#12-erros-comuns-e-como-resolver)

---

## 1. Como Entrar no Sistema (Login)

### Aceder ao sistema

Abra o seu browser (Chrome, Edge ou Firefox) e escreva o endereço do sistema na barra de endereços.

> Se não souber o endereço, peça ao responsável de TI ou ao administrador do sistema.

### Fazer login

Quando a página abrir, vai ver um formulário com dois campos:

```
┌─────────────────────────────────┐
│         MAIOMBE                 │
│    Capital & Credit, Lda.       │
│                                 │
│  Email                          │
│  ┌─────────────────────────┐    │
│  │ o-seu-email@sistema.com │    │
│  └─────────────────────────┘    │
│                                 │
│  Password                       │
│  ┌─────────────────────────┐    │
│  │ ••••••••••••••          │    │
│  └─────────────────────────┘    │
│                                 │
│  [ ENTRAR ]                     │
└─────────────────────────────────┘
```

1. Escreva o seu **email** no primeiro campo
2. Escreva a sua **password** no segundo campo
3. Clique em **ENTRAR**

### Contas criadas para cada função

| Função | Email de acesso |
|---|---|
| Administrador | `administrador@sistema.com` |
| Director Executivo | `director_executivo@sistema.com` |
| Director Financeiro | `director_financeiro@sistema.com` |
| Gestor de Carteira | `gestor_carteira@sistema.com` |
| Analista de Risco | `analista_risco@sistema.com` |
| Jurídico | `juridico@sistema.com` |
| Contabilidade | `contabilidade@sistema.com` |
| Auditor | `auditor@sistema.com` |

> A password inicial de todas as contas é **`12345`**. O administrador deve alterar as passwords após o primeiro acesso.

### O que acontece após o login

Após entrar com sucesso, é redireccionado automaticamente para o **Dashboard** — a página principal do sistema. A sessão dura **8 horas**. Após esse tempo, o sistema pede-lhe para entrar novamente.

### Erro "Credenciais Inválidas"

Se aparecer esta mensagem, verifique:
- Se o email está escrito correctamente (sem espaços extra)
- Se a password está correcta (letras maiúsculas e minúsculas importam)
- Se a sua conta está activa (contacte o administrador)

---

## 2. Navegação Geral — O que está em cada sítio

### Menu lateral (barra da esquerda)

Após entrar no sistema, verá uma barra lateral à esquerda com os módulos disponíveis:

```
┌──────────────┐
│  MAIOMBE     │
│              │
│ 📊 Dashboard │  ← Visão geral e indicadores
│              │
│ 👥 Clientes  │  ← Gerir mutuários
│              │
│ 📄 Contratos │  ← Gerir contratos de crédito
│              │
│ 🏦 Fontes    │  ← Fontes de financiamento
│              │
│ 📈 Taxas     │  ← Taxas, juros e análise
│              │
│ 🔔 Alertas   │  ← Situações de atenção
│              │
│ [Utilizador] │  ← O seu nome e opção de sair
└──────────────┘
```

Para navegar, basta clicar no nome do módulo.

### Barra superior

No topo de cada página encontra:
- **Nome da página actual** (ex: "Clientes", "Contratos")
- **Botão de notificações** (sino) — alertas pendentes
- **Nome do utilizador** — clique para sair do sistema

### Botões mais usados no sistema

| Aspecto | O que faz |
|---|---|
| Botão azul com `+` | Criar novo registo |
| Ícone de lápis ✏️ | Editar registo |
| Ícone de lixo 🗑️ | Eliminar registo |
| Ícone de olho 👁️ | Ver detalhes |
| Campo de pesquisa 🔍 | Filtrar a lista |
| Setas `<` `>` no fundo | Mudar de página (paginação) |

### Como sair do sistema

Clique no seu nome no canto superior direito e seleccione **Sair** ou **Terminar Sessão**.

---

## 3. Dashboard — Como Ler os Indicadores

O Dashboard é a primeira página que vê ao entrar. Mostra um resumo de toda a actividade da MAIOMBE.

### Os 4 cartões principais (KPI Cards)

No topo da página existem 4 cartões com os números mais importantes:

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ CARTEIRA    │ │ CONTRATOS   │ │ EXPOSIÇÃO   │ │ TAXA MÉDIA  │
│ TOTAL       │ │ ACTIVOS     │ │ TOTAL       │ │             │
│             │ │             │ │             │ │             │
│ 1.200 M Kz  │ │     23      │ │  900 M Kz   │ │   13.5%     │
│             │ │             │ │             │ │             │
│ ↑ Este mês  │ │ 3 em risco  │ │ Desembolsad.│ │ a.a. média  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**O que cada cartão significa:**

| Cartão | O que mostra | Como interpretar |
|---|---|---|
| **Carteira Total** | Soma de todos os capitais mutuados | Quanto a MAIOMBE emprestou no total |
| **Contratos Activos** | Número de contratos em vigor | Quantos clientes estão actualmente a pagar |
| **Exposição Total** | Capital ainda em dívida pelos clientes | Quanto ainda nos devem |
| **Taxa Média** | Média das taxas de juro cobradas | A rentabilidade média da carteira |

### Alertas no Dashboard

Abaixo dos cartões pode ver uma lista de alertas activos:

```
⚠️  MAI-2026-005 — Prestação vencida há 15 dias          [Ver]
⚠️  Linha BFA — Maturidade em 25 dias                    [Ver]
ℹ️  MAI-2026-012 — Avaliação de risco pendente           [Ver]
```

- **Vermelho/⚠️:** situação urgente — precisa de atenção imediata
- **Laranja:** situação de atenção — monitore de perto
- **Azul/ℹ️:** informativo — apenas para conhecimento

### Gráfico de distribuição da carteira

Mostra como os contratos estão distribuídos por tipo de entidade cliente (governo, empresa privada, particular, etc.). Use para perceber onde está concentrado o risco.

### Evolução mensal

Gráfico que mostra mês a mês os desembolsos realizados. Útil para perceber a tendência de crescimento da carteira.

### O que fazer quando há alertas no Dashboard

1. Clique no botão **[Ver]** ao lado do alerta
2. Leia os detalhes da situação
3. Tome a acção adequada (contactar o cliente, actualizar estado do contrato, etc.)
4. Quando resolvido, marque o alerta como **Lido** ou **Resolvido**

---

## 4. Módulo Clientes — Cadastrar e Consultar

### Para que serve

Aqui regista todas as entidades (empresas, ministérios, particulares) que são mutuários — ou seja, que recebem crédito da MAIOMBE.

**Regra importante:** um cliente tem de existir no sistema **antes** de poder criar um contrato para ele.

### Como ver a lista de clientes

1. Clique em **Clientes** no menu lateral
2. Verá uma tabela com todos os clientes registados:

```
┌──────────┬──────────────────────────┬──────────────┬─────────────┬──────────┐
│ CÓDIGO   │ NOME                     │ NIF          │ TIPO        │ RISCO    │
├──────────┼──────────────────────────┼──────────────┼─────────────┼──────────┤
│ CLI-001  │ Ministério das Finanças  │ 5000012345   │ Ministério  │ Baixo    │
│ CLI-002  │ Empresa Alpha Lda        │ 5009876543   │ Emp. Privada│ Médio    │
│ CLI-003  │ Governo Provincial Huíla │ 5001111111   │ Gov. Prov.  │ Baixo    │
└──────────┴──────────────────────────┴──────────────┴─────────────┴──────────┘
```

### Como pesquisar um cliente

Use a barra de pesquisa no topo da lista:
- Escreva parte do **nome** ou do **NIF** do cliente
- A lista filtra automaticamente
- Para ver todos de novo, apague o texto de pesquisa

Pode também filtrar por **Tipo de Entidade** usando o menu de filtros.

### Como cadastrar um novo cliente

1. Clique no botão **+ Novo Cliente** (canto superior direito)
2. Preencha o formulário:

**Campos obrigatórios** (não pode guardar sem estes):

| Campo | O que escrever | Exemplo |
|---|---|---|
| **Nome** | Nome completo ou denominação social | "Ministério da Educação" |
| **NIF** | Número de Identificação Fiscal (10 dígitos) | `5000012345` |
| **Tipo de Entidade** | Seleccionar da lista | "Ministério" |

**Campos opcionais** (pode preencher depois):

| Campo | O que escrever |
|---|---|
| Representante Legal | Nome da pessoa responsável |
| Endereço | Sede ou morada do cliente |
| Província | Seleccionar da lista |
| Email | Email de contacto institucional |
| Telefone | Número de contacto |

3. Clique em **Guardar**
4. O sistema gera automaticamente um código `CLI-XXX` para o cliente

> **Atenção:** O NIF tem de ser único. Se já existir um cliente com o mesmo NIF, o sistema não deixa guardar e mostra um erro.

### Como ver a ficha de um cliente

Clique no nome do cliente na lista. Abre uma ficha com:
- Dados de identificação
- Todos os contratos deste cliente
- Histórico de avaliações de risco

### Como editar os dados de um cliente

1. Na lista, clique no ícone de lápis ✏️ ao lado do cliente
2. Altere os campos necessários
3. Clique em **Guardar**

> O NIF não pode ser alterado após o cadastro. Se houver erro no NIF, contacte o administrador.

### Tipos de entidade disponíveis

| Tipo | Quando usar |
|---|---|
| Governo Central | Poder executivo nacional |
| Ministério | Ministérios sectoriais |
| Governo Provincial | Governos das 18 províncias |
| Adm. Municipal | Administrações municipais |
| Empresa Pública | Empresas do Estado (TAAG, SONANGOL, etc.) |
| Empresa Dom. Público | Empresas de serviço público |
| Empresa Privada | Empresas do sector privado |
| Particular | Pessoas singulares |
| Entidade Mista | Parcerias público-privadas |

---

## 5. Módulo Contratos — Criar e Gerir

### Para que serve

Aqui cria e gere os contratos de crédito com os clientes. Cada contrato tem um plano de amortização gerado automaticamente.

### Como ver a lista de contratos

Clique em **Contratos** no menu lateral. Verá:

```
┌───────────────┬──────────────────────┬────────────┬───────────┬──────────────┐
│ REFERÊNCIA    │ CLIENTE              │ MONTANTE   │ TAXA      │ ESTADO       │
├───────────────┼──────────────────────┼────────────┼───────────┼──────────────┤
│ MAI-2026-001  │ Ministério Finanças  │ 500 M Kz   │ 15%       │ Recebidos    │
│ MAI-2026-002  │ Empresa Alpha        │ 300 M Kz   │ 12%       │ Em Vigor     │
│ MAI-2026-003  │ Gov. Provincial Huíla│ 200 M Kz   │ 14%       │ Elaboração   │
└───────────────┴──────────────────────┴────────────┴───────────┴──────────────┘
```

### Os estados de um contrato — O que significam

Os estados mostram em que fase está cada contrato. A progressão normal é:

```
ELABORAÇÃO → EM FORMALIZAÇÃO → RECEBIDOS → EM VIGOR → LIQUIDADO
```

| Estado | O que significa | Aparece na análise? |
|---|---|---|
| **Elaboração** | Em preparação, ainda não foi assinado | Não |
| **Em Formalização** | Em processo de assinatura e registo | Não |
| **Recebidos** | Capital foi desembolsado ao cliente | **Sim ✅** |
| **Em Vigor** | A decorrer normalmente | **Sim ✅** |
| **Em Risco** | Sinalizado com problema de pagamento | **Sim ✅** |
| **Vencido** | Prazo terminou sem liquidação total | **Sim ✅** |
| **Liquidado** | Pago na totalidade | Não |
| **Cancelado** | Anulado antes do desembolso | Não |

> **Regra fundamental:** Só os contratos com estado **Recebidos**, **Em Vigor**, **Em Risco** ou **Vencido** aparecem na Análise de Intermediação como receita activa.

### Como criar um novo contrato

**Passo 1 — Verificar que o cliente existe**

O cliente tem de estar cadastrado no módulo Clientes antes de continuar. Se não existir, cadastre-o primeiro (ver secção 4).

**Passo 2 — Abrir o formulário**

Clique em **+ Novo Contrato** no canto superior direito.

**Passo 3 — Preencher os dados**

O formulário está dividido em secções:

---

**SECÇÃO 1: Identificação**

| Campo | O que escrever | Obrigatório? |
|---|---|---|
| Cliente | Pesquise pelo nome ou NIF e seleccione | Sim |
| Tipo de Contrato | Modelo A, B ou C (ver tabela abaixo) | Sim |
| Objecto do Contrato | Descrição breve do destino do crédito | Não |

**Tipos de Contrato:**

| Modelo | Para quem se destina |
|---|---|
| **Modelo A** | Financiamento a entidades públicas (governos, ministérios) |
| **Modelo B** | Empréstimo a empresas ou particulares privados |
| **Modelo C** | Financiamento de projectos específicos |

---

**SECÇÃO 2: Condições Financeiras**

| Campo | O que escrever | Exemplo |
|---|---|---|
| **Montante (Kz)** | Capital a desembolsar, em Kwanzas | `500000000` (500 milhões) |
| **Taxa de Juro (% a.a.)** | Percentagem anual cobrada ao cliente | `15` |
| **Prazo (meses)** | Duração total do contrato | `24` |
| **Frequência de Pagamento** | Com que regularidade o cliente paga | Mensal |
| **Comissão de Abertura (%)** | Cobrada no momento da assinatura | `1.5` |

**Frequências de pagamento disponíveis:**

| Frequência | Prestações num contrato de 24 meses |
|---|---|
| Mensal | 24 prestações |
| Bimestral | 12 prestações |
| Trimestral | 8 prestações |
| Semestral | 4 prestações |
| Anual | 2 prestações |
| Única Vencimento | 1 prestação (no fim do prazo) |

---

**SECÇÃO 3: Condições Especiais**

| Campo | O que escrever | Quando usar |
|---|---|---|
| **Data de Celebração** | Data de assinatura do contrato | Sempre |
| **Período de Carência (meses)** | Meses sem amortização no início | Quando acordado com o cliente |
| **Taxa de Mora (% a.a.)** | Taxa de juro para atrasos | Geralmente 5% |

> **Período de Carência:** durante estes meses, o cliente só paga juros — não amortiza o capital. Por exemplo, com 3 meses de carência num contrato de 24 meses, o cliente só começa a amortizar o capital no 4.º mês.

---

**Passo 4 — Guardar**

Clique em **Guardar Contrato**. O sistema:
- Gera automaticamente a referência `MAI-AAAA-NNN`
- Calcula e guarda o plano de amortização completo

### Como ver o plano de amortização

1. Na lista de contratos, clique na referência do contrato (ex: `MAI-2026-001`)
2. Na ficha do contrato, clique em **Plano de Amortização** ou na aba correspondente

Verá uma tabela assim:

```
┌───────┬────────────┬───────────────┬───────────────┬──────────┬────────────┬──────────────┐
│ Nº    │ Data       │ Cap. Inicial  │ Amortização   │ Juros    │ Total      │ Cap. Residual│
├───────┼────────────┼───────────────┼───────────────┼──────────┼────────────┼──────────────┤
│   1   │ 01/02/2026 │ 500.000.000   │  20.833.333   │ 6.250.000│ 27.083.333 │ 479.166.667  │
│   2   │ 01/03/2026 │ 479.166.667   │  20.833.333   │ 5.989.583│ 26.822.916 │ 458.333.334  │
│  ...  │    ...     │      ...      │      ...      │    ...   │    ...     │     ...      │
│  24   │ 01/01/2028 │  20.833.333   │  20.833.333   │   260.417│ 21.093.750 │          0   │
└───────┴────────────┴───────────────┴───────────────┴──────────┴────────────┴──────────────┘
```

**O que significa cada coluna:**

| Coluna | Explicação simples |
|---|---|
| **Nº** | Número da prestação (1, 2, 3...) |
| **Data** | Quando o cliente deve pagar esta prestação |
| **Capital Inicial** | Quanto o cliente ainda devia no início deste período |
| **Amortização** | Parte do capital que está a devolver nesta prestação |
| **Juros** | Custo do dinheiro calculado sobre o capital em dívida |
| **Total** | O valor que o cliente efectivamente paga (amortização + juros) |
| **Capital Residual** | Quanto ainda fica em dívida após esta prestação |

### Como alterar o estado de um contrato

1. Abra a ficha do contrato
2. Clique no estado actual (ex: "Elaboração")
3. Seleccione o novo estado
4. Confirme a alteração

> Altere o estado para **Recebidos** quando o dinheiro for efectivamente entregue ao cliente. Só a partir deste momento o contrato conta para a análise financeira.

### Como registar um pagamento

1. Abra a ficha do contrato
2. Clique na prestação correspondente no plano de amortização
3. Clique em **Registar Pagamento**
4. Preencha: valor pago, método de pagamento, data de pagamento
5. Guardar

---

## 6. Módulo Fontes de Financiamento — Registar o Passivo

### Para que serve

Aqui regista todo o dinheiro que a MAIOMBE captou de terceiros para poder emprestar aos seus clientes. Estas são as **dívidas da MAIOMBE** — o que ela deve pagar de juros.

**Exemplos de fontes:**
- Linha de crédito do Banco BFA a 8% ao ano
- Capital investido pelos accionistas a 5% ao ano
- Obrigações emitidas no mercado a 7% ao ano

### Como ver as fontes de financiamento

Clique em **Fontes** no menu lateral. Verá:

```
┌──────────────────────┬──────────────────┬────────────────┬──────────┬──────────┐
│ DESIGNAÇÃO           │ TIPO             │ MONTANTE TOTAL │ TAXA     │ ESTADO   │
├──────────────────────┼──────────────────┼────────────────┼──────────┼──────────┤
│ Linha BFA 2026       │ Linha Bancária   │  400.000.000   │  8.5%    │ Activa   │
│ Capital Accionistas  │ Capital Próprio  │  200.000.000   │  5.0%    │ Activa   │
│ Empréstimo BCI       │ Linha Bancária   │  150.000.000   │  9.0%    │ Activa   │
└──────────────────────┴──────────────────┴────────────────┴──────────┴──────────┘
```

### Como cadastrar uma nova fonte

1. Clique em **+ Nova Fonte**
2. Preencha o formulário:

| Campo | O que escrever | Exemplo |
|---|---|---|
| **Designação** | Nome identificativo da fonte | "Linha de Crédito BFA 2026" |
| **Tipo de Fonte** | Seleccionar da lista | "Linha Bancária" |
| **Instituição** | Nome do banco ou entidade | "BFA" |
| **Montante Total (Kz)** | Valor total disponibilizado | `400000000` |
| **Montante Utilizado (Kz)** | Parte já afecta a contratos | `250000000` |
| **Taxa de Juro (% a.a.)** | Quanto a MAIOMBE paga a esta fonte | `8.5` |
| **Data de Maturidade** | Quando termina o contrato com a fonte | `31/12/2027` |
| **Garantia Dada** | Activos entregues como garantia | "Carteira de crédito" |
| **Notas** | Informação adicional relevante | Opcional |

3. Clique em **Guardar**

### Tipos de fonte disponíveis

| Tipo | Quando usar |
|---|---|
| Linha Bancária | Crédito concedido por um banco |
| Capital Próprio | Dinheiro investido pelos accionistas |
| Debêntures | Títulos de dívida emitidos |
| Obrigações | Obrigações emitidas no mercado |
| Fundo | Dinheiro de fundos de investimento |
| Outros | Qualquer outra fonte não listada |

### Estados das fontes

| Estado | O que significa | Conta para análise? |
|---|---|---|
| **Activa** | Linha disponível e a gerar custo | **Sim ✅** |
| **Expirada** | Prazo terminou | Não |
| **Em Execução** | Em processo de liquidação | Não |

> Só fontes **Activas** aparecem na Análise de Intermediação como custo do passivo.

### KPI Cards das Fontes

No topo da página de Fontes encontra 4 indicadores:

| Indicador | O que mostra |
|---|---|
| **Total Captado** | Soma de todas as fontes activas |
| **Linhas Bancárias** | Total captado de bancos |
| **Capital Próprio** | Total dos accionistas |
| **Taxa Passiva Média** | Custo médio ponderado do dinheiro captado |

---

## 7. Módulo Taxas e Juros — Configurar e Analisar

### Para que serve

Este módulo tem duas funções:
1. **Configurar** as regras de taxas e comissões aplicadas pela MAIOMBE
2. **Analisar** o resultado financeiro da intermediação

### O que encontra neste módulo

```
MÓDULO DE TAXAS E JUROS
│
├── KPI Cards (5 indicadores no topo)
│
├── Tabela de Taxas por Tipo de Mutuário
│   └── Define os limites de taxa para cada tipo de cliente
│
├── Política de Comissões
│   └── Define os limites de comissão aceites
│
├── Simulador de Rentabilidade
│   └── Testa cenários antes de criar um contrato
│
└── Análise de Intermediação Financeira
    └── Mostra o resultado real da carteira completa
```

### Os 5 KPI Cards do topo

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ TAXA BASE  │ │ CUSTO      │ │ SPREAD     │ │ TIPOS DE   │ │ RESULTADO  │
│ MÉDIA      │ │ PASSIVO    │ │ MÉDIO      │ │ MUTUÁRIO   │ │ LÍQUIDO    │
│            │ │ MÉDIO      │ │            │ │            │ │            │
│   13.5%    │ │   6.5%     │ │  +7.0 pp   │ │     6      │ │  −45 M Kz  │
│            │ │            │ │            │ │ Com taxas  │ │ Após todos │
│ Mín: 10%  │ │ Taxa actual │ │ Activo vs  │ │ definidas  │ │ os custos  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**Como ler cada card:**

| Card | Boa leitura | Leitura preocupante |
|---|---|---|
| Taxa Base Média | Acima de 10% | Abaixo do custo do passivo |
| Custo Passivo | Abaixo de 8% | Acima de 10% |
| Spread Médio | Positivo e acima de 3 pp | Negativo ou muito baixo |
| Tipos de Mutuário | — | Muito concentrado num só tipo |
| Resultado Líquido | Positivo (verde) | Negativo (vermelho) ⚠️ |

> **pp** = pontos percentuais. Se cobrar 13% e pagar 6%, o spread é 13 − 6 = **7 pp**.

### Tabela de Taxas por Tipo de Mutuário

Aqui estão definidas as taxas mínimas e máximas para cada tipo de cliente. Esta tabela serve como referência ao negociar contratos.

Exemplo:

| Tipo de Mutuário | Taxa Mínima | Taxa Máxima | Taxa Recomendada |
|---|---|---|---|
| Governo Central | 8% | 12% | 10% |
| Ministério | 8% | 13% | 11% |
| Empresa Pública | 10% | 16% | 13% |
| Empresa Privada | 12% | 18% | 15% |
| Particular | 15% | 22% | 18% |

> O Simulador usa esta tabela para validar se a taxa que está a inserir está dentro dos limites aprovados.

### Política de Comissões

Define os intervalos permitidos para cada tipo de comissão. Se no Simulador inserir uma comissão fora destes limites, verá um aviso a laranja.

---

## 8. Simulador de Rentabilidade — Testar Cenários

### Para que serve

Antes de assinar um contrato com um cliente, use o Simulador para perceber se a operação é rentável para a MAIOMBE. É uma ferramenta de decisão — não cria nenhum registo, serve apenas para análise.

### Onde encontrar

No módulo **Taxas e Juros**, coluna lateral direita.

### Como usar o Simulador — Passo a Passo

**Passo 1 — Preencher os dados da operação**

| Campo | O que escrever | Dica |
|---|---|---|
| Capital Mutuado (M Kz) | Valor em **milhões** de Kwanzas | Ex: `500` para 500 milhões |
| Taxa de Juro Activa (%) | Taxa que vai cobrar ao cliente | Ex: `15` |
| Prazo (meses) | Duração do contrato | Ex: `24` |
| Com. Abertura (%) | Comissão de abertura do dossier | Ex: `1.5` |
| Com. Gestão Anual (%) | Comissão anual de acompanhamento | Ex: `0.5` |

**Passo 2 — Preencher dados de custo (opcional mas importante)**

| Campo | O que escrever | Dica |
|---|---|---|
| Custo do Passivo (%) | Taxa média que pagamos às fontes | Vai aparecer automaticamente do módulo Fontes |
| Custos Op. Mensais (M Kz) | Custo mensal de operar a MAIOMBE | **Carregado automaticamente** dos registos de custos |

> Se não tiver fontes registadas, escreva manualmente a taxa que estima pagar. Ex: `8` para 8%.

**Passo 3 — Campos adicionais (só quando aplicável)**

| Campo | Quando usar |
|---|---|
| Capital Não Desembolsado (M Kz) | Se parte do capital aprovado ainda não foi entregue |
| Dias em Atraso | Para simular o impacto de uma situação de mora |

**Passo 4 — Ler os resultados**

Após preencher os campos, os resultados actualizam automaticamente:

```
CASCATA DE RESULTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(+) Juros do Capital         150.000.000 Kz
(+) Comissão de Abertura       7.500.000 Kz
(+) Comissão de Gestão         5.000.000 Kz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(=) TOTAL RECEITAS            162.500.000 Kz

(−) Custo do Passivo           80.000.000 Kz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(=) MARGEM BRUTA               82.500.000 Kz

(−) Custos Operacionais       228.000.000 Kz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(=) RESULTADO LÍQUIDO         −145.500.000 Kz  ← Vermelho = prejudicial
```

**Passo 5 — Tomar a decisão**

| Resultado | O que fazer |
|---|---|
| Resultado Líquido **positivo** (verde) | Operação pode avançar |
| Resultado Líquido **negativo** mas margem bruta positiva | Considerar aumentar taxa ou reduzir custos operacionais |
| Resultado Líquido **muito negativo** | Negociar melhores condições ou rejeitar a operação |

> **Nota importante:** O resultado líquido negativo no simulador **não significa que a operação específica é má**. Significa que os custos operacionais totais da MAIOMBE são maiores que a receita deste contrato individual. Com uma carteira de vários contratos, os custos são partilhados.

### Indicadores adicionais do Simulador

Abaixo da cascata verá 4 indicadores complementares:

| Indicador | O que significa | Bom quando |
|---|---|---|
| **TIR Efectiva** | Taxa de Retorno Interna (%) | Maior que o custo do passivo |
| **Spread** | Diferença entre taxa activa e passiva (pp) | Positivo e elevado |
| **Resultado / Capital** | Rentabilidade líquida em % do capital | Positivo |
| **Capital Recapitalizado (6m)** | Crescimento do capital com juro composto | Referência de valor |

### Verificação automática das comissões

O Simulador compara as comissões inseridas com a Política de Comissões:

- **Sinal verde:** comissão dentro do intervalo aprovado
- **Sinal laranja + mensagem:** comissão fora do intervalo — necessita de aprovação adicional antes de avançar

---

## 9. Análise de Intermediação Financeira — Ler os Resultados

### Para que serve

Enquanto o Simulador testa hipóteses, a **Análise de Intermediação** mostra a realidade — o resultado financeiro de toda a carteira com dados reais da base de dados.

### Onde encontrar

No módulo **Taxas e Juros**, desça até ao fundo da página. Verá a secção "Análise de Intermediação Financeira".

### Como ler a secção — As 3 colunas

A secção está dividida em 3 partes:

---

**COLUNA 1 — Cascata de Resultados (centro)**

Mostra o fluxo financeiro da MAIOMBE de cima para baixo:

```
                    ANÁLISE DE INTERMEDIAÇÃO
 ┌────────────────────────────────────────────────────┐
 │  (+) RECEITA ACTIVA ANUAL           111.000.000 Kz │
 │      ████████████████████████████                  │
 │                                                     │
 │  (−) CUSTO DO PASSIVO ANUAL          42.000.000 Kz │
 │      ████████████                                   │
 │                                                     │
 │  (=) MARGEM BRUTA                    69.000.000 Kz │
 │                                                     │
 │  (−) CUSTOS OPERACIONAIS ANUAIS     114.000.000 Kz │
 │                                                     │
 │  (=) RESULTADO LÍQUIDO              −45.000.000 Kz │
 │                                         ⚠️ ATENÇÃO  │
 │                                                     │
 │  SPREAD DE INTERMEDIAÇÃO: +7.0 pp                  │
 └────────────────────────────────────────────────────┘
```

As barras coloridas mostram visualmente o peso de cada componente.

---

**COLUNA 2 — Detalhe (fontes e contratos)**

Mostra os valores discriminados por fonte e por contrato:

```
FONTES DE FINANCIAMENTO (Custo Anual)
• Linha BFA 2026            32.000.000 Kz  (8.0% × 400M)
• Capital Accionistas       10.000.000 Kz  (5.0% × 200M)
Total Custo Passivo:        42.000.000 Kz

CONTRATOS ACTIVOS (Receita Anual)
• MAI-2026-001 — Min. Finanças    75.000.000 Kz  (15% × 500M)
• MAI-2026-002 — Empresa Alpha    36.000.000 Kz  (12% × 300M)
Total Receita Activa:             111.000.000 Kz
```

---

**COLUNA 3 — Custos Operacionais (CRUD)**

Aqui pode **ver, adicionar, editar e eliminar** os custos operacionais:

```
CUSTOS OPERACIONAIS                         [+ Adicionar]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Salários Equipa       Pessoal      8.000.000 Kz/mês  [✏️] [🗑️]
Licenças Software     Sistema      1.000.000 Kz/mês  [✏️] [🗑️]
Serviços Jurídicos    Jurídico       500.000 Kz/mês  [✏️] [🗑️]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Anual:         114.000.000 Kz
```

### Como adicionar um Custo Operacional

1. Clique em **+ Adicionar** na coluna da direita
2. Preencha:
   - **Designação:** ex. "Salários da Equipa"
   - **Categoria:** Pessoal / Sistema / Jurídico / Administrativo / Outros
   - **Valor Mensal (Kz):** quanto custa por mês
3. Clique em **Guardar**

O sistema calcula automaticamente o custo anual (× 12) e actualiza o Resultado Líquido.

### Como editar um Custo Operacional

1. Clique no ícone de lápis ✏️ ao lado do custo
2. Altere os valores
3. Clique em **Guardar**

### Como desactivar um custo (sem eliminar)

No formulário de edição, desmarque a opção **Activo**. O custo fica registado mas não conta para o total. Útil para custos sazonais ou temporariamente suspensos.

### Como ler o Resultado Líquido no KPI Card

O card **Resultado Líquido** no topo da página actualiza automaticamente com os dados reais:

- **Verde / positivo:** a MAIOMBE está a gerar resultado após todos os custos ✅
- **Vermelho / negativo:** os custos superam a margem — ação necessária ⚠️

**O que fazer quando o resultado é negativo:**

| Causa provável | Solução |
|---|---|
| Poucos contratos activos | Aumentar a carteira de crédito |
| Taxas activas demasiado baixas | Renegociar ou aumentar taxas nos novos contratos |
| Custo do passivo demasiado alto | Procurar fontes de financiamento mais baratas |
| Custos operacionais excessivos | Rever e reduzir custos internos |

---

## 10. Módulo Alertas — Acompanhar Situações de Risco

### Para que serve

O sistema gera alertas automáticos quando detecta situações que precisam de atenção. Este módulo centraliza todos esses alertas.

### Tipos de alerta

| Tipo | Cor | O que significa |
|---|---|---|
| **Prestação Vencida** | Vermelho | Um cliente não pagou na data prevista |
| **Contrato em Risco** | Laranja | O score de risco de um contrato aumentou |
| **Fonte a Expirar** | Laranja | Uma linha de financiamento termina em breve |
| **Exposição Excessiva** | Vermelho | Um cliente excedeu o limite de crédito |
| **Informativo** | Azul | Notificação sem urgência |

### Como ver os alertas

1. Clique em **Alertas** no menu lateral
2. Verá a lista de todos os alertas activos

```
┌────────────────────────────────────────────────────────────────────────┐
│ ⬛ PRESTAÇÃO VENCIDA                                         Urgente   │
│ MAI-2026-005 — Empresa Beta Lda                                        │
│ Prestação nº 8 venceu em 15/05/2026. Valor: 12.500.000 Kz             │
│ Há 15 dias em atraso                                                   │
│                                          [Marcar como Lido]  [Ver]    │
├────────────────────────────────────────────────────────────────────────┤
│ 🟠 FONTE A EXPIRAR                                           Atenção  │
│ Linha BFA 2026                                                         │
│ Maturidade em 25 dias — 10/07/2026. Montante: 400.000.000 Kz          │
│                                          [Marcar como Lido]  [Ver]    │
└────────────────────────────────────────────────────────────────────────┘
```

### O que fazer com cada alerta

**Prestação Vencida:**
1. Clique em **[Ver]** para abrir o contrato
2. Contacte o cliente
3. Se o pagamento for feito, registe-o no plano de amortização
4. Marque o alerta como **Resolvido**

**Fonte a Expirar:**
1. Clique em **[Ver]** para ver os detalhes da fonte
2. Contacte a instituição financeira para renovação
3. Quando renovada, actualize a data de maturidade na ficha da fonte
4. Marque o alerta como **Resolvido**

**Contrato em Risco:**
1. Abra a ficha do contrato
2. Reveja o histórico de pagamentos
3. Actualize a avaliação de risco se necessário
4. Altere o estado do contrato para `Em Risco` se confirmar

### Marcar alertas como lidos

Após tomar conhecimento (sem necessariamente resolver), clique em **Marcar como Lido**. O alerta fica arquivado mas pode ser consultado no histórico.

---

## 11. Perguntas Comuns dos Utilizadores

**P: Criei um contrato mas não aparece na Análise de Intermediação. Porquê?**

R: Verifique o estado do contrato. Só aparecem contratos com estado **Recebidos**, **Em Vigor**, **Em Risco** ou **Vencido**. Se estiver em **Elaboração**, altere o estado para **Recebidos** quando o capital for desembolsado.

---

**P: O NIF de um cliente foi escrito errado. Como corrijo?**

R: O NIF não pode ser alterado após o cadastro (protecção de integridade dos dados). Contacte o administrador do sistema para corrigir directamente na base de dados.

---

**P: Esqueci-me da password. O que fazer?**

R: Contacte o administrador do sistema. Ele pode redefinir a sua password.

---

**P: Posso apagar um contrato?**

R: Não é possível apagar permanentemente (os dados ficam guardados por razões de auditoria). Pode alterar o estado para **Cancelado** se o contrato não chegou a vigorar.

---

**P: O Resultado Líquido aparece a vermelho. É grave?**

R: Significa que os custos totais superam a margem gerada. É uma situação a monitorizar e actuar. Consulte a direcção para definir as acções — aumentar carteira, reduzir custos ou renegociar condições das fontes de financiamento.

---

**P: Porque é que o Simulador mostra resultado negativo mas o Director diz que a operação é boa?**

R: O Simulador distribui os custos operacionais **totais** por um único contrato. Se a MAIOMBE tiver 20 contratos activos, os custos são partilhados entre todos. Um contrato individual pode parecer deficitário quando analisado isoladamente, mas rentável quando considerado no contexto da carteira total.

---

**P: Registei um custo operacional mas o valor não actualiza imediatamente. O que fazer?**

R: Aguarde um momento e recarregue a página (F5). Os dados são carregados ao abrir a página. Em alguns casos há um breve atraso de sincronização.

---

**P: Posso exportar os dados para Excel?**

R: Sim. Algumas listagens têm botão de exportação. Se não encontrar, contacte o administrador para relatórios personalizados.

---

**P: O sistema deu um erro a vermelho no topo da página. O que faço?**

R: Anote a mensagem de erro e contacte o responsável de TI. Normalmente são situações passageiras relacionadas com a ligação ao servidor.

---

**P: Quanto tempo fica a sessão activa?**

R: 8 horas após o login. Se fechar e voltar a abrir o browser dentro deste período, não precisa de fazer login novamente. Após 8 horas, terá de entrar novamente.

---

## 12. Erros Comuns e Como Resolver

| Mensagem de erro | Causa | Solução |
|---|---|---|
| "Credenciais inválidas" | Email ou password errados | Verifique email e password. Se persistir, contacte o administrador |
| "NIF já existe no sistema" | Já existe cliente com esse NIF | Pesquise o cliente pelo NIF — pode já estar cadastrado |
| "Cliente não encontrado" | Seleccionou um cliente que foi inactivado | Verifique se o cliente está activo no módulo Clientes |
| "Campo obrigatório" | Tentou guardar sem preencher todos os campos necessários | Preencha os campos assinalados a vermelho e tente guardar novamente |
| "Sessão expirada" | Passou mais de 8 horas sem actividade | Faça login novamente |
| Página em branco ao carregar | Problema de ligação ao servidor | Aguarde 30 segundos e recarregue a página (F5) |
| "Erro 404" ao escrever um URL directamente | O endereço não existe ou a página foi movida | Use sempre o menu lateral para navegar |
| Números não aparecem (só "—") | Dados não carregados ou não existentes | Recarregue a página; se persistir, verifique se há registos no módulo correspondente |

---

*Manual de Formação do Utilizador — Sistema MAIOMBE*
*Capital & Credit, Lda. · Para uso interno · Junho 2026*
*Versão 1.0 — Cobre todos os módulos do sistema*
