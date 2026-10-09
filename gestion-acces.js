'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 let client=null,users=[],me=null;
 const status=msg=>{$('accessStatus').textContent=msg;};
 const form=$('accessForm');
 const fields=()=>Object.fromEntries(['nigend','nom','prenom','grade','role'].map(k=>[k,$('access_'+k).value.trim()]));
 async function request(payload){
  const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Session expirée. Reconnectez-vous.');
  const cfg=window.POPOTE_CONFIG;
  const res=await fetch(`${cfg.supabaseUrl}/functions/v1/gestion-acces`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});
  const json=await res.json();if(!res.ok)throw Error(json.error||'Erreur de gestion des accès');return json;
 }
 function render(){
  const body=$('accessUsers');body.replaceChildren();
  for(const u of users){const tr=document.createElement('tr');
   for(const value of [`${u.grade||'—'} ${u.nom||'—'} ${u.prenom||''}`,u.nigend,u.role,u.actif?'Actif':'Désactivé']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
   const td=document.createElement('td');const edit=document.createElement('button');edit.type='button';edit.className='muted';edit.textContent='Modifier';edit.onclick=()=>{for(const k of ['nigend','nom','prenom','grade','role'])$('access_'+k).value=u[k]||'';$('accessId').value=u.id;$('accessPassword').value='';$('accessPassword').required=false;$('accessSave').textContent='Enregistrer les modifications';$('accessCancel').hidden=false;form.scrollIntoView({behavior:'smooth'});};td.append(edit);
   const toggle=document.createElement('button');toggle.type='button';toggle.className='muted';toggle.textContent=u.actif?'Désactiver':'Réactiver';toggle.disabled=u.id===me?.id&&u.actif;toggle.onclick=async()=>{if(!confirm(`${u.actif?'Désactiver':'Réactiver'} ${u.grade||''} ${u.nom||u.nigend} ?`))return;await perform({action:u.actif?'disable':'enable',id:u.id});};td.append(toggle);tr.append(td);body.append(tr);
  }
 }
 async function perform(payload){status('Opération en cours…');try{const result=await request(payload);users=result.users||[];render();status('✓ Modification enregistrée dans Supabase.');return true;}catch(e){status('Erreur : '+e.message);return false;}}
 function resetForm(){form.reset();$('accessId').value='';$('accessPassword').required=true;$('accessSave').textContent='Créer le compte';$('accessCancel').hidden=true;}
 $('accessCancel').onclick=resetForm;
 $('accessRefresh').onclick=()=>perform({action:'list'});
 form.onsubmit=async e=>{e.preventDefault();const id=$('accessId').value;const values=fields();if(values.role==='administrateur'&&!confirm('Confirmer les droits COMPLETS d’administration pour ce compte ?'))return;
  const password=$('accessPassword').value;
  const ok=await perform(id?{action:'update',id,...values}:{action:'create',...values,password});if(ok)resetForm();
 };
 $('accessResetPassword').onclick=async()=>{const id=$('accessId').value;if(!id){status('Sélectionnez d’abord un compte à modifier.');return;}const password=$('accessPassword').value;if(password.length<12){status('Saisissez un nouveau mot de passe de 12 caractères minimum.');return;}if(!confirm('Remplacer le mot de passe de ce compte ?'))return;if(await perform({action:'password',id,password}))$('accessPassword').value='';};
 $('accessToggle').onclick=()=>{$('accessPanel').hidden=!$('accessPanel').hidden;if(!$('accessPanel').hidden)void perform({action:'list'});};
 async function showAudit(){
  try{const {data,error}=await client.rpc('lire_popote_audit',{limite:100});if(error)throw error;const body=$('auditRows');body.replaceChildren();for(const a of data||[]){const tr=document.createElement('tr');const details=a.action==='mouvement_caisse'?`${a.details?.type||''} — ${a.details?.label||''}`:a.action;for(const v of [new Date(a.date_action).toLocaleString('fr-FR'),a.acteur_nom||'—',a.acteur_nigend||'—',details]){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);} $('auditStatus').textContent=`${(data||[]).length} dernières actions affichées.`;}catch(e){$('auditStatus').textContent='Historique indisponible : '+e.message;}
 }
 $('auditRefresh').onclick=showAudit;
 window.addEventListener('popote:authenticated',async e=>{client=e.detail.client;try{const {data:{user}}=await client.auth.getUser();const {data:profile,error}=await client.from('profils').select('id,nigend,role,actif,nom,prenom,grade').eq('id',user.id).single();if(error||!profile?.actif)throw Error('Profil non disponible');me=profile;$('connectedIdentity').textContent=`Connecté : ${[profile.grade,profile.prenom,profile.nom].filter(Boolean).join(' ')||profile.nigend} (${profile.role})`;$('accessToggle').hidden=profile.role!=='administrateur';$('auditPanel').hidden=false;void showAudit();}catch(e){status('Profil indisponible : '+e.message);}});
 window.addEventListener('popote:signed-out',()=>{client=null;me=null;users=[];$('accessToggle').hidden=true;$('accessPanel').hidden=true;$('auditPanel').hidden=true;resetForm();});
})();
