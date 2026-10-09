"use strict";
const KEY="popote-brigade-v3";
const V2_KEY="popote-brigade-v2";
const OLD_KEY="popote-brigade-v1";
const RANKS=["GAV","Brigadier","Brigadier-chef","Maréchal des logis","Gendarme","Maréchal des logis-chef","Adjudant","Adjudant-chef","Major","Lieutenant"];
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n/100);
const cents=v=>Math.round((Number(v)||0)*100);
const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const blank=()=>({coffee:false,count:0,paid:0});
const defaultData=()=>({month:"",people:[],entries:{},archives:[],opening:0,expenses:[],receiptsTotal:0,resetAfterArchive:false,ledger:[],ledgerBaseline:null});
function load(){try{
  const raw=localStorage.getItem(KEY);
  if(raw)return {...defaultData(),...JSON.parse(raw)};
  const old=localStorage.getItem(V2_KEY);
  if(old){
    const imported={...defaultData(),...JSON.parse(old)};
    const archivedReceipts=imported.archives.reduce((s,a)=>s+a.rows.reduce((v,r)=>v+r.paid,0),0);
    const currentArchived=imported.archives.some(a=>a.month===imported.month);
    const activeReceipts=currentArchived?0:Object.values(imported.entries).reduce((s,e)=>s+(Number(e.paid)||0),0);
    imported.receiptsTotal=archivedReceipts+activeReceipts;
    return imported;
  }
}catch(e){alert("Données locales illisibles. Aucune sauvegarde automatique n'a été effectuée.");}
return defaultData();}
let data=load();
const originalLocalPeople = structuredClone(data.people);
let personnelReady = false;
let personnelClient = null;
function personnelStatus(message){const node=$("personnelSyncStatus");if(node)node.textContent=message;}
function requirePersonnelReady(){if(!personnelReady){alert("La liste des personnels n’est pas synchronisée. Réessaie après la connexion.");return false;}return true;}
// Migration sans modifier les soldes : les anciens encaissements sont résumés
// dans une ligne de reprise. Les nouvelles opérations sont détaillées.
if(!Array.isArray(data.ledger)) data.ledger=[];
if(data.ledgerBaseline===undefined || data.ledgerBaseline===null){
  data.ledgerBaseline={receipts:Number(data.receiptsTotal)||0,opening:Number(data.opening)||0,
    expenses:(data.expenses||[]).reduce((sum,e)=>sum+(Number(e.amount)||0),0)};
}
function recordMovement(type,label,delta,month=data.month){
  data.ledger.push({id:id(),type,label,delta,month:month||"—",at:new Date().toISOString()});
}

