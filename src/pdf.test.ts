import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { makePdf } from './pdf'
import { defaultShop, type Invoice } from './model'
const stamp='data:image/png;base64,'+readFileSync(new URL('../public/hayati-stamp.png',import.meta.url)).toString('base64')
const invoice:Invoice={id:'test',number:'HYT-20260930-001',date:'2026-09-30',recipient:'KOKARMINA',branch:'Contoh',receiver:'',notes:'CONTOH',items:[{name:'Bolen',quantity:10,price:4300}],shop:defaultShop,createdAt:'2026-09-30T00:00:00Z',updatedAt:'2026-09-30T00:00:00Z'}
it('creates one A4 page for a normal stamped invoice',async()=>{const doc=await makePdf([invoice],stamp);expect(doc.getNumberOfPages()).toBe(1);expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210,0);expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000)})
it('starts every bulk invoice on a separate page',async()=>{const doc=await makePdf([invoice,{...invoice,id:'second',number:'HYT-20260930-002'}],stamp);expect(doc.getNumberOfPages()).toBe(2)})
it('paginates long item lists and notes without losing the next invoice',async()=>{const large={...invoice,items:Array.from({length:100},(_,i)=>({name:'Bolen '+i,quantity:i+1,price:4300})),notes:'Catatan pengiriman. '.repeat(70)};const doc=await makePdf([large,invoice],stamp);expect(doc.getNumberOfPages()).toBeGreaterThan(5)})
it('rejects an empty selection',async()=>{await expect(makePdf([],stamp)).rejects.toThrow('Tidak ada nota')})
