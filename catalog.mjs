import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
const KEY="catalog-v1", dataStore=()=>getStore("furniture-catalog"), imageStore=()=>getStore("furniture-images");
const seed={categories:[
{id:"sofas",name:"Диваны",description:"Угловые, прямые, раскладные и модульные диваны",image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900"},
{id:"tables-chairs",name:"Столы и стулья",description:"Обеденные столы, стулья и готовые комплекты",image:"https://images.unsplash.com/photo-1617806118233-18e1de247200?w=900"},
{id:"beds",name:"Кровати",description:"Односпальные, двуспальные и детские кровати",image:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900"},
{id:"wardrobes",name:"Шкафы",description:"Шкафы-купе и распашные шкафы",image:"https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=900"}],
products:[
{id:"demo-sofa",categoryId:"sofas",name:"Угловой диван «Комфорт»",description:"Пример товара. Добавьте свои реальные товары через панель владельца.",images:["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1100"]},
{id:"demo-table",categoryId:"tables-chairs",name:"Обеденный стол с комплектом стульев",description:"Пример товара. Добавьте свои реальные товары через панель владельца.",images:["https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1100"]},
{id:"demo-bed",categoryId:"beds",name:"Двуспальная кровать",description:"Пример товара. Добавьте свои реальные товары через панель владельца.",images:["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1100"]},
{id:"demo-wardrobe",categoryId:"wardrobes",name:"Шкаф с распашными дверями",description:"Пример товара. Добавьте свои реальные товары через панель владельца.",images:["https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1100"]}]};
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function adminUser(){const u=await getUser();if(!u)return {response:reply({error:"Требуется вход администратора."},401)};if(!Array.isArray(u.roles)||!u.roles.includes("admin"))return {response:reply({error:"У пользователя нет роли admin."},403)};return {user:u}}
async function readCatalog(){return await dataStore().get(KEY,{type:"json"})||seed}
export default async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204});
 if(req.method==="GET"){try{return reply(await readCatalog())}catch(e){console.error(e);return reply({error:"Ошибка чтения каталога."},500)}}
 if(req.method!=="POST")return reply({error:"Метод не поддерживается."},405);
 const auth=await adminUser();if(auth.response)return auth.response;
 try{
  const ct=req.headers.get("content-type")||"";let action,p;
  if(ct.includes("multipart/form-data")){const f=await req.formData();action=String(f.get("action")||"");p={categoryId:String(f.get("categoryId")||""),name:String(f.get("name")||"").trim(),description:String(f.get("description")||"").trim(),images:f.getAll("images").filter(x=>x&&typeof x.arrayBuffer==="function")}}
  else{p=await req.json();action=p.action}
  if(action==="check")return reply({ok:true,email:auth.user.email});
  if(action!=="addProduct")return reply({error:"Неизвестное действие."},400);
  if(!p.name||p.name.length>120)return reply({error:"Укажите название товара (до 120 символов)."},400);
  if(p.description.length>5000)return reply({error:"Описание слишком длинное."},400);
  if(!p.images.length||p.images.length>8)return reply({error:"Добавьте от 1 до 8 фотографий."},400);
  const cat=await readCatalog();if(!cat.categories.some(c=>c.id===p.categoryId))return reply({error:"Выберите категорию."},400);
  const urls=[],store=imageStore();
  for(const file of p.images){if(!file.type?.startsWith("image/"))return reply({error:"Разрешены только изображения."},400);if(file.size>8*1024*1024)return reply({error:"Каждая фотография должна быть меньше 8 МБ."},400);const key=crypto.randomUUID();await store.set(key,file,{metadata:{contentType:file.type}});urls.push(`/.netlify/functions/image?key=${encodeURIComponent(key)}`)}
  cat.products.unshift({id:crypto.randomUUID(),categoryId:p.categoryId,name:p.name,description:p.description,images:urls,createdAt:new Date().toISOString()});
  await dataStore().setJSON(KEY,cat);return reply({ok:true});
 }catch(e){console.error(e);return reply({error:"Ошибка сохранения. Попробуйте ещё раз."},500)}
};
