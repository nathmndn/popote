'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const section=$('coursesSection');if(!section)return;
 let client=null,categories=[],products=[],items=[],busy=false,loading=false;
 const status=msg=>{const n=$('coursesStatus');if(n)n.textContent=msg;const f=$('coursesFormFeedback');if(f)f.textContent=msg;};
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
   if(!quiet)status('✓ Liste partagée synchronisée.');
  }catch(e){status('Liste de courses indisponible : '+e.message);}
  finally{loading=false;}
 }
 async function mutate(action){
  if(!client){status('Connexion Supabase absente : déconnectez-vous puis reconnectez-vous.');return false;}
  if(busy||loading){status('Synchronisation en cours : réessayez dans un instant.');return false;}
  busy=true;section.classList.add('courses-busy');status('Enregistrement sur Supabase…');
  try{await action();status('✓ Modification enregistrée pour tous les responsables.');}
  catch(e){status('Erreur Supabase : '+(e?.message||String(e))+' (code : '+(e?.code||'inconnu')+').');console.error('Popote courses :',e);}
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
   const heading=document.createElement('h4');heading.className='courses-group-heading-simple';heading.textContent=groupName;group.append(heading);
   const grid=document.createElement('div');grid.className='courses-product-grid';
   for(const p of groupProducts){
    const selected=active.has(p.id);
    const tile=document.createElement('button');tile.type='button';tile.className='courses-product-tile'+(selected?' is-selected':'');
    tile.textContent=p.nom;tile.disabled=selected;tile.setAttribute('aria-label',selected?p.nom+' déjà ajouté': 'Ajouter '+p.nom);
    tile.onclick=()=>mutate(async()=>check(await client.from('popote_liste_courses').upsert({produit_id:p.id,achete:false},{onConflict:'produit_id'})));
    grid.append(tile);
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
   const text=document.createElement('span');text.className='courses-item-name';text.textContent=p.nom;
   const actions=document.createElement('div');actions.className='courses-item-actions';
   const bought=document.createElement('button');bought.type='button';bought.className=item.achete?'courses-undo':'courses-mark-bought';
   bought.textContent=item.achete?'↶ Annuler':'✓ Acheté';
   bought.setAttribute('aria-label',(item.achete?'Annuler achat de ':'Marquer comme acheté : ')+p.nom);
   bought.onclick=()=>mutate(async()=>check(await client.from('popote_liste_courses').update({achete:!item.achete,modifie_le:new Date().toISOString()}).eq('produit_id',p.id)));
   const remove=document.createElement('button');remove.type='button';remove.className='courses-remove';remove.textContent='×';remove.title='Retirer '+p.nom;remove.setAttribute('aria-label','Retirer '+p.nom+' de la liste');
   remove.onclick=()=>mutate(async()=>check(await client.from('popote_liste_courses').delete().eq('produit_id',p.id)));
   actions.append(bought,remove);row.append(text,actions);return row;
  }
  if(remaining.length){const h=document.createElement('div');h.className='courses-list-heading';h.textContent='À ACHETER · '+remaining.length;list.append(h);for(const p of remaining)list.append(renderEntry(p));}
  if(completed.length){const h=document.createElement('div');h.className='courses-list-heading courses-list-heading-done';h.textContent='DÉJÀ ACHETÉS · '+completed.length;list.append(h);for(const p of completed)list.append(renderEntry(p));}

 }
 $('coursesSearch').addEventListener('input',render);
 $('coursesFilter').addEventListener('change',render);
 $('coursesSort').addEventListener('change',render);
 $('coursesAddCategory').onsubmit=e=>{e.preventDefault();const name=$('coursesNewCategory').value.trim();if(!name)return;
  mutate(async()=>{check(await client.from('popote_categories').insert({nom:name}));$('coursesNewCategory').value='';});
 };
  const productForm=$('coursesAddProduct');
  const productButton=productForm.querySelector('button[type="submit"]');
  productForm.addEventListener('submit',async e=>{
   e.preventDefault();
   const productName=$('coursesNewProduct').value.trim();
   const cat=$('coursesCategory').value;
   if(!productName){status('Saisissez le nom du produit.');$('coursesNewProduct').focus();return;}
   if(!cat){status('Sélectionnez une catégorie ou créez-en une.');$('coursesCategory').focus();return;}
   if(!client){status('Connexion non initialisée. Déconnectez-vous puis reconnectez-vous.');return;}
   if(busy||loading){status('Synchronisation en cours. Réessayez dans quelques secondes.');return;}
   productButton.disabled=true;
   productButton.textContent='Enregistrement…';
   try{
    busy=true;
    status('Enregistrement de « '+productName+' »…');
    const {data,error}=await client.from('popote_produits').insert({nom:productName,categorie_id:cat}).select('id,nom,categorie_id');
    if(error)throw error;
    if(!data?.length)throw new Error('Insertion non confirmée : vérifiez les autorisations de la table popote_produits.');
    products=[...products,...data];
    $('coursesNewProduct').value='';
    render();
    status('✓ « '+productName+' » ajouté au catalogue. Cliquez sur son bloc pour l’ajouter aux courses.');
   }catch(err){
    const message='Échec de l’ajout : '+(err?.message||String(err))+(err?.code?' [code '+err.code+']':'');
    status(message);console.error('Ajout produit Popote :',err);
   }finally{
    busy=false;
    productButton.disabled=false;
    productButton.textContent='+ Ajouter le produit';
   }
  });
 $('coursesReset').onclick=()=>{if(!items.length)return;if(!confirm('Vider la liste de courses en cours ? Les produits et catégories du catalogue seront conservés.'))return;
  mutate(async()=>check(await client.from('popote_liste_courses').delete().in('produit_id',items.map(i=>i.produit_id))));
 };
 $('coursesRefresh').onclick=()=>load();
 window.addEventListener('popote:authenticated',e=>{client=e.detail?.client||null;void load();});
 window.addEventListener('popote:signed-out',()=>{client=null;categories=[];products=[];items=[];render();status('Connectez-vous pour consulter les courses.');});
 window.addEventListener('focus',()=>{if(client)void load(true);});
 setInterval(()=>{if(client&&!document.hidden)void load(true);},8000);
})();