// Migration conservatrice : la version 2 reste intacte, la version 3 a son propre stockage.
if(!localStorage.getItem(KEY)&&localStorage.getItem(V2_KEY))localStorage.setItem(KEY,JSON.stringify(data));
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){alert("Impossible d'enregistrer les données localement. Fais une sauvegarde JSON.");}}
function cleanMonth(s){return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);}
function safeEntry(pid){if(!data.entries[pid])data.entries[pid]=blank();return data.entries[pid];}
function latestArchivedBalance(pid,month){const previous=data.archives.filter(a=>a.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0];return previous?.rows.find(r=>r.id===pid)?.balance??0;}
function rankIndex(rank){const legacy={"Gendarme adjoint volontaire":"GAV"};const i=RANKS.indexOf(legacy[rank]||rank);return i<0?999:i;}
function sortedPeople(){return [...data.people].sort((a,b)=>rankIndex(b.rank)-rankIndex(a.rank)||a.last.localeCompare(b.last,"fr")||a.first.localeCompare(b.first,"fr"));}
function currentRows(){return sortedPeople().map(p=>{const e=safeEntry(p.id);const carry=cleanMonth(data.month)?latestArchivedBalance(p.id,data.month):0;const count=Math.max(0,Math.floor(Number(e.count)||0));const paid=Math.max(0,Math.round(Number(e.paid)||0));const charge=(e.coffee?600:0)+count*50;return {...p,coffee:!!e.coffee,count,paid,carry,charge,due:carry+charge,balance:carry+charge-paid};});}
function totals(rows){return rows.reduce((t,r)=>({due:t.due+r.due,paid:t.paid+r.paid,balance:t.balance+r.balance}),{due:0,paid:0,balance:0});}
function cell(value){const td=document.createElement("td");td.textContent=value;return td;}
function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function render(){const rows=currentRows(),t=totals(rows),body=$("rows");
const locked=data.archives.some(a=>a.month===data.month)&&!data.resetAfterArchive;body.replaceChildren();$("month").value=data.month;$("count").textContent=data.people.length;$("due").textContent=$("footDue").textContent=money(t.due);$("paid").textContent=$("footPaid").textContent=money(t.paid);$("remaining").textContent=$("footRemaining").textContent=money(t.balance);
if(!rows.length){const tr=el("tr"),td=cell("Aucun personnel inscrit");td.colSpan=11;td.className="empty";tr.append(td);body.append(tr);}
for(const r of rows){const tr=el("tr");for(const val of [r.rank,r.last,r.first])tr.append(cell(val));
const c=el("td"),check=el("input");check.type="checkbox";check.checked=r.coffee;check.disabled=locked;check.setAttribute("aria-label",`Café : ${r.first} ${r.last}`);check.onchange=()=>{safeEntry(r.id).coffee=check.checked;save();render();};c.append(check);tr.append(c);
const q=el("td"),count=el("input");count.type="number";count.min="0";count.step="1";count.value=r.count;count.disabled=locked;count.setAttribute("aria-label",`Consommations : ${r.first} ${r.last}`);count.onchange=()=>{safeEntry(r.id).count=Math.max(0,Math.floor(Number(count.value)||0));save();render();};q.append(count);tr.append(q);
for(const val of [r.count*50,r.carry,r.due])tr.append(cell(money(val)));
const p=el("td"),paid=el("input");paid.type="number";paid.min="0";paid.step="0.01";paid.value=(r.paid/100).toFixed(2);paid.disabled=locked;paid.setAttribute("aria-label",`Paiement : ${r.first} ${r.last}`);paid.onchange=()=>{const newPaid=Math.max(0,cents(paid.value));
const oldPaid=safeEntry(r.id).paid||0;
const delta=newPaid-oldPaid;
if(delta!==0){
 data.receiptsTotal+=delta;
 recordMovement("Paiement",`${r.rank} ${r.first} ${r.last} — ${money(oldPaid)} → ${money(newPaid)}`,delta);
}
safeEntry(r.id).paid=newPaid;save();render();};p.append(paid);tr.append(p);
tr.append(cell(money(r.balance)));const action=el("td"),remove=el("button","Supprimer");remove.type="button";remove.className="danger";remove.disabled=locked;remove.onclick=async()=>{if(!requirePersonnelReady())return;if(!confirm(`Supprimer ${r.first} ${r.last} du tableau actif ? Ses données déjà archivées resteront conservées.`))return;try{const {error}=await personnelClient.from("personnels").delete().eq("id",r.id);if(error)throw error;data.people=data.people.filter(x=>x.id!==r.id);delete data.entries[r.id];save();render();}catch(err){alert("Suppression non enregistrée sur Supabase : "+err.message);}};action.append(remove);tr.append(action);body.append(tr);}
renderCash();renderArchives();renderLedger();enhanceMobileTables();}
// Mise en page responsive uniquement : aucune donnée comptable n'est modifiée.
// Les en-têtes du tableau deviennent les libellés de chaque champ sur téléphone.
function enhanceMobileTables(){
 const tables=[document.getElementById("personnelTable"),document.getElementById("ledgerTable"),...document.querySelectorAll(".archive-detail table")];
 for(const table of tables){
  if(!table)continue;
  table.classList.add("responsive-table");
  const labels=[...table.querySelectorAll("thead th")].map(th=>th.textContent.trim());
  for(const tr of table.querySelectorAll("tbody tr")){
   const cells=[...tr.children];
   for(let i=0;i<cells.length;i++){
    if(cells[i].colSpan>1)continue;
    cells[i].dataset.label=labels[i]||"Action";
   }
  }
 }
}
function renderCash(){const receipts=data.receiptsTotal||0;const expenses=data.expenses.reduce((s,e)=>s+e.amount,0);$("openingView").textContent=money(data.opening);$("receiptsView").textContent=money(receipts);$("expensesView").textContent=money(expenses);$("cashView").textContent=money(data.opening+receipts-expenses);$("opening").value=(data.opening/100).toFixed(2);const list=$("expenseList");list.replaceChildren();for(const e of data.expenses){const row=el("div");row.className="expense-item";row.append(el("span",`${e.label} — ${money(e.amount)}`));const b=el("button","Annuler la dépense");b.className="danger";b.type="button";b.onclick=()=>{if(confirm(`Annuler la dépense « ${e.label} » ?`)){data.expenses=data.expenses.filter(x=>x.id!==e.id);
recordMovement("Annulation de dépense",`Annulation : ${e.label}`,e.amount);
save();render();}};row.append(b);list.append(row);}}
function renderArchives(){const list=$("archives");list.replaceChildren();const archives=[...data.archives].sort((a,b)=>b.month.localeCompare(a.month));if(!archives.length){list.append(el("p","Aucune archive enregistrée."));return;}
for(const a of archives){const wrap=el("div");wrap.className="archive-item";const details=el("details"),summary=el("summary",`${a.month} — ${a.rows.length} personnel(s) — ${money(a.rows.reduce((s,r)=>s+r.paid,0))} encaissés`);details.append(summary);const info=el("p","Archive figée : montants et soldes enregistrés manuellement.");details.append(info);const scroll=el("div");scroll.className="archive-detail";const table=el("table"),head=el("thead"),hrow=el("tr");for(const x of ["Grade","Nom","Prénom","Café","Nb conso.","Report","Total dû","Payé","Reste"]){hrow.append(el("th",x));}head.append(hrow);table.append(head);const body=el("tbody");for(const r of a.rows){const tr=el("tr");for(const v of [r.rank,r.last,r.first,r.coffee?"Oui":"Non",String(r.count),money(r.carry),money(r.due),money(r.paid),money(r.balance)])tr.append(cell(v));body.append(tr);}table.append(body);scroll.append(table);details.append(scroll);wrap.append(details);list.append(wrap);}}

