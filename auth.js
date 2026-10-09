'use strict';
(() => {
  const cfg = window.POPOTE_CONFIG;
  const $ = id => document.getElementById(id);
  const ready = cfg && !cfg.supabaseUrl.includes('REMPLACER') && !cfg.supabasePublishableKey.includes('REMPLACER');
  let client = null;
  if (ready && window.supabase?.createClient) client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  function showSession(session) {
    $('loginScreen').hidden = !!session;
    $('appShell').hidden = !session;
    if (session) $('loginPassword').value = '';
  }
  document.addEventListener('DOMContentLoaded', async () => {
    if (!client) { $('loginError').textContent = 'Configurer config.js avec les valeurs publiques de Supabase.'; return; }
    try {
      const {data:{session}} = await client.auth.getSession();
      if (session) {
        const {data,error} = await client.rpc('mon_profil_actif');
        if (!error && data === true) showSession(session);
        else await client.auth.signOut();
      }
    } catch { $('loginError').textContent = 'Impossible de vérifier la session.'; }
    client.auth.onAuthStateChange((_event,session) => { if (!session) showSession(null); });
    $('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const button = $('loginSubmit'); button.disabled = true;
      $('loginError').textContent = '';
      try {
        const response = await fetch(`${cfg.supabaseUrl}/functions/v1/${cfg.functionName}`, {
          method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey},
          body: JSON.stringify({nigend:$('loginNigend').value.trim(),password:$('loginPassword').value})
        });
        if (!response.ok) throw new Error('Identifiant ou mot de passe incorrect, ou service indisponible.');
        const tokens = await response.json();
        const {error} = await client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});
        if (error) throw error;
        const {data:allowed,error:profileError} = await client.rpc('mon_profil_actif');
        if (profileError || allowed !== true) {await client.auth.signOut();throw new Error('Compte non autorisé.');}
        showSession({access_token:tokens.access_token});
      } catch (err) { $('loginError').textContent = err.message || 'Connexion impossible.'; }
      finally {button.disabled = false;}
    });
    $('logoutButton').addEventListener('click', async () => { await client.auth.signOut(); showSession(null); });
  });
})();
