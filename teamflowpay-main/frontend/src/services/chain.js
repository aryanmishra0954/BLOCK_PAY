export const AMOY_CHAIN_ID = '0x13882';
export function parsePol(value) {
  const text = String(value);
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(text)) throw new Error('Enter a decimal POL amount with at most 18 decimal places.');
  const [whole, fraction=''] = text.split('.');
  const wei = BigInt(whole)*10n**18n + BigInt(fraction.padEnd(18,'0'));
  if (wei <= 0n) throw new Error('Amount must be greater than zero.');
  return wei;
}
export function validAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}
