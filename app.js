(() => {
  const cfg = window.PORTAL_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const state = { client:null, session:null, items:[], view:"home", editingFiles:[], mobile:false };
  const kindName = (kind) => kind === "activity" ? "ATIVIDADE" : "AULA";
  const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel = (value) => value ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)) : "Agora";
  const toast = (message) => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };
  const setMessage = (id,msg) => { $(id).textContent=msg||""; };
  function openModal(id){ $("#overlay").classList.add("show"); $(id).classList.add("open"); document.body.style.overflow="hidden"; }
  function closeModals(){ $("#overlay").classList.remove("show"); $$(".modal").forEach(m=>m.classList.remove("open")); document.body.style.overflow=""; }
  function configReady(){ return cfg.url && cfg.anonKey && !String(cfg.url).includes("SEU_") && !String(cfg.anonKey).includes("SUA_"); }
  async function init(){
    $("#today-label").textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
    if(configReady() && window.supabase){ state.client=window.supabase.createClient(cfg.url,cfg.anonKey); const {data}=await state.client.auth.getSession(); state.session=data.session; state.client.auth.onAuthStateChange((_event,session)=>{state.session=session; updateAdminUI(); loadItems();}); }
    else { $("#admin-status").textContent="Configuração pendente"; }
    bindEvents(); updateAdminUI(); await loadItems();
  }
  function bindEvents(){
    $$("[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
    $("#theme-toggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("portal-theme",document.body.classList.contains("dark")?"dark":"light");});
    if(localStorage.getItem("portal-theme")==="dark") document.body.classList.add("dark");
    $("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
    $("#overlay").addEventListener("click",closeModals); $$("[data-close]").forEach(b=>b.addEventListener("click",closeModals));
    $("#admin-open").addEventListener("click",()=>{openModal("#admin-modal");setMessage("#login-message","");});
    $("#login-form").addEventListener("submit",login);
    $("#logout-button").addEventListener("click",logout);
    $("#new-lesson").addEventListener("click",()=>openEditor("lesson"));
    $("#new-activity").addEventListener("click",()=>openEditor("activity"));
    $("#editor-form").addEventListener("submit",saveItem);
    $("#search-input").addEventListener("input",renderListing); $("#sort-select").addEventListener("change",renderListing);
    $("#admin-list").addEventListener("click",adminAction);
    $("#listing-grid").addEventListener("click",cardAction); $("#recent-grid").addEventListener("click",cardAction);
  }
  async function loadItems(){
    if(!state.client){state.items=[];renderAll();return;}
    const {data,error}=await state.client.from("portal_content").select("*").order("created_at",{ascending:false});
    if(error){console.error(error);toast("Não foi possível carregar os conteúdos.");return;}
    state.items=data||[];renderAll();
  }
  function visibleItems(){return state.items.filter(x=>x.published || state.session);}
  function renderAll(){
    const items=visibleItems(), lessons=items.filter(x=>x.kind==="lesson"), activities=items.filter(x=>x.kind==="activity");
    $("#lesson-count").textContent=lessons.length;$("#activity-count").textContent=activities.length;
    $("#stat-lessons").textContent=lessons.length;$("#stat-activities").textContent=activities.length;
    $("#stat-materials").textContent=items.reduce((n,x)=>n+(Array.isArray(x.files)?x.files.length:0)+(Array.isArray(x.links)?x.links.length:0)+(x.video_url?1:0),0);
    renderRecent();renderListing();renderAdminList();
  }
  function card(item){
    return '<article class="content-card" data-open="'+escapeHtml(item.id)+'"><div class="card-top"><span class="card-kind">'+kindName(item.kind)+'</span><span class="card-date">'+dateLabel(item.created_at)+'</span></div><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.summary||item.body||"Abra para visualizar o conteúdo.")+'</p><div class="card-bottom"><span>'+(item.files?.length||0)+' arquivo(s) · '+(item.links?.length||0)+' link(s)</span><span class="card-arrow">↗</span></div></article>';
  }
  function renderRecent(){const recent=visibleItems().slice(0,3);$("#recent-grid").innerHTML=recent.length?recent.map(card).join(""):'<div class="empty-state"><span>✦</span><strong>Nenhum conteúdo por enquanto</strong><p>Quando novas aulas e atividades forem publicadas, elas aparecerão aqui.</p></div>';}
  function navigate(view){
    state.view=view;$("#sidebar").classList.remove("open");
    const labels={home:"Visão geral",lessons:"Aulas",activities:"Atividades"};
    $("#breadcrumb-current").textContent=labels[view];$("#page-title").innerHTML=view==="home"?'Aprender é um processo<span>.</span>':view==="lessons"?'Biblioteca de aulas<span>.</span>':'Hora de praticar<span>.</span>';
    $("#page-subtitle").textContent=view==="home"?"Tudo o que você precisa, organizado em um só lugar.":view==="lessons"?"Explore os conteúdos e avance no seu ritmo.":"Encontre as atividades e coloque o aprendizado em prática.";
    $("#recent-section").classList.toggle("hidden",view!=="home");$("#listing-section").classList.toggle("hidden",view==="home");
    if(view!=="home"){ $("#listing-title").textContent=labels[view];$("#listing-eyebrow").textContent=view==="lessons"?"APRENDA NO SEU RITMO":"FIXE O CONHECIMENTO";$("#search-input").value="";renderListing(); }
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderListing(){
    const kind=state.view==="activities"?"activity":"lesson";let list=state.items.filter(x=>(x.published||state.session)&&x.kind===kind);
    const q=$("#search-input").value.trim().toLowerCase();if(q)list=list.filter(x=>(x.title+" "+(x.summary||"")+" "+(x.body||"")).toLowerCase().includes(q));
    const sort=$("#sort-select").value;if(sort==="az")list.sort((a,b)=>a.title.localeCompare(b.title,"pt-BR"));if(sort==="oldest")list.reverse();
    $("#listing-grid").innerHTML=list.length?list.map(card).join(""):'<div class="empty-state"><span>⌕</span><strong>Nenhum conteúdo encontrado</strong><p>Tente outra busca ou volte mais tarde.</p></div>';
  }
  function cardAction(e){const el=e.target.closest("[data-open]");if(el)showContent(el.dataset.open);}
  function showContent(id){
    const item=state.items.find(x=>x.id===id);if(!item)return;
    $("#modal-kind").textContent=kindName(item.kind);$("#modal-title").textContent=item.title;$("#modal-summary").textContent=item.summary||"";
    $("#modal-body").textContent=item.body||"";
    const video=videoEmbed(item.video_url);$("#modal-video").innerHTML=video?'<iframe class="modal-video" src="'+video+'" title="Vídeo do YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>':"";
    $("#modal-links").innerHTML=(item.links||[]).length?'<div class="resource-list">'+item.links.map(l=>'<a class="resource-link" href="'+escapeHtml(l.url)+'" target="_blank" rel="noopener">↗ '+escapeHtml(l.title||l.url)+'</a>').join("")+'</div>':"";
    $("#modal-files").innerHTML=(item.files||[]).length?'<div class="resource-list">'+item.files.map(f=>'<a class="resource-link" href="'+escapeHtml(f.url)+'" target="_blank" rel="noopener" download>↓ '+escapeHtml(f.name)+'</a>').join("")+'</div>':"";
    openModal("#content-modal");
  }
  function videoEmbed(url){if(!url)return null;try{const u=new URL(url);let id=u.hostname.includes("youtu.be")?u.pathname.slice(1):u.searchParams.get("v");if(u.pathname.startsWith("/embed/"))id=u.pathname.split("/")[2];if(u.pathname.startsWith("/shorts/"))id=u.pathname.split("/")[2];return id&&/^[\w-]{11}$/.test(id)?"https://www.youtube-nocookie.com/embed/"+id:null;}catch{return null;}}
  async function login(e){e.preventDefault();if(!state.client){setMessage("#login-message","O portal ainda precisa ser conectado ao Supabase. Veja o README.");return;}setMessage("#login-message","Entrando...");const {error}=await state.client.auth.signInWithPassword({email:$("#login-email").value,password:$("#login-password").value});setMessage("#login-message",error?error.message:"");if(!error){$("#login-form").classList.add("hidden");$("#admin-panel").classList.remove("hidden");}}
  async function logout(){await state.client.auth.signOut();$("#login-form").classList.remove("hidden");$("#admin-panel").classList.add("hidden");toast("Você saiu da área administrativa.");}
  function updateAdminUI(){const admin=!!state.session;$("#admin-status").textContent=admin?"Sessão administrativa ativa":configReady()?"Somente consulta":"Configuração pendente";if(admin){$("#login-form").classList.add("hidden");$("#admin-panel").classList.remove("hidden");}else{$("#login-form").classList.remove("hidden");$("#admin-panel").classList.add("hidden");}}
  function renderAdminList(){if(!state.session)return;const items=state.items;$("#admin-list").innerHTML=items.length?items.map(x=>'<div class="admin-row"><strong>'+escapeHtml(x.title)+'</strong><small>'+kindName(x.kind)+' · '+(x.published?"Publicado":"Rascunho")+'</small><button data-edit="'+x.id+'">Editar</button><button data-delete="'+x.id+'">Excluir</button></div>').join(""):'<p class="field-help">Ainda não há conteúdos cadastrados.</p>';}
  function adminAction(e){const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit){const item=state.items.find(x=>x.id===edit.dataset.edit);if(item)openEditor(item.kind,item);}if(del)deleteItem(del.dataset.delete);}
  function openEditor(kind,item=null){
    $("#editor-form").reset();$("#edit-id").value=item?.id||"";$("#edit-kind").value=kind;$("#editor-title").textContent=item?"Editar conteúdo":"Novo "+(kind==="lesson"?"aula":"atividade");
    $("#edit-title").value=item?.title||"";$("#edit-summary").value=item?.summary||"";$("#edit-body").value=item?.body||"";$("#edit-video").value=item?.video_url||"";
    $("#edit-links").value=(item?.links||[]).map(l=>(l.title||"Link")+" | "+l.url).join("\n");$("#edit-published").checked=item?item.published:true;state.editingFiles=item?.files||[];
    $("#existing-files").innerHTML=state.editingFiles.map(f=>'<div>• '+escapeHtml(f.name)+' <button type="button" data-remove-file="'+escapeHtml(f.path)+'">Remover</button></div>').join("");
    $("#existing-files").onclick=(e)=>{const b=e.target.closest("[data-remove-file]");if(b){state.editingFiles=state.editingFiles.filter(f=>f.path!==b.dataset.removeFile);b.parentElement.remove();}};
    setMessage("#editor-message","");openModal("#editor-modal");
  }
  async function saveItem(e){
    e.preventDefault();if(!state.session||!state.client)return;const btn=$("#editor-form button[type=submit]");btn.disabled=true;setMessage("#editor-message","Salvando...");
    try{
      const uploads=[...$("#edit-files").files];for(const file of uploads){const safe=file.name.replace(/[^\w.\-() ]/g,"_");const path=state.session.user.id+"/"+crypto.randomUUID()+"-"+safe;const {error}=await state.client.storage.from("portal-files").upload(path,file,{upsert:false});if(error)throw error;const {data}=state.client.storage.from("portal-files").getPublicUrl(path);state.editingFiles.push({name:file.name,path,url:data.publicUrl,type:file.type,size:file.size});}
      const links=$("#edit-links").value.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{const i=line.indexOf("|");const title=i>=0?line.slice(0,i).trim():"Link";const url=i>=0?line.slice(i+1).trim():line;return {title,url};}).filter(l=>/^https?:\/\//i.test(l.url));
      const payload={kind:$("#edit-kind").value,title:$("#edit-title").value.trim(),summary:$("#edit-summary").value.trim(),body:$("#edit-body").value,video_url:$("#edit-video").value.trim()||null,links,files:state.editingFiles,published:$("#edit-published").checked,updated_at:new Date().toISOString()};
      const id=$("#edit-id").value;const result=id?await state.client.from("portal_content").update(payload).eq("id",id):await state.client.from("portal_content").insert(payload);
      if(result.error)throw result.error;closeModals();toast("Conteúdo salvo!");await loadItems();
    }catch(err){console.error(err);setMessage("#editor-message",err.message||"Não foi possível salvar.");}finally{btn.disabled=false;}
  }
  async function deleteItem(id){const item=state.items.find(x=>x.id===id);if(!item||!confirm('Excluir "'+item.title+'"?'))return;const {error}=await state.client.from("portal_content").delete().eq("id",id);if(error){toast("Erro ao excluir: "+error.message);return;}toast("Conteúdo excluído.");await loadItems();}
  init().catch(err=>{console.error(err);toast("Erro ao iniciar o portal.");});
})();