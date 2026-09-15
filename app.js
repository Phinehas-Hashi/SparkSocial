import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const page = document.body.dataset.page || '';
let me = null;
let meData = {};
const $ = (s, root = document) => root.querySelector(s);
const go = path => location.assign(path);
const displayName = u => u?.displayName || u?.username || 'Spark user';
const initials = n => (n || 'S').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const errorText = e => e?.code ? `${e.code}: ${e.message || 'Request failed.'}` : 'Something went wrong. Please try again.';

function makeAvatar(u, cls = 'avatar') {
  const el = document.createElement('div');
  el.className = cls;
  if (u?.photoURL) {
    const img = document.createElement('img');
    img.src = u.photoURL;
    img.alt = '';
    img.loading = 'lazy';
    el.append(img);
  } else el.textContent = initials(displayName(u));
  return el;
}

function shell() {
  if (!document.querySelector('.topbar')) {
    const header = document.createElement('header');
    header.className = 'topbar';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'home.html';
    brand.innerHTML = '<span>⚡</span> SparkSocial';
    const actions = document.createElement('div');
    actions.className = 'top-actions';
    const bell = document.createElement('a');
    bell.className = 'icon-btn';
    bell.href = 'notifications.html';
    bell.setAttribute('aria-label', 'Notifications');
    bell.textContent = '🔔';
    actions.append(bell);
    header.append(brand, actions);
    document.body.prepend(header);
  }
  if (!document.querySelector('.bottom-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    const current = location.pathname.split('/').pop() || 'home.html';
    const items = [
      ['home.html', '⌂', 'Home'],
      ['discover.html', '✦', 'Discover'],
      ['create.html', '＋', 'Create'],
      ['messages.html', '◇', 'Messages'],
      ['profile.html', '○', 'Profile']
    ];
    for (const [href, icon, label] of items) {
      const a = document.createElement('a');
      a.href = href;
      a.className = href === 'create.html' ? 'nav-create' : `nav-item${current === href ? ' is-active' : ''}`;
      if (href === 'create.html') a.textContent = icon;
      else {
        const span = document.createElement('span');
        span.textContent = icon;
        const small = document.createElement('small');
        small.textContent = label;
        a.append(span, small);
      }
      nav.append(a);
    }
    document.body.append(nav);
  }
}

function showStatus(target, text) {
  if (!target) return;
  target.replaceChildren();
  const box = document.createElement('div');
  box.className = 'status';
  box.textContent = text;
  target.append(box);
}

async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : { uid };
}

function waitForUser() {
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      unsubscribe();
      if (!user) return go('login.html');
      try {
        await user.reload();
        if (!user.emailVerified) return go('verify-email.html');
        me = user;
        meData = await getUser(user.uid);
        resolve(true);
      } catch (e) {
        console.error('SparkSocial boot:', e);
        const root = document.querySelector('.container');
        showStatus(root, `Unable to load your account. ${errorText(e)}`);
        resolve(false);
      }
    });
  });
}

async function notify(recipientId, type, extra = {}) {
  if (!recipientId || recipientId === me.uid) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId, actorId: me.uid, actorName: displayName(meData), type,
      read: false, createdAt: serverTimestamp(), ...extra
    });
  } catch (e) { console.error('notification:', e); }
}

