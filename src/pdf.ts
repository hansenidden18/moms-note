import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dateLabel, invoiceTotal, lineTotal, rupiah, type Invoice } from './model'

export const stampUrl=import.meta.env.BASE_URL+'hayati-stamp.png'
const money=(n:number)=>rupiah(n).replace(/\s/g,' ')
let stampPromise:Promise<string>|undefined
export function defaultStampData():Promise<string>{
 return stampPromise??=fetch(stampUrl).then(r=>{if(!r.ok)throw new Error('Stempel belum berhasil dimuat. Hubungkan internet lalu buka aplikasi sekali lagi.');return r.blob()}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)}))
}
export async function makePdf(invoices:Invoice[]){
 if(!invoices.length)throw new Error('Tidak ada nota yang dipilih.')
 const fallback=await defaultStampData()
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true})
 doc.setProperties({title:invoices.length===1?invoices[0].number:'Nota Hayati - '+invoices.length+' Nota',author:invoices[0].shop.name,subject:'Nota Penitipan Barang'})
 for(let index=0;index<invoices.length;index++){
  const invoice=invoices[index];if(index)doc.addPage()
  doc.setTextColor(25,30,27);doc.setFont('times','bold');doc.setFontSize(24)
  const brandLines=doc.splitTextToSize(invoice.shop.name,106);doc.text(brandLines,16,22)
  doc.setFont('helvetica','normal');doc.setFontSize(10)
  const address=doc.splitTextToSize(invoice.shop.address,103);let y=24+brandLines.length*9
  if(address.length){doc.text(address,16,y);y+=address.length*4.6}doc.text('HP. '+invoice.shop.phone,16,y+1)
  doc.setFontSize(10);doc.text(doc.splitTextToSize(`${invoice.shop.city}, ${dateLabel(invoice.date)}`,68),194,20,{align:'right'})
  doc.setFontSize(9);doc.text(invoice.number,194,32,{align:'right'})
  let tableY=Math.max(63,y+16)
  doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('NOTA PENITIPAN BARANG',16,tableY)
  doc.setFont('helvetica','normal');doc.setFontSize(10);tableY+=8
  const recipient=doc.splitTextToSize('Untuk: '+invoice.recipient+(invoice.branch?' - '+invoice.branch:''),178);doc.text(recipient,16,tableY);tableY+=recipient.length*4.8+5
  const body=invoice.items.map(item=>[String(item.quantity),item.name,money(item.price),money(lineTotal(item))])
  while(body.length<10)body.push(['','','',''])
  autoTable(doc,{startY:tableY,head:[['Banyaknya','Nama Barang','Harga @','Jumlah']],body,theme:'grid',margin:{left:16,right:16,top:21,bottom:72},styles:{font:'helvetica',fontSize:10,cellPadding:3,lineColor:[80,90,83],lineWidth:0.2,textColor:[25,30,27],minCellHeight:9,overflow:'linebreak'},headStyles:{fillColor:[235,238,233],textColor:[25,30,27],fontStyle:'bold',lineWidth:0.2},columnStyles:{0:{cellWidth:24,halign:'center'},1:{cellWidth:82},2:{cellWidth:34,halign:'right'},3:{cellWidth:38,halign:'right'}},rowPageBreak:'avoid',didDrawPage:()=>{if(doc.getCurrentPageInfo().pageNumber>1){doc.setFontSize(8);doc.text(invoice.number+' | '+dateLabel(invoice.date),16,12)}}})
  let bottom=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Jumlah: '+money(invoiceTotal(invoice)),194,bottom,{align:'right'});bottom+=8
  if(invoice.notes){const lines=doc.splitTextToSize('Catatan: '+invoice.notes,178);doc.setFont('helvetica','normal');doc.setFontSize(9);for(const line of lines){if(bottom>235){doc.addPage();bottom=22}doc.text(line,16,bottom);bottom+=4.5}bottom+=5}
  if(bottom>235){doc.addPage();bottom=22}
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Tanda Terima',48,bottom,{align:'center'});doc.text('Hormat Kami',159,bottom,{align:'center'})
  doc.addImage(invoice.shop.stamp||fallback,'PNG',133,bottom+5,52,22)
  doc.setDrawColor(85);doc.line(20,bottom+32,78,bottom+32);doc.line(126,bottom+32,192,bottom+32)
  doc.setFontSize(9);doc.text(doc.splitTextToSize(invoice.receiver||'Nama penerima: ................................',62),48,bottom+38,{align:'center'});doc.text(doc.splitTextToSize(invoice.shop.supplier||'Nama supplier: ................................',66),159,bottom+38,{align:'center'})
  doc.setFontSize(8);doc.setTextColor(100);doc.text('Mohon ditandatangani kedua pihak setelah dicetak.',105,286,{align:'center'})
 }
 return doc
}
export function saveBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
