"use client";

import { BrowserProvider, type ContractTransactionResponse } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { botNetwork, contractAbis, contractAddresses } from "./chain";

type WalletContextValue = {
  address: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  transact: (name: keyof typeof contractAddresses, method: string, args: unknown[]) => Promise<ContractTransactionResponse>;
  transactAt: (address: string, abi: string[], method: string, args: unknown[]) => Promise<ContractTransactionResponse>;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const WalletContext = createContext<WalletContextValue | null>(null);

function getEthereum(): EthereumProvider {
  if (!window.ethereum) throw new Error("MetaMask was not found. Install the MetaMask browser extension and try again.");
  return window.ethereum;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncWallet = useCallback(async () => {
    if (!window.ethereum) return;
    const nextProvider = new BrowserProvider(window.ethereum);
    const accounts = await nextProvider.send("eth_accounts", []) as string[];
    const network = await nextProvider.getNetwork();
    setProvider(nextProvider);
    setAddress(accounts[0] ?? null);
    setChainId(Number(network.chainId));
  }, []);

  useEffect(() => {
    // Keep the wallet display synchronized with the browser provider and its account/network events.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncWallet().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not read the wallet network."));
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;
    const onAccountsChanged = () => { void syncWallet(); };
    const onChainChanged = () => { void syncWallet(); };
    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);
  }, [syncWallet]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const ethereum = getEthereum();
      const nextProvider = new BrowserProvider(ethereum);
      const accounts = await nextProvider.send("eth_requestAccounts", []) as string[];
      if (!accounts[0]) throw new Error("MetaMask returned no account.");
      const network = await nextProvider.getNetwork();
      setProvider(nextProvider);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Wallet connection failed.";
      setError(message);
      throw cause;
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      const ethereum = getEthereum();
      const chainIdHex = `0x${botNetwork.chainId.toString(16)}`;
      try {
        await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
      } catch (cause) {
        const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
        if (code !== 4902) throw cause;
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: botNetwork.chainName,
            rpcUrls: [botNetwork.rpcUrl],
            nativeCurrency: botNetwork.nativeCurrency,
            blockExplorerUrls: [botNetwork.explorerUrl],
          }],
        });
      }
      await syncWallet();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not switch to BOT Chain.";
      setError(message);
      throw cause;
    }
  }, [syncWallet]);

  const transactAt = useCallback(async (
    contractAddress: string,
    abi: string[],
    method: string,
    args: unknown[],
  ): Promise<ContractTransactionResponse> => {
    if (!provider || !address) throw new Error("Connect your wallet before sending a transaction.");
    if (chainId !== botNetwork.chainId) throw new Error(`Switch MetaMask to ${botNetwork.chainName} before continuing.`);
    if (!contractAddress) throw new Error("Contract address is required.");
    const signer = await provider.getSigner();
    const { Contract } = await import("ethers");
    const contract = new Contract(contractAddress, abi, signer);
    return contract.getFunction(method)(...args) as Promise<ContractTransactionResponse>;
  }, [address, chainId, provider]);

  const transact = useCallback(async (
    name: keyof typeof contractAddresses,
    method: string,
    args: unknown[],
  ): Promise<ContractTransactionResponse> => {
    if (!provider || !address) throw new Error("Connect your wallet before sending a transaction.");
    if (chainId !== botNetwork.chainId) throw new Error(`Switch MetaMask to ${botNetwork.chainName} before continuing.`);
    const contractAddress = contractAddresses[name];
    if (!contractAddress) throw new Error(`${name} contract address is not configured.`);
    return transactAt(contractAddress, contractAbis[name], method, args);
  }, [address, chainId, provider, transactAt]);

  const value = useMemo(() => ({ address, chainId, provider, error, connect, switchNetwork, transact, transactAt }), [
    address, chainId, provider, error, connect, switchNetwork, transact, transactAt,
  ]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider.");
  return context;
}
