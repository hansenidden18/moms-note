import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { saveBlob } from './pdf'
export const native=Capacitor.isNativePlatform()
const Printer=registerPlugin<{print(options:{base64:string;name:string}):Promise<void>}>('InvoicePrinter')
async function base64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob)})}
export async function exportFile(blob:Blob,filename:string){if(!native){saveBlob(blob,filename);return}const result=await Filesystem.writeFile({path:'exports/'+filename,data:await base64(blob),directory:Directory.Cache,recursive:true});await Share.share({title:filename,url:result.uri,dialogTitle:'Simpan atau bagikan file Hayati'})}
export async function printNativePdf(blob:Blob){await Printer.print({base64:await base64(blob),name:'Nota Hayati'})}
