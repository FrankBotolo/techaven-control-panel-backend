import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
const args=process.argv.slice(2);const at=args.indexOf('--output');
if(at<0||!args[at+1])throw Error('Use --output <new-private-folder-outside-repository>');
const directory=path.resolve(args[at+1]);const repository=path.resolve(import.meta.dirname,'..');
if(directory===repository||directory.startsWith(repository+path.sep))throw Error('Backups must be outside the Git repository');
if(fs.existsSync(directory))throw Error('Choose a new output folder; existing backups are never overwritten');
fs.mkdirSync(directory,{recursive:true});
const jobs=[
 ['commerce.sql',['exec','techaven-backend-database-1','sh','-c','export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysqldump --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --routines --triggers --events -u"$MYSQL_USER" "$MYSQL_DATABASE"']],
 ['cms.dump',['exec','techaven_cms-postgres-1','sh','-c','export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl']],
 ['backend-uploads.tar.gz',['exec','techaven-backend-backend-1','tar','czf','-','-C','/app/uploads','.']],
 ['cms-uploads.tar.gz',['exec','techaven_cms-strapi-1','tar','czf','-','-C','/opt/app/public/uploads','.']],
];
const receipt={created_at:new Date().toISOString(),database_versions:{mysql:'8.4',postgresql:'17'},files:[]};
for(const [name,command]of jobs){const filename=path.join(directory,name);const descriptor=fs.openSync(filename,'wx',0o600);
 let result;try{result=spawnSync('docker',command,{stdio:['ignore',descriptor,'pipe'],windowsHide:true});}finally{fs.closeSync(descriptor);}
 if(result.status!==0)throw Error(`${name} export failed; partial backup remains in ${directory}. Check source container availability.`);
 const hash=createHash('sha256');await pipeline(fs.createReadStream(filename),hash);receipt.files.push({name,bytes:fs.statSync(filename).size,sha256:hash.digest('hex')});
 console.log(`Exported ${name}`);
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
console.log(`Private backup complete: ${directory}. No credentials or database contents were printed.`);
