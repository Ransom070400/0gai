import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  connectWallet,
  getConnectedAddress,
  onAccountsChanged,
  onChainChanged,
  isWalletAvailable,
} from '../utils/wallet';
import { NETWORK } from '../utils/constants';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === NETWORK.chainId;

  // Auto-detect existing connection
  useEffect(() => {
    (async () => {
      const addr = await getConnectedAddress();
      if (addr) {
        try {
          const result = await connectWallet();
          setAddress(result.address);
          setSigner(result.signer as ethers.Signer);
          setProvider(result.provider);
          setChainId(result.chainId);
        } catch {}
      }
    })();
  }, []);

  // Listen for changes
  useEffect(() => {
    const u1 = onAccountsChanged((accts) => {
      if (accts.length === 0) {
        setAddress(null);
        setSigner(null);
        setProvider(null);
        setChainId(null);
      } else {
        connect();
      }
    });
    const u2 = onChainChanged(() => connect());
    return () => { u1(); u2(); };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await connectWallet();
      setAddress(result.address);
      setSigner(result.signer as ethers.Signer);
      setProvider(result.provider);
      setChainId(result.chainId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
  }, []);

  return {
    address,
    signer,
    provider,
    chainId,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    error,
    walletAvailable: isWalletAvailable(),
    connect,
    disconnect,
  };
}