function postCard(id, post) {
  const article = document.createElement('article');
  article.className = 'post';
  const head = document.createElement('div');
  head.className = 'post-head';
  const author = document.createElement('button');
  author.className = 'author';
  author.type = 'button';
  author.append(makeAvatar({ displayName: post.displayName, photoURL: post.photoURL }));
  const info = document.createElement('span');
  info.className = 'author-info';
  const strong = document.createElement('strong');
  strong.textContent = post.displayName || 'Spark user';
  const small = document.createElement('small');
  small.textContent = post.username ? `@${post.username}` : 'SparkSocial';
  info.append(strong, small);
  author.append(info);
  author.onclick = () => post.authorId && go(`profile.html?uid=${encodeURIComponent(post.authorId)}`);
  head.append(author);
  article.append(head);

  const body = document.createElement('div');
  body.className = 'post-body';
  body.textContent = post.text || '';
  article.append(body);

  const actions = document.createElement('div');
  actions.className = 'post-actions';
  const like = document.createElement('button');
  like.className = 'post-action';
  like.type = 'button';
  like.textContent = `♡ ${post.likesCount || 0}`;
  const commentButton = document.createElement('button');
  commentButton.className = 'post-action';
  commentButton.type = 'button';
  commentButton.textContent = `💬 ${post.commentsCount || 0}`;
  actions.append(like, commentButton);
  article.append(actions);

  const comments = document.createElement('div');
  comments.className = 'comments hide';
  const list = document.createElement('div');
  const form = document.createElement('form');
  form.className = 'comment-form';
  const input = document.createElement('input');
  input.maxLength = 500;
  input.placeholder = 'Add a comment…';
  const send = document.createElement('button');
  send.type = 'submit';
  send.textContent = '➤';
  form.append(input, send);
  comments.append(list, form);
  article.append(comments);

  like.onclick = async () => {
    like.disabled = true;
    try {
      const ref = doc(db, 'postLikes', `${id}_${me.uid}`);
      const exists = await getDoc(ref);
      const current = Number(post.likesCount || 0);
      if (exists.exists()) {
        await deleteDoc(ref);
        await updateDoc(doc(db, 'posts', id), { likesCount: increment(-1) });
        like.textContent = `♡ ${Math.max(0, current - 1)}`;
      } else {
        await setDoc(ref, { postId: id, userId: me.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', id), { likesCount: increment(1) });
        like.textContent = `♥ ${current + 1}`;
        await notify(post.authorId, 'liked your Spark', { postId: id });
      }
    } catch (e) { console.error(e); }
    finally { like.disabled = false; }
  };

  commentButton.onclick = () => {
    comments.classList.toggle('hide');
    input.focus();
    if (comments.dataset.loaded) return;
    comments.dataset.loaded = '1';
    const q = query(collection(db, 'posts', id, 'comments'), orderBy('createdAt', 'asc'), limit(50));
    onSnapshot(q, snap => {
      list.replaceChildren();
      snap.forEach(item => {
        const c = item.data();
        const row = document.createElement('div');
        row.className = 'comment';
        row.append(makeAvatar(c, 'avatar'));
        const box = document.createElement('div');
        box.className = 'comment-content';
        const n = document.createElement('strong'); n.textContent = c.displayName || 'Spark user';
        const t = document.createElement('p'); t.textContent = c.text || '';
        box.append(n, t); row.append(box); list.append(row);
      });
    });
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      await addDoc(collection(db, 'posts', id, 'comments'), {
        postId: id, authorId: me.uid, displayName: displayName(meData),
        photoURL: meData.photoURL || me.photoURL || '', text, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', id), { commentsCount: increment(1) });
      await notify(post.authorId, 'commented on your Spark', { postId: id });
      input.value = '';
    } catch (e) { alert(errorText(e)); }
    finally { send.disabled = false; }
  };
  return article;
}

async function home() {
  const first = displayName(meData).split(' ')[0];
  $('#welcome').textContent = `Welcome back, ${first}.`;
  $('#composerAvatar').replaceChildren(makeAvatar(meData));
  const input = $('#postText');
  const count = $('#postCount');
  input.oninput = () => count.textContent = `${input.value.length} / 2000`;
  $('#postForm').onsubmit = async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const button = $('#postSubmit');
    button.disabled = true;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: me.uid, username: meData.username || '', displayName: displayName(meData),
        photoURL: meData.photoURL || me.photoURL || '', type: 'text', text, media: [],
        hashtags: [], mentions: [], location: null, likesCount: 0, commentsCount: 0,
        repostsCount: 0, viewsCount: 0, visibility: 'public', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', me.uid), { postsCount: increment(1), sparkXP: increment(10), updatedAt: serverTimestamp() });
      input.value = ''; count.textContent = '0 / 2000';
    } catch (e) { alert(errorText(e)); }
    finally { button.disabled = false; }
  };
  const feed = $('#feed');
  showStatus(feed, 'Loading your feed…');
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(q, snap => {
    feed.replaceChildren();
    if (snap.empty) return showStatus(feed, 'No sparks yet. Be the first to share one ⚡');
    const fragment = document.createDocumentFragment();
    snap.forEach(item => fragment.append(postCard(item.id, item.data())));
    feed.append(fragment);
  }, e => showStatus(feed, errorText(e)));
}

async function discover() {
  const list = $('#users'), search = $('#search');
  const load = async term => {
    showStatus(list, 'Loading people…');
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(100)));
      const rows = snap.docs.map(x => ({ id: x.id, ...x.data() })).filter(u => u.id !== me.uid).filter(u => !term || `${u.displayName || ''} ${u.username || ''}`.toLowerCase().includes(term.toLowerCase()));
      list.replaceChildren();
      if (!rows.length) return showStatus(list, 'No people found.');
      for (const u of rows) {
        const row = document.createElement('div'); row.className = 'user-row';
        row.append(makeAvatar(u));
        const details = document.createElement('div'); details.className = 'grow';
        const n = document.createElement('strong'); n.textContent = displayName(u);
        const handle = document.createElement('div'); handle.className = 'muted'; handle.textContent = u.username ? `@${u.username}` : 'Spark member';
        details.append(n, handle);
        const button = document.createElement('button'); button.className = 'pill'; button.type = 'button';
        const followRef = doc(db, 'follows', `${me.uid}_${u.id}`);
        button.textContent = (await getDoc(followRef)).exists() ? 'Following' : 'Follow';
        button.onclick = async e => {
          e.stopPropagation(); button.disabled = true;
          try {
            const exists = await getDoc(followRef);
            if (exists.exists()) {
              await deleteDoc(followRef); button.textContent = 'Follow';
            } else {
              await setDoc(followRef, { followerId: me.uid, followingId: u.id, status: 'active', createdAt: serverTimestamp() });
              button.textContent = 'Following'; await notify(u.id, 'followed you');
            }
          } catch (e2) { alert(errorText(e2)); }
          finally { button.disabled = false; }
        };
        row.onclick = () => go(`profile.html?uid=${encodeURIComponent(u.id)}`);
        row.append(details, button); list.append(row);
      }
    } catch (e) { showStatus(list, errorText(e)); }
  };
  search.oninput = () => load(search.value.trim());
  load('');
}

