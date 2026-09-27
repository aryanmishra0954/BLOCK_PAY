import React,{useState,useEffect,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useWallet} from '../../context/WalletContext';
import {BlockPayAPI} from '../../services/api';
import {parsePol,validAddress} from '../../services/chain';
export default function ChainSendForm({onSubmitTransaction,onRecipientChange,onPolEquivalentChange}){
 const [query]=useSearchParams();
 const {walletAddress}=useWallet();
 const [to,setTo]=useState(query.get('to')||''),[amount,setAmount]=useState(query.get('currency')&&query.get('currency')!=='POL'?'':query.get('amount')||'');
 const [contacts,setContacts]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 useEffect(()=>{BlockPayAPI.contacts.getAll().then(r=>setContacts(r.contacts||[])).catch(()=>setError('Could not load contacts. You can enter a recipient address.'));},[]);
 useEffect(()=>{onRecipientChange?.(to);},[to,onRecipientChange]);
 useEffect(()=>{onPolEquivalentChange?.(Number(amount)||0);},[amount,onPolEquivalentChange]);
 const submit=async(e)=>{e.preventDefault();if(lock.current)return;setError('');
  try{if(!validAddress(to.trim()))throw Error('Enter a valid nonzero EVM address.');parsePol(amount);
   lock.current=true;setBusy(true);await onSubmitTransaction({to:to.trim(),amount,currency:'POL',mode:'on_chain'});setAmount('');
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 };
 return <form onSubmit={submit} className="card-base p-6 space-y-5">
 <h2 className="font-bold text-lg">Send Amoy test POL</h2>
 <p className="text-sm text-zinc-400">Your wallet approves the transfer and network fee. Confirmation is verified independently by BlockPay.</p>
 {error&&<p role="alert" className="text-rose-400">{error}</p>}
 <label className="block">Saved recipient<select aria-label="Saved recipient" className="block w-full bg-zinc-950 border border-zinc-700 rounded p-3 mt-2" value="" onChange={e=>setTo(e.target.value)}><option value="">Choose a contact or enter an address</option>{contacts.map(c=><option key={c.id} value={c.address}>{c.name} — {c.address}</option>)}</select></label>
 <label className="block">Recipient address<input required aria-label="Recipient address" className="block w-full bg-zinc-950 border border-zinc-700 rounded p-3 mt-2" value={to} onChange={e=>setTo(e.target.value)} placeholder="0x…" disabled={busy}/></label>
 <label className="block">Amount (test POL)<input required aria-label="Amount (test POL)" inputMode="decimal" className="block w-full bg-zinc-950 border border-zinc-700 rounded p-3 mt-2" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.01" disabled={busy}/></label>
 <p className="text-xs text-zinc-400">Leave test POL for gas. The actual network fee is shown by your wallet; BlockPay does not invent a fixed fee.</p>
 <button className="btn-primary w-full p-3" disabled={busy||!walletAddress}>{busy?'Approve in wallet, then checking submission…':'Review and approve in wallet'}</button>
 </form>;
}
