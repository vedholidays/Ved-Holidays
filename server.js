const express=require('express'),cookieParser=require('cookie-parser'),jwt=require('jsonwebtoken'),fs=require('fs'),path=require('path');
const {Pool}=require('pg');
const app=express(),PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||'CHANGE_THIS_SECRET',ADMIN_USER=process.env.ADMIN_USER||'admin',ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'ChangeMe123!';
const DB=path.join(__dirname,'data/db.json');
const usePostgres=!!process.env.DATABASE_URL;
const pool=usePostgres?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}}):null;
const loadJson=()=>JSON.parse(fs.readFileSync(DB,'utf8'));
const saveJson=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const nid=a=>a.length?Math.max(...a.map(x=>Number(x.id)||0))+1:1;
app.use(express.json({limit:'3mb'}));app.use(express.urlencoded({extended:true}));app.use(cookieParser());app.use(express.static(path.join(__dirname,'public')));
function auth(req,res,next){try{req.admin=jwt.verify(req.cookies.vh_admin,SECRET);next()}catch(e){res.status(401).json({error:'Unauthorized'})}}
const STARTER_DESTINATIONS=[
{id:1,slug:'thailand',name:'Thailand',flag:'🇹🇭',status:'active',description:'Exclusive Thailand holidays, island escapes, city tours and customized experiences.',image:'/thailand-hero.png'},
{id:2,slug:'dubai',name:'Dubai',flag:'🇦🇪',status:'coming-soon',description:'Premium Dubai holidays, luxury stays, city experiences and customized journeys.',image:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85'},
{id:3,slug:'singapore',name:'Singapore',flag:'🇸🇬',status:'coming-soon',description:'City, family and premium Singapore holidays coming soon.',image:'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85'},
{id:4,slug:'malaysia',name:'Malaysia',flag:'🇲🇾',status:'coming-soon',description:'Kuala Lumpur, Langkawi and more coming soon.',image:'https://images.unsplash.com/photo-1508062878650-88b52897f298?auto=format&fit=crop&w=1400&q=85'},
{id:5,slug:'bali',name:'Bali',flag:'🇮🇩',status:'coming-soon',description:'Island escapes, villas, wellness and romantic Bali journeys.',image:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85'},
{id:6,slug:'vietnam',name:'Vietnam',flag:'🇻🇳',status:'coming-soon',description:'Hanoi, Halong Bay, Da Nang and curated Vietnam experiences.',image:'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1400&q=85'},
{id:7,slug:'japan',name:'Japan',flag:'🇯🇵',status:'coming-soon',description:'Tokyo, Kyoto, Osaka and seasonal Japan journeys.',image:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1400&q=85'},
{id:8,slug:'south-korea',name:'South Korea',flag:'🇰🇷',status:'coming-soon',description:'Seoul, Busan and modern Korean culture experiences.',image:'https://images.unsplash.com/photo-1538485399081-7c8972d4c5b4?auto=format&fit=crop&w=1400&q=85'},
{id:9,slug:'sri-lanka',name:'Sri Lanka',flag:'🇱🇰',status:'coming-soon',description:'Beaches, tea country, wildlife and private Sri Lanka tours.',image:'https://images.unsplash.com/photo-1586613838931-1c6b2e5d6e0c?auto=format&fit=crop&w=1400&q=85'},
{id:10,slug:'nepal',name:'Nepal',flag:'🇳🇵',status:'coming-soon',description:'Kathmandu, Pokhara and Himalayan experiences.',image:'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85'},
{id:11,slug:'maldives',name:'Maldives',flag:'🇲🇻',status:'coming-soon',description:'Private island stays, luxury resorts and romantic escapes.',image:'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1400&q=85'}
];
const DEMO_REVIEWS=[
{id:9001,createdAt:'2026-09-01T10:00:00.000Z',name:'Aarav & Family',country:'Thailand',package:'Thailand Family Escape',rating:5,text:'Everything was thoughtfully planned and the family had a wonderful time. The hotel and transfers were exactly as promised.',photo:'',verified:true,published:true,status:'approved',demo:true},
{id:9002,createdAt:'2026-09-02T10:00:00.000Z',name:'Riya Mehta',country:'Thailand',package:'Phuket & Krabi Escape',rating:5,text:'A smooth and beautifully planned holiday. Ved Holidays made the whole trip feel effortless from start to finish.',photo:'',verified:true,published:true,status:'approved',demo:true},
{id:9003,createdAt:'2026-09-03T10:00:00.000Z',name:'Kunal Shah',country:'Thailand',package:'Bangkok & Pattaya',rating:4,text:'Great support and a very comfortable itinerary. We especially liked having the day-wise plan and hotel details before travelling.',photo:'',verified:true,published:true,status:'approved',demo:true}
];
async function ensureStarterContent(){let d=await getData();d.settings=d.settings||{};if(!d.settings.starterDestinationsSeeded){const existing=new Set(d.countries.map(x=>x.slug));for(const c of STARTER_DESTINATIONS)if(!existing.has(c.slug))d.countries.push({...c,id:nid(d.countries)});d.settings.starterDestinationsSeeded=true;}if(!d.settings.demoTestimonialsSeeded){if(!d.reviews.length)d.reviews.push(...DEMO_REVIEWS);d.settings.demoTestimonialsSeeded=true;}if(d.settings.partnerVisible===undefined){d.settings.partnerVisible=false;d.settings.partnerName='';d.settings.partnerLogo='';}if(!d.settings.heroTitle)d.settings.heroTitle='Welcome to the World\\nof\\nVed Holidays';if(!d.settings.heroSub)d.settings.heroSub='Chalo Duniya Ghum Aaye';await setData(d);}
async function initDb(){if(!usePostgres)return;await pool.query(`CREATE TABLE IF NOT EXISTS vh_data (key text PRIMARY KEY, value jsonb NOT NULL)`);const r=await pool.query('SELECT key FROM vh_data');if(r.rowCount===0){const d=loadJson();for(const key of ['countries','packages','bookings','enquiries','reviews','settings'])await pool.query('INSERT INTO vh_data(key,value) VALUES($1,$2)',[key,JSON.stringify(d[key]||[])]);console.log('PostgreSQL initialized from data/db.json')}}
async function getData(){if(!usePostgres)return loadJson();const r=await pool.query('SELECT key,value FROM vh_data');const d={countries:[],packages:[],bookings:[],enquiries:[],reviews:[],settings:{heroTitle:'Welcome to the World\nof\nVed Holidays',heroSub:'Chalo Duniya Ghum Aaye',paymentVisible:false}};for(const x of r.rows)d[x.key]=x.value;return d}
async function setData(d){if(!usePostgres){saveJson(d);return}for(const key of ['countries','packages','bookings','enquiries','reviews','settings'])await pool.query('INSERT INTO vh_data(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,JSON.stringify(d[key]||[])]);}
app.get('/api/health',async(q,s)=>{try{if(usePostgres)await pool.query('SELECT 1');s.json({ok:true,database:usePostgres?'postgresql':'json'})}catch(e){s.status(500).json({ok:false,error:e.message})}});
app.get('/api/countries',async(q,s)=>s.json((await getData()).countries));
app.get('/api/countries/:slug',async(q,s)=>{let d=await getData(),c=d.countries.find(x=>x.slug===q.params.slug);if(!c)return s.status(404).json({error:'Country not found'});s.json({...c,packages:d.packages.filter(p=>p.country===c.slug&&p.active)})});
app.get('/api/reviews',async(q,s)=>s.json((await getData()).reviews.filter(x=>x.published!==false&&x.verified!==false)));
app.post('/api/reviews',async(q,s)=>{
  let name=String(q.body.name||'').trim(),country=String(q.body.country||'Thailand').trim(),packageName=String(q.body.package||'').trim(),text=String(q.body.text||'').trim(),rating=Math.max(1,Math.min(5,Number(q.body.rating)||5)),photo=String(q.body.photo||'').trim();
  if(!name||!text)return s.status(400).json({ok:false,error:'Name and review are required.'});
  if(text.length>1000)return s.status(400).json({ok:false,error:'Review is too long.'});
  if(photo && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo))return s.status(400).json({ok:false,error:'Please upload a valid JPG, PNG or WEBP image.'});
  if(photo && Buffer.from(photo.split(',')[1],'base64').length>1200*1024)return s.status(400).json({ok:false,error:'Please choose a smaller photo (max 1.2 MB after upload).'});
  let d=await getData(),x={id:nid(d.reviews),createdAt:new Date().toISOString(),name,country,package:packageName,rating,text,photo,verified:false,published:false,status:'pending'};
  d.reviews.push(x);await setData(d);s.json({ok:true,message:'Thank you! Your review has been submitted and will appear after approval.'});
});
app.post('/api/enquiries',async(q,s)=>{let d=await getData(),x={id:nid(d.enquiries),createdAt:new Date().toISOString(),status:'new',...q.body};d.enquiries.push(x);await setData(d);s.json({ok:true,id:x.id})});
app.post('/api/bookings',async(q,s)=>{let d=await getData(),x={id:nid(d.bookings),createdAt:new Date().toISOString(),status:'pending',...q.body};x.bookingId='VH'+String(x.id).padStart(5,'0');d.bookings.push(x);await setData(d);s.json({ok:true,bookingId:x.bookingId})});
app.post('/api/bookings/track',async(q,s)=>{let d=await getData(),id=String(q.body.bookingId||'').trim().toUpperCase(),phone=String(q.body.phone||'').replace(/\D/g,'');let b=d.bookings.find(x=>String(x.bookingId||('VH'+String(x.id).padStart(5,'0'))).toUpperCase()===id && String(x.phone||'').replace(/\D/g,'')===phone);if(!b)return s.status(404).json({ok:false,error:'Booking not found. Please check your Booking ID and mobile number.'});s.json({ok:true,booking:{bookingId:b.bookingId||('VH'+String(b.id).padStart(5,'0')),status:b.status,country:b.country,date:b.date,confirmedAt:b.confirmedAt||null,confirmationNote:b.confirmationNote||''}})});
app.get('/api/admin/reviews',auth,async(q,s)=>s.json((await getData()).reviews.slice().reverse()));
app.post('/api/admin/reviews',auth,async(q,s)=>{let d=await getData(),x={id:nid(d.reviews),createdAt:new Date().toISOString(),verified:true,published:true,...q.body};d.reviews.push(x);await setData(d);s.json(x)});
app.put('/api/admin/reviews/:id',auth,async(q,s)=>{let d=await getData(),i=d.reviews.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.reviews[i]={...d.reviews[i],...q.body,id:d.reviews[i].id};await setData(d);s.json(d.reviews[i])});
app.delete('/api/admin/reviews/:id',auth,async(q,s)=>{let d=await getData();d.reviews=d.reviews.filter(x=>x.id!=q.params.id);await setData(d);s.json({ok:true})});
app.post('/api/admin/login',(q,s)=>{if(q.body.username!==ADMIN_USER||q.body.password!==ADMIN_PASSWORD)return s.status(401).json({error:'Invalid login'});s.cookie('vh_admin',jwt.sign({username:ADMIN_USER,role:'admin'},SECRET,{expiresIn:'8h'}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:28800000});s.json({ok:true})});
app.post('/api/admin/logout',(q,s)=>{s.clearCookie('vh_admin');s.json({ok:true})});app.get('/api/admin/me',auth,(q,s)=>s.json({ok:true,user:q.admin.username}));
app.get('/api/admin/dashboard',auth,async(q,s)=>{let d=await getData();s.json({countries:d.countries.length,packages:d.packages.length,bookings:d.bookings.length,enquiries:d.enquiries.length,reviews:d.reviews.length,pendingReviews:d.reviews.filter(x=>x.published===false||x.verified===false).length,paymentVisible:d.settings?.paymentVisible===true})});
app.get('/api/admin/packages',auth,async(q,s)=>s.json((await getData()).packages));
app.post('/api/admin/packages',auth,async(q,s)=>{let d=await getData(),x={id:nid(d.packages),active:true,featured:false,itinerary:[],inclusions:[],exclusions:[],accommodation:[],...q.body,price:Number(q.body.price||0)};d.packages.push(x);await setData(d);s.json(x)});
app.put('/api/admin/packages/:id',auth,async(q,s)=>{let d=await getData(),i=d.packages.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.packages[i]={...d.packages[i],...q.body,id:d.packages[i].id,price:Number(q.body.price??d.packages[i].price)};await setData(d);s.json(d.packages[i])});
app.delete('/api/admin/packages/:id',auth,async(q,s)=>{let d=await getData();d.packages=d.packages.filter(x=>x.id!=q.params.id);await setData(d);s.json({ok:true})});
app.get('/api/admin/countries',auth,async(q,s)=>s.json((await getData()).countries));
app.post('/api/admin/countries',auth,async(q,s)=>{let d=await getData(),x={id:nid(d.countries),status:'active',...q.body};d.countries.push(x);await setData(d);s.json(x)});
app.put('/api/admin/countries/:id',auth,async(q,s)=>{let d=await getData(),i=d.countries.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.countries[i]={...d.countries[i],...q.body,id:d.countries[i].id};await setData(d);s.json(d.countries[i])});
app.delete('/api/admin/countries/:id',auth,async(q,s)=>{let d=await getData(),c=d.countries.find(x=>x.id==q.params.id);if(!c)return s.status(404).json({error:'Not found'});d.countries=d.countries.filter(x=>x.id!=q.params.id);d.packages=d.packages.filter(x=>x.country!==c.slug);await setData(d);s.json({ok:true})});
app.get('/api/admin/bookings',auth,async(q,s)=>s.json((await getData()).bookings.slice().reverse()));
app.put('/api/admin/bookings/:id',auth,async(q,s)=>{let d=await getData(),i=d.bookings.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.bookings[i]={...d.bookings[i],...q.body};if(q.body.status==='confirmed'&&!d.bookings[i].confirmedAt)d.bookings[i].confirmedAt=new Date().toISOString();if(q.body.status!=='confirmed')delete d.bookings[i].confirmedAt;await setData(d);s.json(d.bookings[i])});
app.get('/api/admin/enquiries',auth,async(q,s)=>s.json((await getData()).enquiries.slice().reverse()));
app.put('/api/admin/enquiries/:id',auth,async(q,s)=>{let d=await getData(),i=d.enquiries.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.enquiries[i]={...d.enquiries[i],...q.body,id:d.enquiries[i].id};await setData(d);s.json(d.enquiries[i])});
app.get('/api/site-settings',async(q,s)=>{let d=await getData();s.json(d.settings||{})});
app.get('/api/admin/settings',auth,async(q,s)=>{let d=await getData();s.json(d.settings||{})});
app.put('/api/admin/settings',auth,async(q,s)=>{let d=await getData();d.settings={...(d.settings||{}),...q.body,paymentVisible:q.body.paymentVisible===true};await setData(d);s.json(d.settings)});
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));app.get('/country/:slug',(q,s)=>s.sendFile(path.join(__dirname,'public/country.html')));app.get('*',(q,s)=>s.sendFile(path.join(__dirname,'public/index.html')));
initDb().then(()=>ensureStarterContent()).then(()=>app.listen(PORT,()=>console.log(`Ved Holidays running on ${PORT} | DB: ${usePostgres?'PostgreSQL':'JSON'}`))).catch(e=>{console.error('Database startup failed',e);process.exit(1)});
