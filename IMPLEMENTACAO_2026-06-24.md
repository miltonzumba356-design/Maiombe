# MAIOMBE — Implementações de 24 de Junho de 2026

---

## 1. Tabela de Comissões — Política Interna Maiombe (`Rates.tsx`)

### O que foi feito
A página de Taxas (`/taxas`) passou a ter como elemento principal a **Tabela de Comissões — Política Interna Maiombe**, em vez de apenas a tabela de taxas por mutuário.

### 6 tipos de comissão implementados

| Comissão | Intervalo |
|---|---|
| Comissão de Abertura | 1% – 2.5% |
| Comissão de Gestão Anual | 0.5% – 2% |
| Comissão de Imobilização | 0.25%/mês |
| Comissão de Reestruturação | 0.5% – 1.5% |
| Penalidade de Pré-pagamento | 1% – 3% |
| Juros de Mora | 0.05%/dia |

### Funcionalidades
- Edição inline de cada comissão diretamente na tabela
- Adição de novos tipos de comissão via formulário
- Eliminação de comissões
- Ligado ao backend: `PUT /commissions/:id`, `POST /commissions`, `DELETE /commissions/:id`
- Simulador integrado que calcula:
  - Juros totais
  - Comissão de abertura
  - Comissão de gestão anual
  - Imobilização
  - Mora acumulada
  - TIR estimada
  - Alertas de violação de política por item

---

## 2. Hook Partilhado `useCommissionPolicy`

**Ficheiro:** `client/src/hooks/useCommissionPolicy.ts`

Hook reutilizável que expõe a política de comissões a todos os módulos do sistema sem duplicar chamadas à API (TanStack Query faz cache de `/rates`).

### Exports
- `pol` — objetos das 6 comissões (abertura, gestão, imob, mora, reestrutura, prePag)
- `rateTables` — tabela de taxas por tipo de mutuário
- `globalMinRate` / `globalMaxRate` — extremos globais da tabela
- `checkRate(rate)` — verifica se uma taxa de juro está fora da política
- `checkMoraRate(rate)` — verifica se uma taxa de mora está fora da política
- `checkAbertura(rate)` — verifica comissão de abertura
- `checkGestao(rate)` — verifica comissão de gestão
- `calcMora(capital, dias)` — calcula juros de mora: `capital × (rate%/dia) × dias`

---

## 3. Componentes de Alerta de Política (`PolicyAlert.tsx`)

**Ficheiro:** `client/src/components/ui/PolicyAlert.tsx`

Três componentes para sinalizar violações da política em contextos diferentes:

| Componente | Uso |
|---|---|
| `PolicyAlert` | Bloco de alertas em formulários e áreas expandidas |
| `PolicyBadge` | Badge inline `⚠` em células de tabela |
| `PolicyInfoBanner` | Faixa informativa verde no topo de painéis |

---

## 4. Validação de Política em Todos os Módulos

A mesma lógica de validação que existe no simulador foi propagada a todos os módulos que usam dados de taxas/comissões.

### `Contracts.tsx`
- `PolicyBadge` ao lado da taxa de juro em cada linha de contrato
- `PolicyAlert` na área expandida de contratos com taxa fora do intervalo

### `Collection.tsx`
- `PolicyInfoBanner` no topo do calendário quando existem itens vencidos
- Cada linha vencida mostra os dias de atraso e a mora acumulada calculada com a taxa real da política

### `Liabilities.tsx`
- Campo `late_interest_rate` com borda laranja e `PolicyAlert compact` quando o valor está fora do intervalo da política

---

## 5. Notificações via WhatsApp (Z-API) e Email (Google SMTP)

### Backend

**Ficheiro:** `server/src/services/notification.service.ts`

#### `NotificationService`

