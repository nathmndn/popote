/* Recherche purement visuelle : aucun changement des données de caisse. */
(()=>{
  const search=document.getElementById('peopleSearch');
  const body=document.getElementById('rows');
  if(!search||!body)return;
  const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function filter(){const q=normalize(search.value);for(const tr of body.querySelectorAll('tr')){const cells=tr.querySelectorAll('td');const identity=[...cells].slice(0,3).map(c=>c.textContent).join(' ');tr.hidden=!!q&&!normalize(identity).includes(q);}}
  search.addEventListener('input',filter);
  new MutationObserver(filter).observe(body,{childList:true});
  const access=document.getElementById('accessToggle');
  access?.addEventListener('click',()=>{if(!document.getElementById('accessPanel')?.hidden)document.getElementById('accessSection')?.scrollIntoView({behavior:'smooth',block:'start'});});
})();
