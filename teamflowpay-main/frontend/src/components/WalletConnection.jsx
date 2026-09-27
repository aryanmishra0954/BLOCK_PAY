import React from 'react';
import {useWallet} from '../context/WalletContext';
export default function WalletConnection(){
 const {walletAddress,connectWallet,isConnecting,walletError,balanceKnown}=useWallet();
 return <section className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm space-y-2">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>Polygon Amoy · Test tokens only</strong><p className="text-zinc-400 break-all">{walletAddress||'Connect a wallet to send and receive. Your BlockPay login is separate.'}</p></div><button className="btn-primary px-4 py-2" disabled={isConnecting} onClick={connectWallet}>{isConnecting?'Waiting for wallet…':walletAddress?'Reconnect wallet':'Connect wallet'}</button></div>
 {walletError&&<p role="alert" className="text-amber-300">{walletError}</p>}
 {walletAddress&&!balanceKnown&&<p>Network balance is unavailable. The displayed value is not a verified current balance.</p>}
 <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Get Amoy test POL from a faucet</a><span className="text-zinc-400"> · Test tokens have no monetary value.</span>
 </section>;
}
