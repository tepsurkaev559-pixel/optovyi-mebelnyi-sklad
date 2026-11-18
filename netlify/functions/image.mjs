import { getStore } from "@netlify/blobs";
export default async req=>{
 const key=new URL(req.url).searchParams.get("key");
 if(!key||!/^[a-f0-9-]{30,40}$/i.test(key))return new Response("Not found",{status:404});
 try{const s=getStore("furniture-images");const [data,meta]=await Promise.all([s.get(key,{type:"arrayBuffer"}),s.getMetadata(key)]);if(!data)return new Response("Not found",{status:404});return new Response(data,{headers:{"Content-Type":meta?.metadata?.contentType||"application/octet-stream","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}})}catch{return new Response("Not found",{status:404})}
};
