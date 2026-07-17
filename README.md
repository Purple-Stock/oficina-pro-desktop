# Oficina Pro Desktop

Sistema offline de **oficina mecânica** para Windows, macOS e Linux.

Baseado em Tauri 2 + React 19 + TypeScript + SQLite. Dados ficam no computador, sem mensalidade e sem login obrigatório.

## Funcionalidades (MVP)

- Ordens de Serviço (OS) com status e totais
- Clientes e veículos (placa, marca, modelo, km)
- Catálogo de serviços (mão de obra)
- Estoque de peças (entrada, saída, ajuste, transferência)
- Baixa automática de peças ao fechar a OS
- Relatórios de estoque
- Multi-oficina no mesmo PC

## Desenvolvimento

```bash
npm install
npm run tauri:dev
```

Vite: http://localhost:1420/

## Scripts

| Comando               | Descrição                                 |
| --------------------- | ----------------------------------------- |
| `npm run tauri:dev`   | App desktop em desenvolvimento            |
| `npm run tauri:build` | Build de produção                         |
| `npm test`            | Vitest + teste Rust SQLite                |
| `npm run verify`      | format + lint + typecheck + tests + build |

## Dados locais

macOS:

```
~/Library/Application Support/com.matheuspuppe.oficina-pro-desktop/oficina-pro.db
```

## Mercado Livre

Texto do anúncio em `docs/mercado-livre-descricao.html`.

## Origem

Fork do Purple Stock Desktop, adaptado para o domínio de oficina mecânica.