async function create() {
  const form = $('#createForm'), out = $('#createStatus');
  form.onsubmit = async e => {
    e.preventDefault();
    const text = $('#createText').value.trim();
    if (!text) { out.className = 'error'; out.textContent = 'Write something first.'; return; }
    const button = $('#createButton'); button.disabled = true;
    try {
      await addDoc(collection(db, 'posts'), { authorId: me.uid, username: meData.username || '', displayName: displayName(meData), photoURL: meData.photoURL || me.photoURL || '', type: 'text', text, media: [], hashtags: [], mentions: [], location: null, likesCount: 0, commentsCount: 0, repostsCount: 0, viewsCount: 0, visibility: 'public', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'users', me.uid), { postsCount: increment(1), sparkXP: increment(10), updatedAt: serverTimestamp() });
      form.reset(); out.className = 'notice'; out.textContent = 'Your Spark is live ⚡';
    } catch (e) { out.className = 'error'; out.textContent = errorText(e); }
    finally { button.disabled = false; }
  };
}

async function profile() {
  const uid = new URLSearchParams(location.search).get('uid') || me.uid;
  const p = await getUser(uid);
  $('#profileName').textContent = displayName(p);
  $('#profileUsername').textContent = p.username ? `@${p.username}` : '';
  $('#profileBio').textContent = p.bio || 'No bio yet.';
  $('#followers').textContent = p.followersCount || 0;
  $('#following').textContent = p.followingCount || 0;
  $('#posts').textContent = p.postsCount || 0;
  $('#profileAvatar').replaceChildren(makeAvatar(p, 'avatar profile-avatar'));
  const own = uid === me.uid;
  $('#editProfile').classList.toggle('hide', !own);
  $('#profileFollow').classList.toggle('hide', own);
  $('#profileMessage').classList.toggle('hide', own);
  if (!own) {
    $('#profileMessage').href = `messages.html?user=${encodeURIComponent(uid)}`;
    const follow = $('#profileFollow');
    const ref = doc(db, 'follows', `${me.uid}_${uid}`);
    follow.textContent = (await getDoc(ref)).exists() ? 'Following' : 'Follow';
    follow.onclick = async () => {
      follow.disabled = true;
      try {
        const exists = await getDoc(ref);
        if (exists.exists()) { await deleteDoc(ref); follow.textContent = 'Follow'; }
        else { await setDoc(ref, { followerId: me.uid, followingId: uid, status: 'active', createdAt: serverTimestamp() }); follow.textContent = 'Following'; await notify(uid, 'followed you'); }
      } catch (e) { alert(errorText(e)); }
      finally { follow.disabled = false; }
    };
  }
  const feed = $('#profileFeed');
  const q = query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(q, snap => {
    feed.replaceChildren();
    if (snap.empty) return showStatus(feed, 'No sparks yet.');
    snap.forEach(item => feed.append(postCard(item.id, item.data())));
  }, e => showStatus(feed, errorText(e)));
}

