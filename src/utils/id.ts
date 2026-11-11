import * as Crypto from 'expo-crypto';

export function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    return `${rand()}-${rand()}-${rand()}-${rand()}`;
  }
}
