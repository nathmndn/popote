/* Fiche mobile V10 : réutilise les contrôles du tableau, sans modifier la logique Supabase ou caisse. */
'use strict';
(()=>{
 const root=document.getElementById('personnelMobile');
 const tbody=document.getElementById('rows');
 if(!root||!tbody)return;
 let selectedKey=null;
 const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
 const identity=tr=>[...tr.querySelectorAll('td')].slice(0,3).map(td=>td.textContent.trim()).join(' ');
 const people=()=>[...tbody.querySelectorAll('tr')].filter(tr=>tr.cells.length>=12&&tr.querySelector('input[type=checkbox]'));
 function update(){
  const rows=people();
  root.replaceChildren();
  if(!rows.length){root.append(el('p','', 'Aucun personnel inscrit.'));return;}
  const keys=rows.map(identity);
  let index=keys.indexOf(selectedKey);if(index<0)index=0;
  selectedKey=keys[index];
  const tr=rows[index],cells=tr.cells;
  const panel=el('div','pm-panel');
  const heading=el('h3','pm-heading','Fiche individuelle');panel.append(heading);
  const field=el('label','pm-field');field.append(el('span','', 'Choisir un personnel'));
  const select=el('select');select.setAttribute('aria-label','Choisir un personnel');
  keys.forEach((name,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=name;select.append(o);});
  select.value=String(index);select.onchange=()=>{selectedKey=keys[Number(select.value)];update();};
  field.append(select);panel.append(field);
  panel.append(el('strong','',selectedKey));
  function row(label,value){const r=el('div','pm-row');r.append(el('span','',label),el('strong','',value));return r;}
  panel.append(row('Cotisation eau',cells[3].textContent.trim()));
  const coffee=el('div','pm-row');coffee.append(el('span','', 'Abonnement café (6 €)'));
  const cb=document.createElement('input');cb.type='checkbox';const originalCoffee=cells[4].querySelector('input');cb.checked=originalCoffee.checked;cb.disabled=originalCoffee.disabled;
  cb.setAttribute('aria-label','Abonnement café');cb.onchange=()=>{originalCoffee.checked=cb.checked;originalCoffee.dispatchEvent(new Event('change',{bubbles:true}));};coffee.append(cb);panel.append(coffee);
  const originalCount=cells[5].querySelector('input');const countRow=el('div','pm-row');countRow.append(el('span','', 'Consommations (0,50 €)'));
  const step=el('div','pm-stepper');const minus=el('button','muted','−');minus.type='button';const plus=el('button','muted','+');plus.type='button';
  const count=document.createElement('input');count.type='number';count.min='0';count.step='1';count.value=originalCount.value;count.disabled=originalCount.disabled;count.setAttribute('aria-label','Nombre de consommations');
  const commitCount=()=>{originalCount.value=String(Math.max(0,Math.floor(Number(count.value)||0)));originalCount.dispatchEvent(new Event('change',{bubbles:true}));};
  count.onchange=commitCount;minus.disabled=plus.disabled=originalCount.disabled;
  minus.onclick=()=>{count.value=String(Math.max(0,(Number(count.value)||0)-1));commitCount();};
  plus.onclick=()=>{count.value=String((Number(count.value)||0)+1);commitCount();};
  step.append(minus,count,plus);countRow.append(step);panel.append(countRow);
  panel.append(row('Report du mois précédent',cells[7].textContent.trim()));
  const payRow=el('label','pm-field');payRow.append(el('span','', 'Montant payé (€)'));
  const originalPaid=cells[9].querySelector('input');const paid=document.createElement('input');paid.type='number';paid.min='0';paid.step='0.01';paid.value=originalPaid.value;paid.disabled=originalPaid.disabled;
  paid.onchange=()=>{originalPaid.value=paid.value;originalPaid.dispatchEvent(new Event('change',{bubbles:true}));};
  payRow.append(paid);panel.append(payRow);
  const totals=el('div','pm-totals');totals.append(row('Total dû',cells[8].textContent.trim()),row('Reste à payer',cells[10].textContent.trim()));panel.append(totals);
  const nav=el('div','pm-nav');const prev=el('button','muted','← Précédent');const next=el('button','','Suivant →');prev.type=next.type='button';
  prev.disabled=index===0;next.disabled=index===rows.length-1;
  prev.onclick=()=>{selectedKey=keys[index-1];update();};next.onclick=()=>{selectedKey=keys[index+1];update();};nav.append(prev,next);panel.append(nav);
  panel.append(el('div','pm-counter',`${index+1} / ${rows.length} personnels`));
  const originalDelete=cells[11].querySelector('button');if(originalDelete){const remove=el('button','danger pm-remove','Supprimer ce personnel');remove.type='button';remove.disabled=originalDelete.disabled;remove.onclick=()=>originalDelete.click();panel.append(remove);}
  root.append(panel);
 }
 // Le tableau source est reconstruit après chaque changement par script.js.
 new MutationObserver(update).observe(tbody,{childList:true});
 update();
})();
