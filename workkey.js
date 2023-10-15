import puppeteer from 'puppeteer-extra';
import workkeyfunction from './workkeyfunction.js';
import Queue from 'bull';
import moment from 'moment';
import cookie from './cookiedefault.json' assert { type: 'json' }
import schemaurlpost from './models/schemaurlpost.js';
import delay from 'delay';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
import fs from 'fs/promises'
import winston from 'winston';
import { createLogger, format, transports } from 'winston'
const { combine, timestamp, printf } = format;
const myFormat = printf(({ message,cookie1,cookie2,timestamp }) => {
    return `${timestamp} | ${message} |cookie:${cookie1}| index:${cookie2}`;
  });
  
  const logger = createLogger({
    format: combine(
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
        }),
      myFormat
    ),
    
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'combined.log' }),

    ]
  });
puppeteer.use(StealthPlugin());


const  tiktokProfile = async(cookie)=>{
    const queueKeyWordApi = new Queue('queueKeyWordApiAuto','redis://127.0.0.1:6379')

    process.setMaxListeners(0)
    const sumQueued = 5
    const date = '2023-10-03'
    const dateTimeStamp = moment(date).format('X')
    console.log(dateTimeStamp)
    const browser1 = await puppeteer.launch({
        headless: false,
        // userDataDir: 'C:/Users/Sa/AppData/Local/Google/Chrome/User Data/Profile 11',
    
        args: [
            '--enable-features=NetworkService',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--shm-size=3gb', // this solves the issue
          ],
          ignoreHTTPSErrors: true,
          executablePath:executablePath()
    
    }); 
    let ordinalCookie1 = 0
    queueKeyWordApi.process(async(job,done)=>{
        let arrayData = await workkeyfunction(cookie,job,browser1,ordinalCookie1)
        console.log(arrayData.length)
        logger.info({message:arrayData.length,cookie1:cookie,cookie2:ordinalCookie1})
        if(arrayData.length>200){
            arrayData.map(async(x)=>{
                if(x.date>=dateTimeStamp){
                    const insert = new schemaurlpost({keyword:job.data.keyword,...x})
                    await insert.save()
                } 
            })
        }else{
            logger.info({message:"loi loi",cookie1:cookie,cookie2:ordinalCookie1})
            if(job.data.addQueued<sumQueued){
                queueKeyWordApi.add({keyword:job.data.keyword,addQueued:job.data.addQueued+1})
                ordinalCookie1++
                if(ordinalCookie1==19){
                    ordinalCookie1 = 0
                }
            }
        }
        
        done()
    })
}
for(let i=0;i<10;i++){
    console.log(i)
    tiktokProfile(i)
}



