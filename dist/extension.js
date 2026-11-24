"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("node:http"));
let server;
let port = 4317;
const clients = new Set();
function safeJson(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.setEncoding("utf8");
        req.on("data", chunk => {
            body += chunk;
            if (body.length > 1_000_000) {
                reject(new Error("Payload too large"));
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            }
            catch (e) {
                reject(e);
            }
        });
        req.on("error", reject);
    });
}
function broadcast(event) {
    const message = { type: "event", event };
    for (const webview of clients)
        void webview.postMessage(message);
}
function startServer(context) {
    return new Promise((resolve, reject) => {
        server = http.createServer(async (req, res) => {
            // Localhost-only bridge; no CORS and no remote binding.
            if (req.method === "GET" && req.url === "/health") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ ok: true, app: "pixel-office" }));
                return;
            }
            if (req.method !== "POST" || req.url !== "/event") {
                res.writeHead(404);
                res.end("Not found");
                return;
            }
            try {
                const input = await safeJson(req);
                const event = {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    hook: String(input.hook || "unknown"),
                    receivedAt: String(input.receivedAt || new Date().toISOString()),
                    projectDir: input.projectDir || null,
                    payload: input.payload && typeof input.payload === "object" ? input.payload : {}
                };
                broadcast(event);
                res.writeHead(202, { "content-type": "application/json" });
                res.end(JSON.stringify({ accepted: true }));
            }
            catch {
                res.writeHead(400);
                res.end("Invalid event");
            }
        });
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            port = server.address().port;
            process.env.PIXEL_OFFICE_PORT = String(port);
            // The hook bridge defaults to 4317; expose the selected port in extension settings.
            void vscode.workspace.getConfiguration("pixelOffice").update("port", port, vscode.ConfigurationTarget.Workspace);
            resolve();
        });
    });
}
class OfficeViewProvider {
    context;
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(view) {
        view.webview.options = { enableScripts: true };
        clients.add(view.webview);
        view.onDidDispose(() => clients.delete(view.webview));
        view.webview.html = this.html(view.webview);
        view.webview.onDidReceiveMessage(message => {
            if (message?.type === "ping")
                void view.webview.postMessage({ type: "status", port });
            if (message?.type === "clear")
                void view.webview.postMessage({ type: "clear" });
        });
    }
    html(webview) {
        const nonce = String(Date.now());
        return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>Pixel Office</title>
<style>
:root{color-scheme:dark;--bg:#101820;--panel:#1a2933;--line:#344955;--mint:#80d6ae;--muted:#9bb0ba}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#edf5f4;font:13px/1.45 system-ui,sans-serif}
header{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border-bottom:1px solid var(--line)}
h1{font-size:15px;margin:0;letter-spacing:1px}.sub{color:var(--muted);font-size:11px}
.status{color:var(--mint);font-size:11px}.wrap{padding:12px;max-width:1000px;margin:auto}
.office{position:relative;min-height:350px;border:1px solid var(--line);border-radius:12px;overflow:hidden;
background:linear-gradient(135deg,#243c42,#172b35 60%,#23343c)}
.office:before{content:"";position:absolute;inset:0;opacity:.3;background-image:linear-gradient(30deg,#57716d 1px,transparent 1px),linear-gradient(150deg,#57716d 1px,transparent 1px);background-size:34px 20px}
.room{position:relative;display:grid;grid-template-columns:repeat(3,minmax(90px,1fr));gap:15px;padding:25px 15px;min-height:350px;align-items:center}
.desk{position:relative;text-align:center;min-height:120px;padding:10px 5px;border:1px solid #47636a;border-radius:9px;background:#203942cc;box-shadow:0 5px 0 #12252b}
.avatar{font-size:34px;line-height:1.5;filter:drop-shadow(2px 2px 0 #101820);image-rendering:pixelated}
.person{font-size:11px;font-weight:700}.task{font-size:10px;color:#b8c9c9;min-height:28px;overflow-wrap:anywhere}
.monitor{font-size:17px;color:var(--mint)}.working .avatar{animation:bob .55s steps(2) infinite}.working .monitor{color:#f5d47a}
@keyframes bob{50%{transform:translateY(-3px)}}.empty{grid-column:1/-1;text-align:center;color:#b8c9c9;padding:45px 10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px}
.card h2{font-size:12px;margin:0 0 8px;color:var(--mint)}.metric{font-size:22px;font-weight:700}
.feed{max-height:220px;overflow:auto}.entry{padding:7px 0;border-top:1px solid #31434c;font-size:11px}
.entry time{color:#83c7b0;margin-right:7px}.muted{color:var(--muted)}
button{background:#294c49;color:#effff8;border:1px solid #4d8b78;border-radius:7px;padding:6px 9px;cursor:pointer}
@media(max-width:520px){.room{grid-template-columns:repeat(2,minmax(90px,1fr))}.grid{grid-template-columns:1fr}}
</style></head><body>
<header><div><h1>PIXEL OFFICE</h1><div class="sub">Central visual de operações do Cursor</div></div><div class="status" id="status">● aguardando eventos</div></header>
<div class="wrap"><section class="office"><div class="room" id="room">
<div class="empty" id="empty">🏢<br><b>Escritório pronto para trabalhar</b><br><span class="muted">Envie uma solicitação ao Cursor para observar os eventos.</span></div>
</div></section>
<div class="grid">
<section class="card"><h2>OPERAÇÃO ATUAL</h2><div class="metric" id="count">0</div><div class="muted">eventos recebidos nesta sessão</div></section>
<section class="card"><h2>ATIVIDADE</h2><div class="metric" id="active">Aguardando</div><div class="muted" id="last">Nenhuma atividade registrada</div></section>
<section class="card" style="grid-column:1/-1"><h2>REGISTRO DE ATIVIDADES <button id="clear" style="float:right">Limpar tela</button></h2><div class="feed" id="feed"><div class="muted">Os eventos aparecerão aqui em português simples.</div></div></section>
</div></div>
<script nonce="${nonce}">
const room=document.getElementById('room'),feed=document.getElementById('feed');
const people=new Map();let total=0;
const roles=[
 {key:'session',name:'Orquestrador',emoji:'🧑‍💼'},
 {key:'subagent',name:'Subagente',emoji:'🧑‍🔬'},
 {key:'tool',name:'Operador de ferramentas',emoji:'🧑‍💻'},
 {key:'file',name:'Programador',emoji:'👩‍💻'},
 {key:'review',name:'Revisor',emoji:'🧑‍🏫'}
];
function classify(hook){
 if(hook.toLowerCase().includes('subagent'))return roles[1];
 if(hook.toLowerCase().includes('tool')||hook.toLowerCase().includes('shell')||hook.toLowerCase().includes('mcp'))return roles[2];
 if(hook.toLowerCase().includes('file'))return roles[3];
 if(hook.toLowerCase().includes('thought')||hook.toLowerCase().includes('response'))return roles[4];
 return roles[0];
}
function explain(e){
 const map={
 sessionStart:'Uma nova sessão foi iniciada.',
 sessionEnd:'A sessão foi encerrada.',
 beforeSubmitPrompt:'Uma solicitação foi enviada ao agente.',
 afterAgentThought:'O agente registrou uma etapa de pensamento.',
 preToolUse:'O agente está prestes a usar uma ferramenta.',
 postToolUse:'Uma ferramenta terminou de executar.',
 postToolUseFailure:'Uma ferramenta encontrou um erro.',
 subagentStart:'Um subagente começou a trabalhar.',
 subagentStop:'Um subagente terminou o trabalho.',
 afterFileEdit:'Um arquivo foi alterado.',
 afterAgentResponse:'O agente produziu uma resposta.',
 stop:'O ciclo de execução do agente terminou.'
 };
 return map[e.hook]||'Uma atividade foi registrada: '+e.hook;
}
function addPerson(role,task,working){
 const id=role.key;let el=people.get(id);
 if(!el){
  el=document.createElement('div');el.className='desk';
  el.innerHTML='<div class="avatar"></div><div class="person"></div><div class="monitor">▣ ▣</div><div class="task"></div>';
  room.appendChild(el);people.set(id,el);
 }
 el.className='desk'+(working?' working':'');
 el.querySelector('.avatar').textContent=role.emoji;
 el.querySelector('.person').textContent=role.name;
 el.querySelector('.task').textContent=task;
}
function receive(e){
 total++;document.getElementById('count').textContent=total;
 const role=classify(e.hook),message=explain(e);
 const active=!['stop','sessionEnd','subagentStop'].includes(e.hook);
 addPerson(role,message,active);
 document.getElementById('empty')?.remove();
 document.getElementById('active').textContent=active?'Trabalhando':'Concluído';
 document.getElementById('last').textContent=message;
 const row=document.createElement('div');row.className='entry';
 const time=document.createElement('time');time.textContent=new Date(e.receivedAt).toLocaleTimeString('pt-BR');
 const label=document.createElement('span');label.textContent=message+' ('+e.hook+')';
 row.append(time,label);feed.prepend(row);
 while(feed.children.length>80)feed.lastChild.remove();
 document.getElementById('status').textContent='● recebendo eventos';
}
window.addEventListener('message',ev=>{
 const m=ev.data;
 if(m.type==='event')receive(m.event);
 if(m.type==='status')document.getElementById('status').textContent='● painel conectado';
 if(m.type==='clear'){feed.innerHTML='';people.clear();room.innerHTML='<div class="empty">🏢<br><b>Escritório limpo</b></div>';total=0;document.getElementById('count').textContent='0';}
});
document.getElementById('clear').addEventListener('click',()=>{people.clear();room.innerHTML='<div class="empty">🏢<br><b>Escritório limpo</b></div>';feed.innerHTML='';total=0;document.getElementById('count').textContent='0';});
const vscode=acquireVsCodeApi();vscode.postMessage({type:'ping'});
</script></body></html>`;
    }
}
async function activate(context) {
    await startServer(context);
    const provider = new OfficeViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("pixelOffice.dashboard", provider), vscode.commands.registerCommand("pixelOffice.open", async () => {
        await vscode.commands.executeCommand("workbench.view.extension.pixelOffice");
    }), { dispose: () => { for (const c of clients)
            clients.delete(c); server?.close(); } });
    vscode.window.showInformationMessage(`Pixel Office está pronto. Porta local: ${port}`);
}
function deactivate() {
    server?.close();
}
//# sourceMappingURL=extension.js.map