**`sendWhatsApp(opts)`**
- Integração com Z-API: `POST https://api.z-api.io/instances/{id}/token/{token}/send-text`
- Formatação automática do telefone angolano (244XXXXXXXXX)
- Header `Client-Token` incluído
- Regista resultado (sucesso ou falha) em `notification_logs`

**`sendEmail(opts)`**
- Google SMTP via `nodemailer` (host: smtp.gmail.com, port: 587, STARTTLS)
- Template HTML com brand MAIOMBE (verde #1A7A3C, dourado #FFC72C)
- Suporte a botão CTA (link de assinatura, etc.)
- Regista resultado em `notification_logs`

**`getLogs(contractId?)`**
- Lista os últimos 100 logs de notificação (ou 50 filtrados por contrato)

#### Tabela `notification_logs` (nova)
```
id, type, channel, recipient_name, recipient_phone, recipient_email,
subject, message, status, error, contract_id, created_at, created_by
```

#### Rotas (autenticadas)
```
POST /api/v1/notifications/whatsapp
POST /api/v1/notifications/email
GET  /api/v1/notifications/logs
```

---

## 6. Assinaturas Digitais

### Backend

**Ficheiro:** `server/src/services/signature.service.ts`

#### `SignatureService`

**`requestSignature(data)`**
- Gera token UUID único
- Insere em `digital_signatures` com expiração em 7 dias
- Envia link via WhatsApp e/ou email ao signatário
- Link gerado: `{APP_URL}/assinar/{token}`
- Mensagens pré-formatadas em português (WhatsApp: texto bold/itálico; Email: HTML)

**`getByToken(token)`**
- Endpoint público — retorna dados do documento e do contrato associado
- Não expõe dados sensíveis internos

**`sign(token, ip, userAgent)`**
- Valida token: existência, estado, expiração
- Regista: `status='assinado'`, `signed_at`, `ip_address`, `user_agent`

**`refuse(token)`**
- Muda estado para `recusado`

**`listByContract(contractId)`**
- Lista todas as assinaturas de um contrato

#### Tabela `digital_signatures` (nova)
```
id, token, contract_id, document_type, signer_name, signer_phone, signer_email,
signer_role, document_title, document_summary, status, ip_address, user_agent,
signed_at, expires_at, sent_via, created_at, created_by
```

Estados possíveis: `pendente` → `assinado` / `recusado` / `expirado`

#### Rotas autenticadas
```
POST /api/v1/signatures/request
GET  /api/v1/signatures/contract/:contractId
```

#### Rotas públicas (sem autenticação)
```
GET  /api/v1/public/sign/:token       → dados do documento
POST /api/v1/public/sign/:token       → confirmar assinatura (1 clique)
POST /api/v1/public/sign/:token/refuse → recusar assinatura
```

---

## 7. Página Pública de Assinatura (`/assinar/:token`)

**Ficheiro:** `client/src/pages/Sign.tsx`

Página completamente pública, fora do `AppLayout` (não exige login). Acessível por qualquer pessoa que receba o link.

### Estados da página
| Estado | O que mostra |
|---|---|
| A carregar | Spinner com "A carregar documento..." |
| Token inválido | Mensagem de erro com instrução de contacto |
| Expirado | Aviso com a data de expiração |
| Já assinado | Confirmação com data/hora da assinatura |
| Recusado | Mensagem de recusa |
| **Pendente (principal)** | Formulário completo de assinatura |
| Sucesso | Ecrã de confirmação com timestamp |

### Fluxo do utilizador (estado pendente)
1. Vê o cabeçalho MAIOMBE
2. Vê o nome do documento e validade do link
3. Vê os seus dados (nome, cargo)
4. Lê o resumo do documento (se preenchido)
5. Vê os dados do contrato (referência, mutuário, valor, taxa, datas)
6. Lê a declaração de consentimento
7. Marca o checkbox de confirmação
8. Clica em **"Assinar Documento"** (botão só activa após checkbox)
9. Vê ecrã de sucesso

Existe também o botão **"Recusar"** com confirmação (`window.confirm`).

### Integração em `App.tsx`
```tsx
<Route path="/assinar/:token" element={<Sign />} />
```
Colocada antes do `<AppLayout />`, garantindo acesso sem autenticação.

---

## 8. Modais de Notificação e Assinatura no Frontend

### `Contracts.tsx` — 2 novos modais

#### Modal "Pedido de Assinatura Digital"
- Acessível via botão **"Assinar"** na tabela "Em Formalização"
- Acessível via botão **"Pedir Assinatura Digital"** na linha expandida (apenas contratos em elaboração)
- Campos: nome do signatário, telefone, email, cargo/papel
- Selector de canal: WhatsApp / Email / Ambos
- Pré-preenche o nome com o nome do mutuário do contrato
- Após envio: mostra o link gerado e confirmações de envio

#### Modal "Notificação de Mutuário"
- Acessível via botão **"Notificar Mutuário"** na linha expandida de todos os contratos
- Campos: telefone, email, mensagem (editável)
- Mensagem pré-preenchida com referência do contrato
- Envia simultaneamente para WhatsApp e email se ambos preenchidos

### `Collection.tsx` — Modal de Cobrança

- Botão **"Notif."** aparece apenas em linhas com estado `vencido`
- Mensagem pré-preenchida com:
  - Nome do mutuário
  - Número da prestação
  - Referência do contrato
  - Dias de atraso
  - Valor total com mora incluída
- Modal com campos de telefone e email

---

## 9. Variáveis de Ambiente (`.env`)

```env
# WhatsApp via Z-API
ZAPI_INSTANCE_ID=SEU_INSTANCE_ID
ZAPI_TOKEN=SEU_TOKEN
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN

# Email via Google SMTP
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua_app_password_google

# URL pública da aplicação (para gerar links de assinatura)
APP_URL=http://localhost:5173
```

> Para obter `SMTP_PASS` no Google: Conta Google → Segurança → Verificação em dois passos → Palavras-passe de aplicação.

---

## Arquitetura geral da funcionalidade de notificações

```
Sistema MAIOMBE
      │
      ├─ Contracts.tsx ──→ [Modal Assinatura] ──→ POST /signatures/request
      │                                                    │
      │                                            SignatureService
      │                                                    │
      │                                            NotificationService
      │                                           /              \
      │                                      Z-API            Gmail SMTP
      │                                   (WhatsApp)           (Email)
      │
      ├─ Collection.tsx ──→ [Modal Cobrança] ──→ POST /notifications/whatsapp
      │                                          POST /notifications/email
      │
      └─ /assinar/:token (público, sem login)
              │
              GET  /public/sign/:token   → ver documento
              POST /public/sign/:token   → assinar com 1 clique
              POST /public/sign/:token/refuse → recusar
```

---

## Ficheiros criados/modificados

| Ficheiro | Tipo |
|---|---|
| `server/src/database/migrate.ts` | Modificado — 2 novas tabelas |
| `server/src/services/notification.service.ts` | **Criado** |
| `server/src/services/signature.service.ts` | **Criado** |
| `server/src/routes/index.ts` | Modificado — 7 novas rotas |
| `server/.env` | Modificado — variáveis Z-API e SMTP |
| `client/src/pages/Sign.tsx` | **Criado** |
| `client/src/pages/Contracts.tsx` | Modificado — 2 modais, botões |
| `client/src/pages/Collection.tsx` | Modificado — modal de cobrança |
| `client/src/pages/Rates.tsx` | Modificado — tabela de comissões, simulador |
| `client/src/hooks/useCommissionPolicy.ts` | **Criado** |
| `client/src/components/ui/PolicyAlert.tsx` | **Criado** |
| `client/src/pages/Liabilities.tsx` | Modificado — validação mora |
| `client/src/App.tsx` | Modificado — rota pública `/assinar/:token` |
