import puppeteer from 'puppeteer-extra';
import domtiktokkey from './dom/domtiktokkey.json' assert { type: 'json' }
import Queue from 'bull';
import moment from 'moment';
import cookie from './cookiedefault.json' assert { type: 'json' }
const queueKeyWordApi = new Queue('queueKeyWordApiAuto','redis://127.0.0.1:6379')
import fs from 'fs/promises'
import delay from 'delay';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
puppeteer.use(StealthPlugin());
import { createLogger, format, transports } from 'winston'
const { combine, timestamp, printf } = format;
const myFormat = printf(({ message,cookie1,cookie2,timestamp }) => {
    console.log(cookie1)
    return `${timestamp} | ${message} | cookie:${cookie2}|  index:${cookie1}`;
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
export default async function workkey (indexCookie,job,browser,ordinalCookie){
    let cookieArray = cookie[indexCookie]
    const page = await browser.newPage()
    await page.setCookie(...cookieArray[ordinalCookie])
    await page.setDefaultTimeout(30000)
    page.setViewport({width: 1440, height: 900});
    var domTiktok = ''
    let arrayData = [] ;
    try {
        // page.on('request', async (request) => {
        //     let a =  await request.url()
        //     console.log(a)
        // })
        await page.goto('https://www.tiktok.com')
        domTiktok = domtiktokkey.english
        await page.waitForSelector('a > span > svg')
        await page.focus(domTiktok.elementSearchBar)
        await delay(3000)
        await page.keyboard.type(job.data.keyword.trim(),{delay: 100})
        await delay(1000)
        await page.keyboard.press('Enter')
        await delay(8000)
        await page.evaluate( () => {
            scrollBy(0, document.body.scrollHeight*100000)
        });  
        const request = await page.waitForRequest((request)=>{
            if(request.url().includes('https://www.tiktok.com/api/search/general/full/')){
                if(request.url().includes('offset=12')){
                    return request
                }
             
            }
        })
        const requestUrl = request.url()
        const indexOfOffset = requestUrl.indexOf('offset')
        const requestFirst = requestUrl.slice(0,indexOfOffset+7)
        const requestEnd = requestUrl.slice(indexOfOffset+9,requestUrl.length+100)
        for(let i=0;i<100;i++){
            let requestFinal =`${requestFirst}${i*12}${requestEnd}` 
            await page.goto(requestFinal, { waitUntil: "networkidle0" })
            const text = await page.$eval("body > pre", (el) => el.textContent);
            const jsonText = JSON.parse(text)
           
            if (jsonText.has_more == 0||jsonText.status_code==2484 ) break;
            const resData = jsonText.data
                .filter((item) => item.type == 1)
                .map((item) => {
                return {
                    date: item.item.createTime,
                    urlPost: `https://www.tiktok.com/@${item.item.author.uniqueId}/video/${item.item.id}`,
                };
            });
            arrayData.push(...resData)
            // resData.map(async (x)=>{
            //     x.date = moment.unix(x.date).format()
            //     if(x.date>=dateTimeStamp){
            //         const insert = new schemaurlpost({keyword:job.data.keyword,...x})
            //         await insert.save()
            //     }
            // })
            
        }
    
    } catch (error) {
  
        logger.info({message:error,cookie1:`${ordinalCookie}`,cookie2:`${indexCookie}`})
        try {
            await page.close()
        } catch (error) {
            console.log(error)
        }   
   
        
    }
   
    // if(arrayData.length>200){
    //     arrayData.map(async(x)=>{
    //         const insert = new schemaurlpost({keyword:job.data.keyword,...x})
    //         await insert.save()
    //     })
    // }else{
    //     ordinalCookie++
    // }
    
    try {
        await page.close()
    } catch (error) {
        console.log(error)
    }    

    return arrayData
   
}
