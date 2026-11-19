# Pixel Office — MVP 0.1

Visualizador local de eventos do Cursor em um escritório pixel-art.

## O que já está implementado

- Manifesto de Cursor Plugin.
- Hooks para sessão, prompt, pensamento, ferramentas, subagentes, edição de arquivos e encerramento.
- Ponte Node.js que recebe JSON via stdin e envia eventos para `127.0.0.1`.
- Extensão VS Code/Cursor com painel Webview.
- Escritório inicial com personagens por categoria e feed em português simples.
- Sem telemetria externa e sem dependência de nuvem.

## Limitações conhecidas do MVP

1. O painel precisa estar ativo para receber eventos; nesta primeira versão não há persistência/replay.
2. O agrupamento de personagens é heurístico. A identificação exata de cada agente/subagente depende dos campos realmente enviados em cada versão do Cursor.
3. A ponte e o coletor usam a porta local fixa 4317. Mantenha essa porta livre.
4. `afterAgentThought` registra apenas o evento disponibilizado pelo Cursor. Não revela cadeia de pensamento privada do modelo.
5. O cenário atual usa emoji como placeholders; os sprites pixel-art isométricos finais serão uma etapa visual posterior.

## Instalação para desenvolvimento

### 1. Requisitos
- Node.js 20+
- Cursor IDE
- VS Code (opcional, para executar a extensão em modo desenvolvimento)

### 2. Compilar a extensão
Na raiz do projeto:

```bash
npm install
npm run compile
```

Abra a pasta no Cursor/VS Code e pressione `F5` para abrir uma janela Extension Development Host.

### 3. Instalar os Hooks do plugin
Copie a pasta do plugin para:

- Windows: `%USERPROFILE%\.cursor\plugins\local\pixel-office`
- macOS/Linux: `~/.cursor/plugins/local/pixel-office`

A pasta copiada deve conter `.cursor-plugin/`, `hooks/` e `scripts/`.

Reinicie o Cursor ou recarregue a configuração de plugins. Ative o plugin em Customize, se necessário.

### 4. Abrir o painel
Na janela de desenvolvimento, execute:
`Pixel Office: Open Live Office`

No Cursor com plugin instalado, abra a extensão Pixel Office na Activity Bar.

## Próximas melhorias prioritárias

- Porta local fixa configurável e descoberta automática.
- Buffer de eventos para painel fechado.
- Persistência SQLite e replay da sessão.
- Identificação por `agent_id`, `parent_id`, `tool_name` e `tool_call_id`.
- Sprites isométricos próprios, estados de animação e mapa de departamentos.
- Detalhes por personagem com resumo simples e payload técnico opcional.
- Empacotamento VSIX e teste de instalação no Cursor estável.