function renderLedger(){
 const body=$("ledgerRows");body.replaceChildren();
 const baseline=data.ledgerBaseline||{receipts:0,opening:0,expenses:0};
 const prior=(Number(baseline.receipts)||0)+(Number(baseline.opening)||0)-(Number(baseline.expenses)||0);
 $("ledgerOpening").textContent=money(prior);
 const moves=[...data.ledger].reverse();
 if(!moves.length){const tr=el("tr"),td=cell("Aucun nouveau mouvement depuis la mise en place du journal.");td.colSpan=6;td.className="empty";tr.append(td);body.append(tr);}
 // Le solde après chaque mouvement est calculé dans l'ordre de saisie.
 let running=prior;
 const balances=new Map();
 for(const m of data.ledger){running+=m.delta;balances.set(m.id,running);}
 for(const m of moves){
  const tr=el("tr");const date=m.at?new Date(m.at).toLocaleString("fr-FR"):"—";
  for(const value of [date,m.month||"—",m.type,m.label,money(m.delta),money(balances.get(m.id))])tr.append(cell(value));
  body.append(tr);
 }
 $("ledgerCount").textContent=String(data.ledger.length);
}
function exportLedger(){
 const baseline=data.ledgerBaseline||{receipts:0,opening:0,expenses:0};
 let running=baseline.receipts+baseline.opening-baseline.expenses;
 const rows=[["Date","Mois","Type","Description","Variation EUR","Solde apres mouvement EUR"]];
 rows.push(["","","Reprise V4.1","Solde repris avant creation du journal",(running/100).toFixed(2),(running/100).toFixed(2)]);
 for(const m of data.ledger){running+=m.delta;rows.push([m.at,m.month,m.type,m.label,(m.delta/100).toFixed(2),(running/100).toFixed(2)]);}
 const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(";")).join("\r\n");
 download("journal-caisse.csv","\uFEFF"+csv,"text/csv;charset=utf-8");
}
$("ledgerExport").onclick=exportLedger;

