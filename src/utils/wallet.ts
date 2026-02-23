import { ethers } from 'ethers';
import { NETWORK } from './constants';

declare global {
  interface Window { ethereum?: any; }
}

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export async function connectWallet(): Promise<{
  address: string;
  signer: ethers.Signer;
  provider: ethers.BrowserProvider;
  chainId: number;
}> {
  if (!isWalletAvailable()) {
    throw new Error('No wallet detected. Please install MetaMask or a compatible wallet.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);

  // Attempt to switch to 0G network
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK.chainIdHex }],
    });
  } catch (switchErr: any) {
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: NETWORK.chainIdHex,
          chainName: NETWORK.name,
          nativeCurrency: { name: '0G', symbol: NETWORK.symbol, decimals: NETWORK.decimals },
          rpcUrls: [NETWORK.rpcUrl],
          blockExplorerUrls: [NETWORK.blockExplorer],
        }],
      });
    }
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return { address, signer, provider, chainId: Number(network.chainId) };
}

export async function getConnectedAddress(): Promise<string | null> {
  if (!isWalletAvailable()) return null;
  try {
    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch {
    return null;
  }
}

export function onAccountsChanged(cb: (accts: string[]) => void): () => void {
  if (!isWalletAvailable()) return () => {};
  window.ethereum.on('accountsChanged', cb);
  return () => window.ethereum.removeListener('accountsChanged', cb);
}

export function onChainChanged(cb: (chainId: string) => void): () => void {
  if (!isWalletAvailable()) return () => {};
  window.ethereum.on('chainChanged', cb);
  return () => window.ethereum.removeListener('chainChanged', cb);
}

export function shortAddr(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
