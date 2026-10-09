"use strict";
(()=>{
 const steps=[
  {target:"header",title:"Bienvenue dans Popote Brigade !",text:"Ce petit guide vous montre l’essentiel, étape par étape. Cliquez sur « Suivant » pour avancer. Vous pouvez quitter à tout moment avec la croix."},
  {target:"#month",title:"Choisir le mois de travail",text:"Sélectionnez le mois que vous souhaitez gérer. Attention : avant de changer de mois, archivez puis réinitialisez le tableau si vous avez déjà des saisies."},
  {target:"#dashboardCaisse",title:"Votre caisse, en un coup d’œil",text:"Ce grand montant est l’argent disponible dans la caisse popote. Il tient compte du solde initial, des paiements réellement saisis et des dépenses."},
  {target:".overview-cards",title:"Les chiffres importants",text:"Vous retrouvez ici le nombre de personnels, le total à régler, les paiements saisis et ce qu’il reste à payer. Les reports des mois précédents sont inclus."},
  {target:"#personnels",title:"Le tableau des personnels",text:"C’est votre espace principal. Chaque ligne correspond à une personne. Sur téléphone, les lignes deviennent des fiches plus faciles à lire."},
  {target:"#peopleSearch",title:"Retrouver quelqu’un rapidement",text:"Saisissez un nom, un prénom ou un grade pour filtrer la liste. Effacez votre recherche pour revoir tout le monde."},
  {target:"#personnelTable",title:"Cotisations et consommations",text:"L’eau coûte 4 € par mois et par personne. Cochez « Café » pour ajouter 6 €. Indiquez ensuite le nombre de consommations : chacune coûte 0,50 €."},
  {target:"#personnelTable",title:"Enregistrer un paiement",text:"Dans la colonne « Payé », entrez le montant réellement reçu. La caisse augmente seulement avec les paiements saisis, pas avec les sommes simplement dues. Vérifiez toujours le reste à payer."},
  {target:"#coursesSection",title:"Préparer les courses ensemble",text:"Cochez un produit dans le catalogue pour l’ajouter à la liste commune. Vous pouvez filtrer par catégorie, ajouter vos produits et créer de nouvelles catégories. Pendant les courses, cochez chaque produit acheté ; les autres restent à acheter. Le bouton Réinitialiser vide seulement la liste en cours, pas le catalogue."},
  {target:"#addPersonnelSection",title:"Ajouter un personnel",text:"Renseignez son nom, son prénom et son grade, puis cliquez sur « Ajouter ». La personne apparaîtra dans le tableau partagé."},
  {target:"#caisseDetails",title:"Dépenses et solde initial",text:"Cette rubrique permet de saisir une dépense avec son libellé et de régler le solde initial. Une dépense diminue la caisse. Modifiez le solde initial uniquement si nécessaire."},
  {target:"#ledgerSection",title:"Consulter le journal de caisse",text:"Vous pouvez y retrouver les paiements, dépenses et corrections enregistrés, ainsi que leur effet sur le solde. Un export CSV est disponible."},
  {target:"#archivesSection",title:"Archiver le mois",text:"À la fin du mois, cliquez sur « Archiver le tableau actif ». L’archive garde une photo des montants. Ensuite seulement, réinitialisez le tableau et choisissez le mois suivant. L’archivage n’encaisse rien une deuxième fois."},
  {target:"#auditSection",title:"Historique des actions",text:"Cette rubrique indique qui a réalisé les opérations enregistrées dans l’historique partagé. Elle aide à comprendre les modifications."},
  {target:"#accessSection",title:"Gestion des accès",text:"Les administrateurs peuvent ouvrir cette rubrique pour créer, modifier ou désactiver les comptes des responsables. Si vous êtes responsable, cette fonction n’est pas accessible."},
  {target:"#syncPanel",title:"Vérifier la synchronisation",text:"Avant de saisir des montants, attendez les messages confirmant que les personnels et la caisse sont synchronisés avec Supabase. Le bouton d’actualisation permet de recharger la caisse."},
  {target:"#backup",title:"Sauvegarde et exports",text:"Vous pouvez télécharger une sauvegarde JSON et des exports CSV. Conservez-les dans un endroit sécurisé : ils peuvent contenir des informations sur les personnels et la caisse."},
  {target:"#themeToggle",title:"Adapter l’affichage",text:"Le bouton « Mode sombre » permet de choisir l’apparence qui vous convient. Votre préférence est conservée sur cet appareil."},
  {target:"#tutorialStart",title:"Vous êtes prêt !",text:"Vous connaissez maintenant les fonctions principales. Vous pourrez relancer ce tutoriel à tout moment grâce au bouton « Tutoriel ». Bonne utilisation !"}
 ];
 const $=s=>document.querySelector(s), overlay=$("#tutorialOverlay");let index=0,previousFocus=null;
 const visible=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden");
 function place(){if(overlay.hidden)return;let step=steps[index],target=$(step.target);if(!visible(target)){target=$("header");}const focus=$(".tutorial-focus"),bubble=$(".tutorial-bubble");const r=target.getBoundingClientRect(),pad=5;focus.style.left=Math.max(3,r.left-pad)+"px";focus.style.top=Math.max(3,r.top-pad)+"px";focus.style.width=Math.min(innerWidth-Math.max(3,r.left-pad)-3,r.width+2*pad)+"px";focus.style.height=Math.min(innerHeight-Math.max(3,r.top-pad)-3,r.height+2*pad)+"px";
 const w=Math.min(390,innerWidth-28),h=bubble.offsetHeight;let x=Math.max(14,Math.min(innerWidth-w-14,r.left));let y=r.bottom+17;if(y+h>innerHeight-12)y=r.top-h-17;if(y<12)y=Math.max(12,innerHeight-h-12);bubble.style.left=x+"px";bubble.style.top=y+"px";}
 function show(){const step=steps[index],target=$(step.target);$("#tutorialProgress").textContent=`Étape ${index+1} sur ${steps.length}`;$("#tutorialTitle").textContent=step.title;$("#tutorialText").textContent=step.text;$("#tutorialPrev").disabled=index===0;$("#tutorialNext").textContent=index===steps.length-1?"Terminer ✓":"Suivant →";if(visible(target))target.scrollIntoView({behavior:"instant",block:"center"});requestAnimationFrame(()=>{place();$("#tutorialNext").focus({preventScroll:true});});}
 function close(){overlay.hidden=true;document.body.style.overflow="";previousFocus?.focus?.({preventScroll:true});}
 $("#tutorialStart").addEventListener("click",()=>{previousFocus=document.activeElement;index=0;overlay.hidden=false;document.body.style.overflow="hidden";show();});
 $("#tutorialClose").addEventListener("click",close);
 $("#tutorialPrev").addEventListener("click",()=>{if(index>0){index--;show();}});
 $("#tutorialNext").addEventListener("click",()=>{if(index===steps.length-1)close();else{index++;show();}});
 window.addEventListener("keydown",e=>{if(overlay.hidden)return;if(e.key==="Escape")close();if(e.key==="ArrowRight"&&e.target.tagName!=="INPUT")$("#tutorialNext").click();if(e.key==="ArrowLeft"&&e.target.tagName!=="INPUT")$("#tutorialPrev").click();});
 window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
})();
