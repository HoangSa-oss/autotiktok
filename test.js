import Queue from 'bull';
import cookie from './cookiedefault.json' assert { type: 'json' }
const queueKeyWordApi = new Queue('queueKeyWordApiAuto','redis://127.0.0.1:6379')

cookie.map((x)=>{console.log(x.length)})

console.log(await queueKeyWordApi.count())
