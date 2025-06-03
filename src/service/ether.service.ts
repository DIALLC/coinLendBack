import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { abi, rpcUrl, tokenAddress } from '../constant/ether.constant';

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(
  'f22032b3c70fe83beb5cc761bdd2215485513373b6f6dfc951529a3200120c3c',
  provider,
);

@Injectable()
export class EtherService {
  async getTransaction(hash: string) {
    return provider.getTransaction(hash);
  }

  async getTransactionStatus(
    hash: string,
  ): Promise<'confirmed' | 'failed' | 'pending'> {
    const receipt = await provider.getTransactionReceipt(hash);
    if (!receipt) return 'pending';
    return receipt.status === 1 ? 'confirmed' : 'failed';
  }

  async estimateFee(recipient: string, amount: string): Promise<string> {
    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData('transfer', [
      recipient,
      ethers.parseUnits(amount, 18),
    ]);

    try {
      const gas = await provider.estimateGas({
        to: tokenAddress,
        data,
        from: wallet.address, // ВАЖНО: указывай from
      });
      const price = (await provider.getFeeData()).gasPrice!;
      return ethers.formatEther(gas * price);
    } catch (e) {
      console.error('Ошибка в estimateGas:', e);
      throw new Error('Невозможно рассчитать комиссию: возможно, на hot-wallet нет токенов.');
    }
  }

  async parseCpcAmountFromTx(hash: string): Promise<string> {
    const tx = await provider.getTransaction(hash);
    const iface = new ethers.Interface(abi);
    const decoded = iface.decodeFunctionData('transfer', tx.data);
    const amount = ethers.formatUnits(decoded[1], 18);
    return amount;
  }

  async sendTokens(recipient: string, amount: string): Promise<string> {
    const contract = new ethers.Contract(tokenAddress, abi, wallet);
    const tx = await contract.transfer(
      recipient,
      ethers.parseUnits(amount, 18),
    );
    await tx.wait();
    return tx.hash;
  }
}
