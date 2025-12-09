import { ChangeDetectionStrategy, Component, OnInit, signal, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';
import { ChangeRecord, GeminiAnalysis, LogEntry } from './models';

type ActiveView = 'dashboard' | 'analyzer' | 'history' | 'rules' | 'logs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  activeView: WritableSignal<ActiveView> = signal('dashboard');
  
  // Code Analyzer State
  analyzerCode = signal('');
  analyzerQuery = signal('');
  geminiAnalysis: WritableSignal<GeminiAnalysis | null> = signal(null);
  geminiError = signal('');
  isAnalyzing = signal(false);

  // Mock Data
  governanceRules = signal('');
  changeHistory = signal<ChangeRecord[]>([]);
  logs = signal<LogEntry[]>([]);
  
  // Dashboard metrics (mocked)
  metrics = computed(() => {
      const history = this.changeHistory();
      const agentChanges = history.filter(c => c.author === 'agent').length;
      const humanChanges = history.filter(c => c.author === 'human').length;
      const highImpact = history.filter(c => c.impactScore > 7).length;
      return {
          totalChanges: history.length,
          agentChanges,
          humanChanges,
          revertedChanges: history.filter(c => c.status === 'reverted').length,
          highImpactChanges: highImpact,
          averageImpact: history.length > 0 ? (history.reduce((acc, c) => acc + c.impactScore, 0) / history.length) : 0,
      };
  });

  constructor(private geminiService: GeminiService) {}

  ngOnInit() {
    this.loadMockData();
    this.analyzerCode.set(this.mockCodeSnippet);
    this.analyzerQuery.set('Analise este código em busca de violações da regra de "Reposição Imediata" e sugira melhorias de custo/eficiência.');
  }

  setView(view: ActiveView) {
    this.activeView.set(view);
  }

  async analyzeWithGemini() {
    if (!this.analyzerCode() || !this.analyzerQuery()) return;
    
    this.isAnalyzing.set(true);
    this.geminiAnalysis.set(null);
    this.geminiError.set('');

    try {
      const analysis = await this.geminiService.analyzeCode(
        this.analyzerCode(),
        this.analyzerQuery(),
        this.governanceRules()
      );
      this.geminiAnalysis.set(analysis);
    } catch (error) {
      this.geminiError.set(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  formatToLocaleString(timestamp: number | string): string {
    return new Date(timestamp).toLocaleString();
  }

  formatToLocaleTimeString(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  private loadMockData() {
    this.governanceRules.set(this.mockGovernanceRules);
    this.changeHistory.set(this.mockChangeHistory.sort((a,b) => b.timestamp - a.timestamp));
    this.logs.set(this.mockLogs);
  }
  
  // --- MOCK DATA ---
  private readonly mockCodeSnippet = `
async function closeAndReplaceIndividualLeg(
  operation: Operation,
  closeReason: string
): Promise<void> {
  const symbol = operation.symbol;
  const originalSide = operation.side; // 'Buy' or 'Sell'

  // Step 1: Close the individual position
  await closePositionOnBybit(operation, closeReason);
  
  // Step 2: Update state
  robotState.closePosition(operation, closeReason);

  // ANTI-PATTERN: Delay before reopening
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 3: Reopen on SAME side
  const currentPrice = await getCurrentPrice(symbol);
  const quantity = await calculateQuantity(symbol, currentPrice);
  
  await openPosition(
    symbol,
    originalSide, // SAME SIDE!
    quantity,
    currentPrice
  );
}
  `;

  private readonly mockGovernanceRules = `
### 🛑 FONTE DA VERDADE (Regras Imutáveis)

#### 1. Estrutura Operacional
- **Plataforma:** Bybit API V5 (Linear Perpetual)
- **Infra:** Render (Backend Node.js) + AWS DynamoDB (Free Tier)
- **Modo:** Hedge (Long e Short simultâneos)
- **Alavancagem:** x10 (Cross Margin)
- **Volume:** 0.60 USDT de margem por perna (Total do par: 1.20 USDT)

#### 2. Regras de Inicialização
- Consultar API da Bybit ('/v5/position/list') ao iniciar
- Sincronizar estado com Bybit (não confiar apenas no banco)
- Importar posições da Bybit não presentes no bot
- Descartar posições do bot não presentes na Bybit
- Atualizar saldo via API antes de calcular Stop Diário

#### 3. Regras de Entrada (Fila de 30 Ativos)
- **Sequência Obrigatória:** COMPRA → 2 segundos → VENDA
- **Intervalo entre Ativos:** 30 segundos
- **Validação:** Saldo, margem e evitar duplicatas

#### 4. Regras de Saída (Gain & Loss)
- **Gain ≥ +0.30 USDT:** Fechar IMEDIATAMENTE
- **Gain entre +0.10 e +0.29 USDT:** Aguardar 5 minutos → Fechar
- **Loss ≤ -0.65 USDT:** Fechar IMEDIATAMENTE (Stop Loss)
- **Loss entre -0.64 e < 0 USDT:** Aguardar 60 minutos → Fechar

#### 5. Regras de Reposição (Hedge Infinito)
- Repor perna fechada IMEDIATAMENTE após fechamento
- Mesma moeda, mesmo lado, mesmo valor (0.60 x10)
- Aguardar 2 segundos após fechamento para enviar reposição
  `;

  private readonly mockChangeHistory: ChangeRecord[] = [
    {
        "id": "CHG_1765145975343_6955a339",
        "timestamp": 1765145975343,
        "type": "code",
        "files": ["trading-engine.service.ts"],
        "description": "Refatorado o cálculo de P&L para usar o preço de mercado mais recente.",
        "reason": "Melhorar a precisão do P&L flutuante.",
        "author": "agent",
        "impactScore": 6,
        "status": "active"
    },
    {
        "id": "CHG_1765135080558_54dfe990",
        "timestamp": 1765135080558,
        "type": "config",
        "files": ["hedge-assets.ts"],
        "description": "Adicionado SOLUSDT e AVAXUSDT à lista de ativos de hedge.",
        "reason": "Expandir a diversificação de ativos.",
        "author": "human",
        "impactScore": 4,
        "status": "active"
    },
    {
        "id": "CHG_1765123633657_8331ea36",
        "timestamp": 1765123633657,
        "type": "strategy",
        "files": ["trading-engine.service.ts"],
        "description": "Ajustado o tempo de espera para fechamento de lucro de 5 para 3 minutos.",
        "reason": "Estratégia de saída mais agressiva.",
        "author": "agent",
        "impactScore": 8,
        "status": "reverted"
    },
    {
        "id": "CHG_1765042736807_a8770515",
        "timestamp": 1765042736807,
        "type": "infrastructure",
        "files": ["render.yaml"],
        "description": "Atualizado a versão do Node.js para 20.14.0 no ambiente Render.",
        "reason": "Manter o ambiente atualizado.",
        "author": "human",
        "impactScore": 2,
        "status": "active"
    }
  ];

  private readonly mockLogs: LogEntry[] = [
    { timestamp: new Date().toISOString(), level: 'CRITICAL', message: 'HEDGE IMBALANCE: BTCUSDT has 2 Buy and 1 Sell', context: { symbol: 'BTCUSDT', buy: 2, sell: 1 } },
    { timestamp: new Date(Date.now() - 2000).toISOString(), level: 'INFO', message: '✅ HEDGE RESTORED: BTCUSDT Sell opened', context: { symbol: 'BTCUSDT', side: 'Sell' } },
    { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'ERROR', message: 'Falha ao obter preço para ETHUSDT para repor posição.', context: { symbol: 'ETHUSDT' } },
    { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'WARNING', message: 'Mudança similar detectada - possível loop de retrabalho.', context: { similarChangeId: 'CHG_1765123633657_8331ea36' } },
    { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'INFO', message: 'Posição LONG DOGEUSDT fechada por Take Profit com PNL de $0.32.', context: { symbol: 'DOGEUSDT', pnl: 0.32 } },
    { timestamp: new Date(Date.now() - 20000).toISOString(), level: 'INFO', message: 'Serviço de Lógica (Fachada) inicializado.' },
  ];
}
