import { Controller, Get } from '@nestjs/common';
import { BinanceService } from './binance.service';

@Controller('api/binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}

  @Get('balance')
  async getBalances() {
    const balances = await this.binanceService.getAccountBalances();
    const usdt = balances.find((b) => b.asset === 'USDT');
    const usdc = balances.find((b) => b.asset === 'USDC');
    const btc = balances.find((b) => b.asset === 'BTC');

    const totalUsdtEquivalent = balances.reduce((acc, curr) => {
      if (curr.asset === 'USDT' || curr.asset === 'USDC') {
        return acc + parseFloat(curr.balance);
      }
      return acc;
    }, 0);

    return {
      environment:
        process.env.BINANCE_TESTNET === 'true' ? 'TESTNET' : 'PRODUCTION',
      totalUsdtEquivalent,
      usdtBalance: usdt ? parseFloat(usdt.balance) : 0,
      usdtAvailable: usdt ? parseFloat(usdt.availableBalance) : 0,
      usdcBalance: usdc ? parseFloat(usdc.balance) : 0,
      btcBalance: btc ? parseFloat(btc.balance) : 0,
      assets: balances,
    };
  }

  @Get('top-pairs')
  async getTopPairs() {
    return this.binanceService.getTopVolumePairs(50);
  }
}
