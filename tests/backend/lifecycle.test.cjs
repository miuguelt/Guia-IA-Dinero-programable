const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn,spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'../..');
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));

async function fixture() {
  const cache = path.join(root,'.cache');
  await fs.mkdir(cache,{recursive:true});
  const directory = await fs.mkdtemp(path.join(cache,'lifecycle-'));
  await fs.mkdir(path.join(directory,'scripts'));
  await fs.mkdir(path.join(directory,'artifacts'));
  await fs.copyFile(path.join(root,'start-windows.ps1'),path.join(directory,'start-windows.ps1'));
  await fs.writeFile(path.join(directory,'scripts/guide-credentials.ps1'),'# La detención no requiere cargar credenciales.\n');
  try { await fs.copyFile(path.join(root,'scripts/guide-processes.ps1'),path.join(directory,'scripts/guide-processes.ps1')); } catch(error) {if(error.code!=='ENOENT') throw error;}
  const script = path.join(directory,'tree.cjs');
  await fs.writeFile(script, `const {spawn}=require('node:child_process');const fs=require('node:fs');\nconst [role,record]=process.argv.slice(2);let child;\nif(role!=='leaf') child=spawn(process.execPath,[__filename,role==='root'?'child':'leaf',record],{stdio:'ignore',windowsHide:true,detached:true});\nfs.writeFileSync(record+'.'+role+'.json',JSON.stringify({pid:process.pid,child:child?.pid}));\nsetInterval(()=>{},1000);\n`);
  return {directory,script};
}

async function records(prefix) {
  for(let attempt=0;attempt<100;attempt++) {
    try {
      const values = await Promise.all(['root','child','leaf'].map(async role => JSON.parse(await fs.readFile(prefix+'.'+role+'.json','utf8'))));
      return values.map(value => value.pid);
    } catch { await delay(30); }
  }
  throw new Error('El árbol de procesos del fixture no se inició.');
}

function alive(pid) {try{process.kill(pid,0);return true;}catch{return false;}}

async function cleanup(directory,ids) {
  const file = path.join(directory,'cleanup.ps1');
  await fs.writeFile(file, `param([string]$GuideRoot,[string]$Ids)\nforeach($targetProcessId in ($Ids -split ',')) {\n $entry=Get-CimInstance Win32_Process -Filter "ProcessId=$targetProcessId" -ErrorAction SilentlyContinue\n if($entry -and $entry.CommandLine.Contains($GuideRoot)) {Stop-Process -Id $entry.ProcessId -ErrorAction SilentlyContinue}\n}\n`);
  spawnSync('pwsh',['-NoProfile','-File',file,'-GuideRoot',directory,'-Ids',ids.join(',')],{windowsHide:true,encoding:'utf8',timeout:15000});
  if(!directory.startsWith(path.join(root,'.cache')+path.sep)) throw new Error('La limpieza salió de la caché del proyecto.');
  await fs.rm(directory,{recursive:true,force:true});
}

test('El lanzador detiene todas las generaciones propias y conserva un proceso hermano', {timeout:60000}, async () => {
  const sample = await fixture();
  const prefix = path.join(sample.directory,'tree');
  const parent = spawn(process.execPath,[sample.script,'root',prefix],{windowsHide:true,stdio:'ignore'});
  const sibling = spawn(process.execPath,[sample.script,'leaf',path.join(sample.directory,'sibling')],{windowsHide:true,stdio:'ignore'});
  const ids = [parent.pid,sibling.pid];
  try {
    const tree = await records(prefix);
    ids.push(...tree);
    await fs.writeFile(path.join(sample.directory,'artifacts/lifecycle.json'),JSON.stringify({api:tree[0],chain:null}));
    const stopped = spawnSync('pwsh',['-NoProfile','-File',path.join(sample.directory,'start-windows.ps1'),'-Stop'],{windowsHide:true,encoding:'utf8',timeout:20000});
    assert.equal(stopped.status,0,stopped.stderr);
    await delay(300);
    assert.deepEqual(tree.map(alive),[false,false,false],'Ninguna generación del proyecto debe quedar huérfana.');
    assert.equal(alive(sibling.pid),true,'Un proceso hermano no pertenece al árbol registrado.');
    await assert.rejects(fs.access(path.join(sample.directory,'artifacts/lifecycle.json')));
  } finally {await cleanup(sample.directory,ids);}
});

async function readRecord(file) {
  for(let attempt=0;attempt<100;attempt++) {
    try {return JSON.parse(await fs.readFile(file,'utf8'));} catch {await delay(30);}
  }
  throw new Error('El servidor de salud de prueba no se inició.');
}