for(const rank of RANKS){const option=el("option",rank);option.value=rank;$("rank").append(option);}
$("addForm").onsubmit=async e=>{e.preventDefault();if(!requirePersonnelReady())return;const last=$("last").value.trim(),first=$("first").value.trim(),rank=$("rank").value;if(!last||!first)return;if(data.archives.some(a=>a.month===data.month)&&!data.resetAfterArchive){alert("Réinitialise le tableau archivé avant d'ajouter un personnel.");return;}const person={id:id(),last,first,rank};try{const {error}=await personnelClient.from("personnels").insert({id:person.id,nom:last,prenom:first,grade:rank,actif:true});if(error)throw error;data.people.push(person);save();e.target.reset();render();}catch(err){alert("Ajout non enregistré sur Supabase : "+err.message);}};
$("month").onchange=e=>{const value=e.target.value;if(!cleanMonth(value)){alert("Choisis un mois valide.");render();return;}if(data.archives.some(a=>a.month===value)){alert("Ce mois est déjà archivé. Son historique est consultable ci-dessous, mais tu ne peux pas réutiliser ce mois pour un nouveau tableau.");render();return;}if(data.month&&data.month!==value&&Object.values(data.entries).some(e=>e.coffee||e.count||e.paid)){alert("Réinitialise d'abord le tableau actif avant de changer de mois. Archive-le auparavant si tu souhaites conserver les détails.");render();return;}data.month=value;data.resetAfterArchive=false;save();render();};
$("archive").onclick=()=>{if(!cleanMonth(data.month)){alert("Choisis d'abord le mois de travail.");return;}if(data.archives.some(a=>a.month===data.month)){alert("Ce mois est déjà archivé. Aucun doublon n'a été créé.");return;}const rows=currentRows();if(!rows.length){alert("Ajoute au moins un personnel avant d'archiver.");return;}const paid=rows.reduce((s,r)=>s+r.paid,0);if(!confirm(`ATTENTION : en archivant le présent tableau, il faudra penser à sélectionner le mois suivant !\n\nArchiver définitivement ${data.month} ? Les ${money(paid)} sont déjà comptabilisés dans la caisse. Aucun encaissement supplémentaire ne sera créé. Le tableau ne sera PAS réinitialisé automatiquement.`))return;data.archives.push({id:id(),month:data.month,rows:structuredClone(rows)});data.resetAfterArchive=false;save();render();alert("Archive enregistrée. Tu peux maintenant réinitialiser le tableau, puis choisir manuellement le nouveau mois.");};
$("reset").onclick=()=>{const active=Object.values(data.entries).some(e=>e.coffee||e.count||e.paid);if(!active&&!data.archives.some(a=>a.month===data.month)){alert("Le tableau est déjà vide de consommations et paiements.");return;}if(!data.archives.some(a=>a.month===data.month)){if(!confirm("ATTENTION : le mois actif n'est pas archivé. Une remise à zéro supprimera définitivement les consommations et paiements non archivés. Continuer ?"))return;}else if(!confirm("Remettre à zéro le café, les consommations et les paiements du tableau actif ? Les personnes, les archives et la caisse resteront inchangées."))return;data.entries={};data.resetAfterArchive=true;save();render();if(data.archives.some(a=>a.month===data.month))alert("Le tableau est déverrouillé. Sélectionne maintenant un nouveau mois de travail avant de saisir des consommations ou paiements : le mois archivé ne peut pas être archivé une seconde fois.");};
$("openingForm").onsubmit=e=>{e.preventDefault();const amount=cents($("opening").value);if(!confirm(`Fixer le solde initial à ${money(amount)} ? Cette opération modifie le solde de caisse.`))return;const old=data.opening;
data.opening=amount;
if(amount!==old)recordMovement("Ajustement du solde initial",`Solde initial : ${money(old)} → ${money(amount)}`,amount-old);
save();render();};
$("expenseForm").onsubmit=e=>{e.preventDefault();const label=$("expenseLabel").value.trim(),amount=cents($("expenseAmount").value);if(!label||amount<=0){alert("Saisis un libellé et un montant positif.");return;}data.expenses.push({id:id(),label,amount});
recordMovement("Dépense",label,-amount);
save();e.target.reset();render();};
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("backup").onclick=()=>download("sauvegarde-popote.json",JSON.stringify({version:5,data},null,2),"application/json");
$("csv").onclick=()=>{const header=["Mois","Grade","Nom","Prénom","Café","Consommations","Montant conso","Report","Total dû","Payé","Reste"];const rows=currentRows().map(r=>[data.month,r.rank,r.last,r.first,r.coffee?"Oui":"Non",r.count,(r.count*0.5).toFixed(2),(r.carry/100).toFixed(2),(r.due/100).toFixed(2),(r.paid/100).toFixed(2),(r.balance/100).toFixed(2)]);const csv=[header,...rows].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\r\n");download(`popote-${data.month||"tableau"}.csv`,"\uFEFF"+csv,"text/csv;charset=utf-8");};
// Les données v1 ne sont pas importées automatiquement : l'ancien stockage reste intact.
if(!localStorage.getItem(KEY)&&!localStorage.getItem(V2_KEY)&&localStorage.getItem(OLD_KEY)){$("addForm").insertAdjacentElement("beforebegin",Object.assign(el("p","Une ancienne version de la popote a été détectée dans ce navigateur. Ses données sont conservées séparément et ne sont pas importées automatiquement."),{className:"warning"}));}
render();

// Conserve le point de reprise historique pour les prochains chargements.
save();

// Préférence d'affichage indépendante des données comptables.
const THEME_KEY="popote-brigade-theme";
const themeButton=$("themeToggle");
function applyTheme(theme){
  const dark=theme==="dark";
  document.documentElement.dataset.theme=dark?"dark":"light";
  themeButton.textContent=dark?"☀ Mode clair":"☾ Mode sombre";
  themeButton.setAttribute("aria-label",dark?"Activer le mode clair":"Activer le mode sombre");
  themeButton.setAttribute("aria-pressed",String(dark));
}
let savedTheme="light";
try { savedTheme=localStorage.getItem(THEME_KEY)==="dark"?"dark":"light"; } catch(e) {}
applyTheme(savedTheme);
themeButton.addEventListener("click",()=>{
  const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
  applyTheme(next);
  try {localStorage.setItem(THEME_KEY,next);}catch(e){}
});

// V8 phase 2 : liste des personnels partagée. Les données financières restent LOCALES.
async function startPersonnelSync(client){
 personnelClient=client;personnelReady=false;personnelStatus("Chargement des personnels Supabase…");
 try{
  const {data:records,error}=await client.from("personnels").select("id,nom,prenom,grade,actif").eq("actif",true).order("nom");
  if(error)throw error;
  data.people=records.map(r=>({id:r.id,last:r.nom,first:r.prenom,rank:r.grade}));
  personnelReady=true;save();render();
  personnelStatus("✓ Personnels synchronisés avec Supabase ("+records.length+"). Les paiements et archives restent locaux.");
  const importButton=$("importLocalPeople");
  if(importButton)importButton.hidden=originalLocalPeople.length===0;
 }catch(err){personnelStatus("Échec de synchronisation : "+err.message+". Ajout et suppression bloqués.");}
}
window.addEventListener("popote:authenticated",e=>{if(e.detail?.client)startPersonnelSync(e.detail.client);});
window.addEventListener("popote:signed-out",()=>{personnelReady=false;personnelClient=null;personnelStatus("Connecte-toi pour synchroniser les personnels.");});
$("importLocalPeople").onclick=async()=>{
 if(!requirePersonnelReady())return;
 const missing=originalLocalPeople.filter(p=>!data.people.some(x=>x.id===p.id));
 if(!missing.length){alert("Tous les personnels de cette sauvegarde sont déjà présents.");return;}
 if(!confirm(`Importer ${missing.length} personnel(s) depuis CE navigateur vers Supabase ? Vérifie les doublons de noms avant de continuer. Les paiements et archives ne seront PAS importés.`))return;
 const records=missing.map(p=>({id:p.id,nom:p.last,prenom:p.first,grade:p.rank,actif:true}));
 const {error}=await personnelClient.from("personnels").upsert(records,{onConflict:"id"});
 if(error){alert("Import interrompu : "+error.message);return;}
 await startPersonnelSync(personnelClient);
 alert("Import des personnels terminé. Les autres données restent locales.");
};