async function notifications() {
  const list = $('#notificationList');
  showStatus(list, 'Loading notifications…');
  const q = query(collection(db, 'notifications'), where('recipientId', '==', me.uid), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(q, snap => {
    list.replaceChildren();
    if (snap.empty) return showStatus(list, 'You are all caught up ✨');
    snap.forEach(item => { const n = item.data(); const row = document.createElement('div'); row.className = 'user-row'; row.textContent = `${n.actorName || 'Someone'} ${n.type || 'activity'}.`; list.append(row); });
  }, e => showStatus(list, errorText(e)));
}

async function settings() {
  $('#settingsName').textContent = displayName(meData);
  $('#settingsEmail').textContent = me.email || '';
  $('#logout').onclick = async () => { await signOut(auth); go('login.html'); };
}

async function searchPage() {
  const form = $('#searchForm'), out = $('#searchResults');
  form.onsubmit = async e => {
    e.preventDefault(); const term = $('#query').value.trim().toLowerCase();
    if (!term) return showStatus(out, 'Type something to search.');
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(100)));
      const rows = snap.docs.map(x => ({ id: x.id, ...x.data() })).filter(u => (u.usernameLower || '').includes(term) || (u.displayNameLower || '').includes(term));
      out.replaceChildren(); rows.forEach(u => { const a = document.createElement('a'); a.href = `profile.html?uid=${u.id}`; a.className = 'user-row'; a.append(makeAvatar(u)); const d = document.createElement('div'); d.className = 'grow'; d.textContent = `${displayName(u)} ${u.username ? '@' + u.username : ''}`; a.append(d); out.append(a); });
      if (!rows.length) showStatus(out, 'No matching people found.');
    } catch (e2) { showStatus(out, errorText(e2)); }
  };
}

async function live() {
  const list = $('#liveList'); showStatus(list, 'Loading live sessions…');
  const q = query(collection(db, 'liveSessions'), where('status', '==', 'live'), orderBy('startedAt', 'desc'), limit(30));
  onSnapshot(q, snap => { list.replaceChildren(); if (snap.empty) return showStatus(list, 'No one is live right now.'); snap.forEach(x => { const l = x.data(); const a = document.createElement('a'); a.href = `live.html?id=${x.id}`; a.className = 'live-card'; const strong = document.createElement('strong'); strong.textContent = l.title || 'Spark Live'; const p = document.createElement('div'); p.className = 'muted'; p.textContent = `🔴 ${l.viewerCount || 0} watching`; a.append(strong, p); list.append(a); }); }, e => showStatus(list, errorText(e)));
}

async function creator() {
  $('#creatorName').textContent = displayName(meData);
  $('#creatorXP').textContent = meData.sparkXP || 0;
  $('#creatorLevel').textContent = meData.sparkLevel || 1;
  $('#creatorFollowers').textContent = meData.followersCount || 0;
  $('#creatorPosts').textContent = meData.postsCount || 0;
  $('#enableCreator').onclick = async () => { try { await setDoc(doc(db, 'creatorProfiles', me.uid), { userId: me.uid, enabled: true, category: 'General', description: '', totalViews: 0, totalLikes: 0, totalLiveSessions: 0, totalLiveMinutes: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); alert('Creator mode enabled ✨'); } catch (e) { alert(errorText(e)); } };
}

shell();
waitForUser().then(ok => {
  if (!ok) return;
  const pages = { home, discover, create, profile, notifications, settings, search: searchPage, live, creator };
  const run = pages[page];
  if (run) run().catch(e => { console.error(e); showStatus(document.querySelector('.container'), errorText(e)); });
});