test('Las funciones de ciclo de vida verifican identidad, salud y preparación antes de detener el árbol', {timeout:60000}, async () => {
  const sample = await fixture();
  const prefix = path.join(sample.directory,'tree');
  const parent = spawn(process.execPath,[sample.script,'root',prefix],{windowsHide:true,stdio:'ignore'});
  const serverFile = path.join(sample.directory,'health.cjs');
  await fs.writeFile(serverFile, `const http=require('node:http');const fs=require('node:fs');const [profile,file]=process.argv.slice(2);const server=http.createServer((request,response)=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify({api:true,chain:{connected:true,chainId:31337},database:{connected:profile==='healthy'}}));});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(file,JSON.stringify({pid:process.pid,port:server.address().port})));`);
  const goodFile = path.join(sample.directory,'healthy.json');
  const badFile = path.join(sample.directory,'unhealthy.json');
  const good = spawn(process.execPath,[serverFile,'healthy',goodFile],{windowsHide:true,stdio:'ignore'});
  const bad = spawn(process.execPath,[serverFile,'unhealthy',badFile],{windowsHide:true,stdio:'ignore'});
  const ids = [parent.pid,good.pid,bad.pid];
  try {
    const tree = await records(prefix);
    ids.push(...tree);
    const [healthy,unhealthy] = await Promise.all([readRecord(goodFile),readRecord(badFile)]);
    const measured = spawnSync('pwsh',['-NoProfile','-File',path.join(root,'tests/lifecycle/measure-processes.ps1'),
      '-ModulePath',path.join(root,'scripts/guide-processes.ps1'),'-GuideRoot',sample.directory,
      '-StateFile',path.join(sample.directory,'artifacts/lifecycle.json'),'-RootProcessId',String(tree[0]),
      '-HealthyPort',String(healthy.port),'-UnhealthyPort',String(unhealthy.port),'-AssetRoot',root],
      {windowsHide:true,encoding:'utf8',timeout:45000});
    assert.equal(measured.status,0,measured.stderr);
    const report = JSON.parse(measured.stdout.trim());
    assert.equal(report.functionCoverage,100);
    assert.deepEqual(report.missing,[]);
    assert.deepEqual(report.covered,report.functions);
    assert.deepEqual(tree.map(alive),[false,false,false]);
    assert.equal(alive(good.pid),true,'La medición conserva los servicios hermanos de prueba.');
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    await fs.writeFile(path.join(root,'test-results/lifecycle-coverage.json'),JSON.stringify(report,null,2)+'\n');
  } finally {await cleanup(sample.directory,ids);}
});

test('El lanzador respeta GUIA_DB_HOST y GUIA_DB_PORT e informa si PostgreSQL no responde sin iniciar componentes', {timeout:60000}, async () => {
  const sample = await fixture();
  try {
    const net = require('node:net');
    const closed = await new Promise(resolve => {const probe=net.createServer();probe.listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});});
    const secret = require('node:crypto').randomBytes(24).toString('base64');
    const real = path.join(root,'scripts/guide-credentials.ps1').replace(/'/g,"''");
    await fs.writeFile(path.join(sample.directory,'scripts/guide-credentials.ps1'),
      `. '${real}'\nfunction Import-GuideCredentials { $env:GUIA_DB_USER='guia_dinero_programable'; $env:GUIA_DB_PASSWORD='${secret}'; $env:GUIA_DB_HOST='127.0.0.1'; $env:GUIA_DB_PORT='${closed}' }\n`);
    const started = spawnSync('pwsh',['-NoProfile','-File',path.join(sample.directory,'start-windows.ps1'),'-NoWatch'],{windowsHide:true,encoding:'utf8',timeout:30000});
    assert.notEqual(started.status,0);
    const output = started.stdout+started.stderr;
    assert.match(output.replace(/\s+/g,' '),new RegExp(`PostgreSQL no responde en 127\.0\.0\.1:${closed}`));
    assert.match(output,/-InitializeDatabase/);
    assert.ok(!output.includes(secret),'El lanzador no imprime la clave de la aplicación.');
    await assert.rejects(fs.access(path.join(sample.directory,'artifacts/chain.log')),'No se inicia la cadena sin PostgreSQL.');
    await assert.rejects(fs.access(path.join(sample.directory,'artifacts/lifecycle.json')),'No se registra un ciclo de vida sin PostgreSQL.');
  } finally {await cleanup(sample.directory,[]);}
});
