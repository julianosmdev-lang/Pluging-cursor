# Modelo de evento (normalizado)

```ts
type PixelOfficeEvent = {
  id: string;
  sessionId?: string;
  parentId?: string;
  actorType: "orchestrator" | "agent" | "subagent" | "tool" | "system" | "unknown";
  actorId?: string;
  actorName?: string;
  eventType: string;
  status: "started" | "completed" | "failed" | "observed" | "unknown";
  toolName?: string;
  filePath?: string;
  summaryPtBr: string;
  timestamp: string;
  raw: unknown;
};
```

O MVP mantém o payload original para inspeção, mas a interface deve apresentar apenas resumos seguros. Nunca exibir segredos, tokens, conteúdo integral de arquivos ou raciocínio privado do modelo.
