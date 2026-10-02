import React,{createContext,useContext,useState,useEffect,useRef,useCallback} from 'react';
import {BlockPayAPI as api} from '../services/api';
import {useAuth} from './AuthContext';
import {AMOY_CHAIN_ID,parsePol,validAddress} from '../services/chain';
const Context=createContext(null);
export function WalletProvider({children}){
 const {user}=useAuth();
 const [balance,setBalance]=useState(0),[walletAddress,setAddress]=useState(''),[balanceKnown,setKnown]=useState(false);
 const [walletError,setError]=useState(''),[isRefreshing,setRefreshing]=useState(false),[isConnecting,setConnecting]=useState(false);
 const [lastTransfer,setLast]=useState(null);
 const sending=useRef(false),identity=useRef(user?.id);identity.current=user?.id;
 const refreshBalance=useCallback(async()=>{
  if(!user)return;const owner=user.id;setRefreshing(true);
  try{const r=await api.chain.wallet();if(identity.current!==owner)return;setAddress(r.address||'');setBalance(Number(r.balance||0));setKnown(r.balance!==null);setError('');}
  catch(e){if(identity.current===owner){setKnown(false);setError(e.message);}}
  finally{if(identity.current===owner)setRefreshing(false);}
 },[user?.id]);
 useEffect(()=>{setAddress('');setBalance(0);setKnown(false);setError('');setLast(null);if(!user)return;refreshBalance();const t=setInterval(refreshBalance,15000);return()=>clearInterval(t);},[user?.id,refreshBalance]);
 const ensureAmoy=async()=>{
  const p=window.ethereum;if(!p)throw Error('Open BlockPay in a browser with MetaMask or another EVM wallet.');
  if(await p.request({method:'eth_chainId'})!==AMOY_CHAIN_ID){
   try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:AMOY_CHAIN_ID}]});}
   catch(e){if(e.code!==4902)throw e;await p.request({method:'wallet_addEthereumChain',params:[{chainId:AMOY_CHAIN_ID,chainName:'Polygon Amoy Testnet',nativeCurrency:{name:'POL',symbol:'POL',decimals:18},rpcUrls:['https://polygon-amoy.drpc.org'],blockExplorerUrls:['https://amoy.polygonscan.com']}]});}
  }
  if(await p.request({method:'eth_chainId'})!==AMOY_CHAIN_ID)throw Error('Select Polygon Amoy. Mainnet payments are disabled.');
  return p;
 };
 const connectWallet=async()=>{
  if(!user)return;setConnecting(true);setError('');
  try{const owner=user.id,p=await ensureAmoy(),accounts=await p.request({method:'eth_requestAccounts'});
   if(!accounts?.[0])throw Error('Select a wallet account.');
   const c=await api.chain.challenge(accounts[0]);
   const hex='0x'+Array.from(new TextEncoder().encode(c.message),b=>b.toString(16).padStart(2,'0')).join('');
   const signature=await p.request({method:'personal_sign',params:[hex,accounts[0]]});
   if(identity.current!==owner)throw Error('BlockPay account changed; reconnect.');
   await api.chain.connect(signature);await refreshBalance();
  }catch(e){setError(e.message||'Wallet connection rejected.');}finally{setConnecting(false);}
 };
 const sendTransaction=async({to,amount,currency='POL'})=>{
  if(sending.current)throw Error('A wallet request is already in progress.');
  if(!user||!walletAddress)throw Error('Connect and verify a wallet first.');
  if(currency!=='POL')throw Error('Only Amoy test POL is supported.');
  if(!validAddress(to)||to.toLowerCase()===walletAddress.toLowerCase())throw Error('Choose a valid recipient other than yourself.');
  const wei=parsePol(amount);sending.current=true;let hash;
  try{const owner=user.id,p=await ensureAmoy(),accounts=await p.request({method:'eth_accounts'});
   if(accounts?.[0]?.toLowerCase()!==walletAddress.toLowerCase())throw Error('Active wallet differs from your verified wallet. Reconnect it.');
   const price = BigInt(await p.request({method: 'eth_gasPrice'}));
   const minTip = 30000000000n; // 30 Gwei (Polygon Amoy requires >= 25 Gwei)
   const basePrice = price > minTip ? price : minTip;
   const maxFee = basePrice + minTip;
   const tx = {
    from: accounts[0],
    to,
    value: '0x' + wei.toString(16),
    maxPriorityFeePerGas: '0x' + minTip.toString(16),
    maxFeePerGas: '0x' + maxFee.toString(16),
   };
   const gas = BigInt(await p.request({method: 'eth_estimateGas', params: [{from: accounts[0], to, value: '0x' + wei.toString(16)}]}));
   const available = BigInt(await p.request({method: 'eth_getBalance', params: [accounts[0], 'latest']}));
   if (available < wei + gas * maxFee) throw Error('Insufficient test POL in your wallet for the amount plus network fee (Polygon requires >= 25 Gwei gas tip).');
   if (identity.current !== owner) throw Error('BlockPay account changed. Start again.');
   hash = await p.request({method: 'eth_sendTransaction', params: [tx]});
   const payment={hash,amount:String(amount),currency:'POL',to,isOnChain:true,status:'pending'};setLast(payment);
   const key=`amoy-pending:${owner}`,pending=JSON.parse(localStorage.getItem(key)||'[]');
   localStorage.setItem(key,JSON.stringify([...new Set([...pending,hash])]));
   try{const r=await api.chain.record(hash);payment.status=r.transaction.status;localStorage.setItem(key,JSON.stringify(pending.filter(h=>h!==hash)));}
   catch{payment.warning='Submitted. Verification is pending; do not resend. Refresh History or import this hash.';}
   setLast({...payment});await refreshBalance();return payment;
  }catch(e){if(hash){const result={hash,amount:String(amount),currency:'POL',to,isOnChain:true,status:'pending',warning:'Submitted. Keep this hash and check History; do not resend.'};setLast(result);return result;}throw Error(e.code===4001?'Wallet request rejected. No payment submitted.':e.message);}
  finally{sending.current=false;}
 };
 useEffect(()=>{
  if(!user||!walletAddress)return;const key=`amoy-pending:${user.id}`;
  const recover=async()=>{for(const hash of JSON.parse(localStorage.getItem(key)||'[]')){try{await api.chain.record(hash);const current=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify(current.filter(h=>h!==hash)));}catch{}}};
  recover();const t=setInterval(recover,15000);return()=>clearInterval(t);
 },[user?.id,walletAddress]);
 const claimTestFunds=async()=>{throw Error('Simulated funding is retired. Use the Amoy faucet link for test tokens.');};
 return <Context.Provider value={{balance,walletAddress,balanceKnown,walletError,isRefreshing,isConnecting,connectWallet,refreshBalance,sendTransaction,sendOnChainTransaction:sendTransaction,claimTestFunds,lastTransfer,hasMetaMask:Boolean(window.ethereum)}}>{children}</Context.Provider>;
}
export function useWallet(){return useContext(Context);}
