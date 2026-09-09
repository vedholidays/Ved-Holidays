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
app.use(express.json({limit:'2mb'}));app.use(express.urlencoded({extended:true}));app.use(cookieParser());app.use(express.static(path.join(__dirname,'public')));
function auth(req,res,next){try{req.admin=jwt.verify(req.cookies.vh_admin,SECRET);next()}catch(e){res.status(401).json({error:'Unauthorized'})}}
async function initDb(){if(!usePostgres)return;await pool.query(`CREATE TABLE IF NOT EXISTS vh_data (key text PRIMARY KEY, value jsonb NOT NULL)`);const r=await pool.query('SELECT key FROM vh_data');if(r.rowCount===0){const d=loadJson();for(const key of ['countries','packages','bookings','enquiries'])await pool.query('INSERT INTO vh_data(key,value) VALUES($1,$2)',[key,JSON.stringify(d[key]||[])]);console.log('PostgreSQL initialized from data/db.json')}}
async function getData(){if(!usePostgres)return loadJson();const r=await pool.query('SELECT key,value FROM vh_data');const d={countries:[],packages:[],bookings:[],enquiries:[]};for(const x of r.rows)d[x.key]=x.value;return d}
async function setData(d){if(!usePostgres){saveJson(d);return}for(const key of ['countries','packages','bookings','enquiries'])await pool.query('INSERT INTO vh_data(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,JSON.stringify(d[key]||[])]);}
app.get('/api/health',async(q,s)=>{try{if(usePostgres)await pool.query('SELECT 1');s.json({ok:true,database:usePostgres?'postgresql':'json'})}catch(e){s.status(500).json({ok:false,error:e.message})}});
app.get('/api/countries',async(q,s)=>s.json((await getData()).countries));
app.get('/api/countries/:slug',async(q,s)=>{let d=await getData(),c=d.countries.find(x=>x.slug===q.params.slug);if(!c)return s.status(404).json({error:'Country not found'});s.json({...c,packages:d.packages.filter(p=>p.country===c.slug&&p.active)})});
app.post('/api/enquiries',async(q,s)=>{let d=await getData(),x={id:nid(d.enquiries),createdAt:new Date().toISOString(),status:'new',...q.body};d.enquiries.push(x);await setData(d);s.json({ok:true,id:x.id})});
app.post('/api/bookings',async(q,s)=>{let d=await getData(),x={id:nid(d.bookings),createdAt:new Date().toISOString(),status:'pending',...q.body};d.bookings.push(x);await setData(d);s.json({ok:true,bookingId:'VH'+String(x.id).padStart(5,'0')})});
app.post('/api/admin/login',(q,s)=>{if(q.body.username!==ADMIN_USER||q.body.password!==ADMIN_PASSWORD)return s.status(401).json({error:'Invalid login'});s.cookie('vh_admin',jwt.sign({username:ADMIN_USER,role:'admin'},SECRET,{expiresIn:'8h'}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:28800000});s.json({ok:true})});
app.post('/api/admin/logout',(q,s)=>{s.clearCookie('vh_admin');s.json({ok:true})});app.get('/api/admin/me',auth,(q,s)=>s.json({ok:true,user:q.admin.username}));
app.get('/api/admin/dashboard',auth,async(q,s)=>{let d=await getData();s.json({countries:d.countries.length,packages:d.packages.length,bookings:d.bookings.length,enquiries:d.enquiries.length})});
app.get('/api/admin/packages',auth,async(q,s)=>s.json((await getData()).packages));
app.post('/api/admin/packages',auth,async(q,s)=>{let d=await getData(),x={id:nid(d.packages),active:true,featured:false,itinerary:[],inclusions:[],exclusions:[],accommodation:[],...q.body,price:Number(q.body.price||0)};d.packages.push(x);await setData(d);s.json(x)});
app.put('/api/admin/packages/:id',auth,async(q,s)=>{let d=await getData(),i=d.packages.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.packages[i]={...d.packages[i],...q.body,id:d.packages[i].id,price:Number(q.body.price??d.packages[i].price)};await setData(d);s.json(d.packages[i])});
app.delete('/api/admin/packages/:id',auth,async(q,s)=>{let d=await getData();d.packages=d.packages.filter(x=>x.id!=q.params.id);await setData(d);s.json({ok:true})});
app.get('/api/admin/countries',auth,async(q,s)=>s.json((await getData()).countries));
app.post('/api/admin/countries',auth,async(q,s)=>{let d=await getData(),x={id:nid(d.countries),status:'active',...q.body};d.countries.push(x);await setData(d);s.json(x)});
app.put('/api/admin/countries/:id',auth,async(q,s)=>{let d=await getData(),i=d.countries.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.countries[i]={...d.countries[i],...q.body,id:d.countries[i].id};await setData(d);s.json(d.countries[i])});
app.get('/api/admin/bookings',auth,async(q,s)=>s.json((await getData()).bookings.slice().reverse()));
app.put('/api/admin/bookings/:id',auth,async(q,s)=>{let d=await getData(),i=d.bookings.findIndex(x=>x.id==q.params.id);if(i<0)return s.status(404).json({error:'Not found'});d.bookings[i]={...d.bookings[i],...q.body};await setData(d);s.json(d.bookings[i])});
app.get('/api/admin/enquiries',auth,async(q,s)=>s.json((await getData()).enquiries.slice().reverse()));
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));app.get('/country/:slug',(q,s)=>s.sendFile(path.join(__dirname,'public/country.html')));app.get('*',(q,s)=>s.sendFile(path.join(__dirname,'public/index.html')));
initDb().then(()=>app.listen(PORT,()=>console.log(`Ved Holidays running on ${PORT} | DB: ${usePostgres?'PostgreSQL':'JSON'}`))).catch(e=>{console.error('Database startup failed',e);process.exit(1)});
