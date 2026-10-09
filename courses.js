'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const section=$('coursesSection');if(!section)return;
 let client=null,categories=[],products=[],items=[],busy=false,loading=false;
 const status=msg=>{$('coursesStatus').textContent=msg;};
 const escapeText=(node,value)=>{node.textContent=value;return node;};
 const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 const ordered=()=>[...products].sort((a,b)=>{
  const ca=categories.find(c=>c.id===a.categorie_id)?.nom||'';
  const cb=categories.find(c=>c.id===b.categorie_id)?.nom||'';
  return $('coursesSort').value==='nom'?a.nom.localeCompare(b.nom,'fr'):ca.localeCompare(cb,'fr')||a.nom.localeCompare(b.nom,'fr');
 });
 const activeMap=()=>new Map(items.map(i=>[i.produit_id,i]));
 async function load(quiet=false){
  if(!client||loading||busy)return;loading=true;
  if(!quiet)status('Chargement de la liste partagée…');
  try{
   const [c,p,l]=await Promise.all([
    client.from('popote_categories').select('id,nom').order('nom'),
    client.from('popote_produits').select('id,nom,categorie_id').order('nom'),
    client.from('popote_liste_courses').select('produit_id,achete,ajoute_le').order('ajoute_le')
   ]);
   for(const r of [c,p,l])if(r.error)throw r.error;
   categories=c.data||[];products=p.data||[];items=l.data||[];render();
   status('✓ Liste partagée synchronisée.');
  }catch(e){status('Liste de courses indisponible : '+e.message);}
  finally{loading=false;}
 }
 async function mutate(action){
  if(!client||busy||loading)return;
  busy=true;section.classList.add('courses-busy');status('Enregistrement sur Supabase…');
  try{await action();status('✓ Modification enregistrée pour tous les responsables.');}
  catch(e){status('Erreur : '+e.message);}
  finally{busy=false;section.classList.remove('courses-busy');await load(true);}
 }
 const check=r=>{if(r.error)throw r.error;return r;};
 function render(){
  const cat=$('coursesCategory');const old=cat.value;cat.replaceChildren();
  for(const c of categories)cat.append(option(c.id,c.nom));if(categories.some(c=>c.id===old))cat.value=old;
  const filter=$('coursesFilter');const oldFilter=filter.value;filter.replaceChildren(option('','Toutes les catégories'));
  for(const c of categories)filter.append(option(c.id,c.nom));filter.value=oldFilter;
  const catalog=$('coursesCatalogue');catalog.replaceChildren();
  const search=$('coursesSearch').value.trim().toLocaleLowerCase('fr');
  const active=activeMap();let shown=0;
  const groups=new Map();
  for(const p of ordered()){
   if(filter.value&&p.categorie_id!==filter.value)continue;
   if(search&&!p.nom.toLocaleLowerCase('fr').includes(search))continue;
   const category=categories.find(c=>c.id===p.categorie_id)?.nom||'Autres';
   const key=$('coursesSort').value==='nom'?'Tous les produits':category;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(p);shown++;
  }
  for(const [groupName,groupProducts] of groups){
   const group=document.createElement('section');group.className='courses-product-group';
   const heading=document.createElement('div');heading.className='courses-group-heading';
   const label=document.createElement('strong');label.textContent=groupName;
   const count=document.createElement('span');count.textContent=groupProducts.filter(p=>active.has(p.id)).length+' / '+groupProducts.length+' sélectionné(s)';
   heading.append(label,count);group.append(heading);
   const grid=document.createElement('div');grid.className='courses-product-grid';
   for(const p of groupProducts){
    const tile=document.createElement('label');tile.className='courses-product-tile'+(active.has(p.id)?' is-selected':'');
    const input=document.createElement('input');input.type='checkbox';input.checked=active.has(p.id);
    input.setAttribute('aria-label','Ajouter '+p.nom+' à la liste');
    input.onchange=()=>mutate(async()=>{
     if(input.checked)check(await client.from('popote_liste_courses').upsert({produit_id:p.id,achete:false},{onConflict:'produit_id'}));
     else check(await client.from('popote_liste_courses').delete().eq('produit_id',p.id));
    });
    const name=document.createElement('span');name.textContent=p.nom;
    tile.append(input,name);grid.append(tile);
   }
   group.append(grid);catalog.append(group);
  }
  if(!shown){const empty=document.createElement('p');empty.className='courses-empty';empty.textContent='Aucun produit trouvé. Essayez une autre recherche.';catalog.append(empty);}
  $('coursesCatalogueCount').textContent=shown+' produit(s) affiché(s) · '+active.size+' dans la liste';
  const list=$('coursesCurrent');list.replaceChildren();
  const entries=ordered().filter(p=>active.has(p.id));
  const remaining=entries.filter(p=>!active.get(p.id).achete);
  const completed=entries.filter(p=>active.get(p.id).achete);
  $('coursesCount').textContent=remaining.length+' à acheter · '+completed.length+' acheté(s)';
  if(!entries.length){const empty=document.createElement('div');empty.className='courses-empty-state';empty.textContent='🛒 Votre liste est vide. Sélectionnez des produits dans le catalogue pour commencer.';list.append(empty);}
  function renderEntry(p){
   const item=active.get(p.id),row=document.createElement('div');row.className='courses-item'+(item.achete?' courses-done':'');
   const label=document.createElement('label');label.className='courses-item-check';
   const input=document.createElement('input');input.type='checkbox';input.checked=item.achete;input.setAttribute('aria-label','Marquer '+p.nom+' comme acheté');
   input.onchange=()=>mutate(async()=>{check(await client.from('popote_liste_courses').update({achete:input.checked,modifie_le:new Date().toISOString()}).eq('produit_id',p.id));});
   const text=document.createElement('span');text.className='courses-item-name';text.textContent=p.nom;
   label.append(input,text);
   const category=document.createElement('small');category.textContent=categories.find(c=>c.id===p.categorie_id)?.nom||'Autres';
   const remove=document.createElement('button');remove.type='button';remove.className='muted courses-remove';remove.textContent='×';remove.title='Retirer '+p.nom;remove.setAttribute('aria-label','Retirer '+p.nom+' de la liste');
   remove.onclick=()=>mutate(async()=>{check(await client.from('popote_liste_courses').delete().eq('produit_id',p.id));});
   row.append(label,category,remove);return row;
  }
  if(remaining.length){const h=document.createElement('div');h.className='courses-list-heading';h.textContent='À ACHETER · '+remaining.length;list.append(h);for(const p of remaining)list.append(renderEntry(p));}
  if(completed.length){const h=document.createElement('div');h.className='courses-list-heading courses-list-heading-done';h.textContent='ACHETÉS · '+completed.length;list.append(h);for(const p of completed)list.append(renderEntry(p));}

 }
 $('coursesSearch').addEventListener('input',render);
 $('coursesFilter').addEventListener('change',render);
 $('coursesSort').addEventListener('change',render);
 $('coursesAddCategory').onsubmit=e=>{e.preventDefault();const name=$('coursesNewCategory').value.trim();if(!name)return;
  mutate(async()=>{check(await client.from('popote_categories').insert({nom:name}));$('coursesNewCategory').value='';});
 };
 $('coursesAddProduct').onsubmit=e=>{e.preventDefault();const name=$('coursesNewProduct').value.trim(),cat=$('coursesCategory').value;if(!name||!cat)return;
  mutate(async()=>{
   const r=check(await client.from('popote_produits').insert({nom,categorie_id:cat}).select('id').single());
   check(await client.from('popote_liste_courses').insert({produit_id:r.data.id}));
   $('coursesNewProduct').value='';
  });
 };
 $('coursesReset').onclick=()=>{if(!items.length)return;if(!confirm('Vider la liste de courses en cours ? Les produits et catégories du catalogue seront conservés.'))return;
  mutate(async()=>check(await client.from('popote_liste_courses').delete().in('produit_id',items.map(i=>i.produit_id))));
 };
 $('coursesRefresh').onclick=()=>load();
 window.addEventListener('popote:authenticated',e=>{client=e.detail?.client||null;void load();});
 window.addEventListener('popote:signed-out',()=>{client=null;categories=[];products=[];items=[];render();status('Connectez-vous pour consulter les courses.');});
 window.addEventListener('focus',()=>{if(client)void load(true);});
 setInterval(()=>{if(client&&!document.hidden)void load(true);},8000);
})();
