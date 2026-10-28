// Generates a login account only. Does not read or modify provider API keys.
import {randomBytes} from 'node:crypto';
import {writeFile,chmod} from 'node:fs/promises';
import {makeAuthConfig} from '../../server/auth.mjs';
const [destination,username,origin='']=process.argv.slice(2);
if(!destination||!username)throw new Error('Usage: node create-account.mjs <destination> <username> [https-origin]');
const password=randomBytes(24).toString('base64url');
const config=await makeAuthConfig(username,password,origin);
await writeFile(destination,JSON.stringify(config)+'\n',{mode:0o600,flag:'wx'});
await chmod(destination,0o600);
// Run only in a trusted terminal. Save the generated login password securely; never print API keys here.
console.log(JSON.stringify({username,password}));
