import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const page = document.body.dataset.page || '';
let me = null;
let meData = {};
const $ = (selector, root = document) => root.querySelector(selector);
const go = path => location.assign(path);
const displayName = user => user?.displayName || user?.username || 'Spark user';
const initials = value => (value || 'S').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const errorText = error => error?.code ? `${error.code}: ${error.message || 'Request failed.'}` : (error?.message || 'Something went wrong. Please try again.');

function avatar(user, className = 'avatar') {
  const el = document.createElement('div');
  el.className = className;
  if (user?.photoURL) {
    const image = document.createElement('img');
    image.src = user.photoURL;
    image.alt = '';
    image.loading = 'lazy';
    el.append(image);
  } else {
    el.textContent = initials(displayName(user));
  }
  return el;
}

function status(target, message, kind = 'status') {
  if (!target) return;
  target.replaceChildren();
  const box = document.createElement('div');
  box.className = kind;
  box.textContent = message;
  target.append(box);
}

function shell() {
  if (!document.querySelector('.topbar')) {
    const header = document.createElement('header');
    header.className = 'topbar';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'home.html';
    brand.textContent = '⚡ SparkSocial';
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
      const link = document.createElement('a');
      link.href = href;
      link.className = href === 'create.html' ? 'nav-create' : `nav-item${current === href ? ' is-active' : ''}`;
      if (href === 'create.html') {
        link.textContent = icon;
        link.setAttribute('aria-label', label);
      } else {
        const symbol = document.createElement('span');
        symbol.textContent = icon;
        const text = document.createElement('small');
        text.textContent = label;
        link.append(symbol, text);
      }
      nav.append(link);
    }
    document.body.append(nav);
  }
}

async function getUser(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? { uid, ...snapshot.data() } : { uid };
}

function requireElements(...selectors) {
  for (const selector of selectors) {
    if (!$(selector)) throw new Error(`Missing page element: ${selector}`);
  }
}

function waitForVerifiedUser() {
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      unsubscribe();
      if (!user) {
        go('login.html');
        return;
      }
      try {
        await user.reload();
        if (!user.emailVerified) {
          go('verify-email.html');
          return;
        }
        me = auth.currentUser;
        meData = await getUser(me.uid);
        resolve(true);
      } catch (error) {
        console.error('SparkSocial boot error:', error);
        status(document.querySelector('.container'), `Unable to load your account: ${errorText(error)}`, 'error');
        resolve(false);
      }
    });
  });
}

async function notify(recipientId, type, extra = {}) {
  if (!recipientId || recipientId === me.uid) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      actorId: me.uid,
      actorName: displayName(meData),
      type,
      read: false,
      createdAt: serverTimestamp(),
      ...extra
    });
  } catch (error) {
    console.warn('Notification skipped:', error);
  }
}

async function getPostCounts(postId) {
  const [likes, comments] = await Promise.all([
    getCountFromServer(query(collection(db, 'postLikes'), where('postId', '==', postId))),
    getCountFromServer(collection(db, 'posts', postId, 'comments'))
  ]);
  return { likes: likes.data().count, comments: comments.data().count };
}

function postCard(id, post) {
  const article = document.createElement('article');
  article.className = 'post';

  const head = document.createElement('div');
  head.className = 'post-head';
  const author = document.createElement('button');
  author.className = 'author';
  author.type = 'button';
  author.append(avatar(post));
  const info = document.createElement('span');
  info.className = 'author-info';
  const name = document.createElement('strong');
  name.textContent = displayName(post);
  const handle = document.createElement('small');
  handle.textContent = post.username ? `@${post.username}` : 'SparkSocial';
  info.append(name, handle);
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
  const commentButton = document.createElement('button');
  commentButton.className = 'post-action';
  commentButton.type = 'button';
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
  input.autocomplete = 'off';
  const send = document.createElement('button');
  send.type = 'submit';
  send.textContent = '➤';
  form.append(input, send);
  comments.append(list, form);
  article.append(comments);

  const likeRef = doc(db, 'postLikes', `${id}_${me.uid}`);
  let counts = { likes: Number(post.likesCount || 0), comments: Number(post.commentsCount || 0) };
  const renderCounts = () => {
    like.textContent = `${like.classList.contains('active') ? '♥' : '♡'} ${counts.likes}`;
    commentButton.textContent = `💬 ${counts.comments}`;
  };

  Promise.all([getDoc(likeRef), getPostCounts(id)]).then(([liked, freshCounts]) => {
    like.classList.toggle('active', liked.exists());
    counts = freshCounts;
    renderCounts();
  }).catch(() => renderCounts());

  like.onclick = async () => {
    like.disabled = true;
    try {
      const existing = await getDoc(likeRef);
      if (existing.exists()) {
        await deleteDoc(likeRef);
        like.classList.remove('active');
      } else {
        await setDoc(likeRef, { postId: id, userId: me.uid, createdAt: serverTimestamp() });
        like.classList.add('active');
        await notify(post.authorId, 'liked your Spark', { postId: id });
      }
      counts = await getPostCounts(id);
      renderCounts();
    } catch (error) {
      alert(errorText(error));
    } finally {
      like.disabled = false;
    }
  };

  commentButton.onclick = () => {
    comments.classList.toggle('hide');
    input.focus();
    if (comments.dataset.loaded) return;
    comments.dataset.loaded = '1';
    const q = query(collection(db, 'posts', id, 'comments'), orderBy('createdAt', 'asc'), limit(50));
    onSnapshot(q, snapshot => {
      list.replaceChildren();
      snapshot.forEach(item => {
        const comment = item.data();
        const row = document.createElement('div');
        row.className = 'comment';
        row.append(avatar(comment));
        const box = document.createElement('div');
        box.className = 'comment-content';
        const authorName = document.createElement('strong');
        authorName.textContent = displayName(comment);
        const text = document.createElement('p');
        text.textContent = comment.text || '';
        box.append(authorName, text);
        row.append(box);
        list.append(row);
      });
      counts.comments = snapshot.size;
      renderCounts();
    }, error => status(list, errorText(error), 'error'));
  };

  form.onsubmit = async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      await addDoc(collection(db, 'posts', id, 'comments'), {
        postId: id,
        authorId: me.uid,
        displayName: displayName(meData),
        username: meData.username || '',
        photoURL: meData.photoURL || me.photoURL || '',
        text,
        createdAt: serverTimestamp()
      });
      input.value = '';
      await notify(post.authorId, 'commented on your Spark', { postId: id });
      counts = await getPostCounts(id);
      renderCounts();
    } catch (error) {
      alert(errorText(error));
    } finally {
      send.disabled = false;
    }
  };
  return article;
}

async function createPost(text) {
  return addDoc(collection(db, 'posts'), {
    authorId: me.uid,
    username: meData.username || '',
    displayName: displayName(meData),
    photoURL: meData.photoURL || me.photoURL || '',
    type: 'text',
    text,
    media: [],
    hashtags: [],
    mentions: [],
    location: null,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    viewsCount: 0,
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function home() {
  requireElements('#welcome', '#composerAvatar', '#postForm', '#postText', '#postCount', '#postSubmit', '#feed');
  $('#welcome').textContent = `Welcome back, ${displayName(meData).split(' ')[0]}.`;
  $('#composerAvatar').replaceChildren(avatar(meData));
  const input = $('#postText');
  const count = $('#postCount');
  const button = $('#postSubmit');
  input.oninput = () => { count.textContent = `${input.value.length} / 2000`; };
  $('#postForm').onsubmit = async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    button.disabled = true;
    try {
      await createPost(text);
      input.value = '';
      count.textContent = '0 / 2000';
    } catch (error) {
      alert(errorText(error));
    } finally {
      button.disabled = false;
    }
  };
  const feed = $('#feed');
  status(feed, 'Loading your feed…');
  const feedQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(feedQuery, snapshot => {
    feed.replaceChildren();
    if (snapshot.empty) return status(feed, 'No sparks yet. Be the first to share one ⚡');
    const fragment = document.createDocumentFragment();
    snapshot.forEach(item => fragment.append(postCard(item.id, item.data())));
    feed.append(fragment);
  }, error => status(feed, errorText(error), 'error'));
}

async function discover() {
  requireElements('#users', '#search');
  const list = $('#users');
  const search = $('#search');
  let users = [];
  try {
    const snapshot = await getDocs(query(collection(db, 'users'), limit(100)));
    users = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(user => user.id !== me.uid);
  } catch (error) {
    return status(list, errorText(error), 'error');
  }
  const render = async term => {
    const normalized = term.toLowerCase();
    const rows = users.filter(user => `${user.displayName || ''} ${user.username || ''}`.toLowerCase().includes(normalized));
    list.replaceChildren();
    if (!rows.length) return status(list, 'No people found.');
    for (const user of rows) {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.append(avatar(user));
      const details = document.createElement('div');
      details.className = 'grow';
      const name = document.createElement('strong'); name.textContent = displayName(user);
      const handle = document.createElement('div'); handle.className = 'muted'; handle.textContent = user.username ? `@${user.username}` : 'Spark member';
      details.append(name, handle);
      const button = document.createElement('button');
      button.className = 'pill'; button.type = 'button';
      const followRef = doc(db, 'follows', `${me.uid}_${user.id}`);
      try { button.textContent = (await getDoc(followRef)).exists() ? 'Following' : 'Follow'; } catch { button.textContent = 'Follow'; }
      button.onclick = async event => {
        event.stopPropagation(); button.disabled = true;
        try {
          const existing = await getDoc(followRef);
          if (existing.exists()) {
            await deleteDoc(followRef);
            button.textContent = 'Follow';
          } else {
            await setDoc(followRef, { followerId: me.uid, followingId: user.id, status: 'active', createdAt: serverTimestamp() });
            button.textContent = 'Following';
            await notify(user.id, 'followed you');
          }
        } catch (error) { alert(errorText(error)); }
        finally { button.disabled = false; }
      };
      row.onclick = () => go(`profile.html?uid=${encodeURIComponent(user.id)}`);
      row.append(details, button);
      list.append(row);
    }
  };
  search.oninput = () => render(search.value.trim());
  render('');
}

async function create() {
  requireElements('#createForm', '#createText', '#createButton', '#createStatus');
  const form = $('#createForm');
  const output = $('#createStatus');
  form.onsubmit = async event => {
    event.preventDefault();
    const text = $('#createText').value.trim();
    if (!text) return status(output, 'Write something first.', 'error');
    $('#createButton').disabled = true;
    try {
      await createPost(text);
      form.reset();
      status(output, 'Your Spark is live ⚡', 'notice');
    } catch (error) {
      status(output, errorText(error), 'error');
    } finally {
      $('#createButton').disabled = false;
    }
  };
}

async function profile() {
  requireElements('#profileName', '#profileUsername', '#profileBio', '#followers', '#following', '#posts', '#profileAvatar', '#profileFollow', '#profileMessage', '#editProfile', '#profileFeed');
  const uid = new URLSearchParams(location.search).get('uid') || me.uid;
  const user = await getUser(uid);
  $('#profileName').textContent = displayName(user);
  $('#profileUsername').textContent = user.username ? `@${user.username}` : '';
  $('#profileBio').textContent = user.bio || 'No bio yet.';
  $('#profileAvatar').replaceChildren(avatar(user, 'avatar profile-avatar'));
  $('#editProfile').classList.toggle('hide', uid !== me.uid);
  $('#profileFollow').classList.toggle('hide', uid === me.uid);
  $('#profileMessage').classList.toggle('hide', uid === me.uid);

  const [followers, following, posts] = await Promise.all([
    getCountFromServer(query(collection(db, 'follows'), where('followingId', '==', uid))),
    getCountFromServer(query(collection(db, 'follows'), where('followerId', '==', uid))),
    getCountFromServer(query(collection(db, 'posts'), where('authorId', '==', uid)))
  ]);
  $('#followers').textContent = followers.data().count;
  $('#following').textContent = following.data().count;
  $('#posts').textContent = posts.data().count;

  if (uid !== me.uid) {
    $('#profileMessage').href = `messages.html?user=${encodeURIComponent(uid)}`;
    const follow = $('#profileFollow');
    const followRef = doc(db, 'follows', `${me.uid}_${uid}`);
    follow.textContent = (await getDoc(followRef)).exists() ? 'Following' : 'Follow';
    follow.onclick = async () => {
      follow.disabled = true;
      try {
        const existing = await getDoc(followRef);
        if (existing.exists()) { await deleteDoc(followRef); follow.textContent = 'Follow'; }
        else { await setDoc(followRef, { followerId: me.uid, followingId: uid, status: 'active', createdAt: serverTimestamp() }); follow.textContent = 'Following'; await notify(uid, 'followed you'); }
      } catch (error) { alert(errorText(error)); }
      finally { follow.disabled = false; }
    };
  }

  const feed = $('#profileFeed');
  const postsQuery = query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(postsQuery, snapshot => {
    feed.replaceChildren();
    if (snapshot.empty) return status(feed, 'No sparks yet.');
    snapshot.forEach(item => feed.append(postCard(item.id, item.data())));
  }, error => status(feed, errorText(error), 'error'));
}

async function notifications() {
  requireElements('#notificationList');
  const list = $('#notificationList');
  status(list, 'Loading notifications…');
  const q = query(collection(db, 'notifications'), where('recipientId', '==', me.uid), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(q, snapshot => {
    list.replaceChildren();
    if (snapshot.empty) return status(list, 'You are all caught up ✨');
    snapshot.forEach(item => {
      const notification = item.data();
      const row = document.createElement('div');
      row.className = 'user-row';
      row.textContent = `${notification.actorName || 'Someone'} ${notification.type || 'activity'}.`;
      list.append(row);
    });
  }, error => status(list, errorText(error), 'error'));
}

async function settings() {
  requireElements('#settingsName', '#settingsEmail', '#logout');
  $('#settingsName').textContent = displayName(meData);
  $('#settingsEmail').textContent = me.email || '';
  $('#logout').onclick = async () => { await signOut(auth); go('login.html'); };
}

async function searchPage() {
  requireElements('#searchForm', '#query', '#searchResults');
  const form = $('#searchForm');
  const output = $('#searchResults');
  form.onsubmit = async event => {
    event.preventDefault();
    const term = $('#query').value.trim().toLowerCase();
    if (!term) return status(output, 'Type something to search.');
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), limit(100)));
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(user => (user.usernameLower || '').includes(term) || (user.displayNameLower || '').includes(term));
      output.replaceChildren();
      rows.forEach(user => {
        const link = document.createElement('a');
        link.href = `profile.html?uid=${encodeURIComponent(user.id)}`;
        link.className = 'user-row';
        link.append(avatar(user));
        const details = document.createElement('div'); details.className = 'grow'; details.textContent = `${displayName(user)}${user.username ? ` @${user.username}` : ''}`;
        link.append(details); output.append(link);
      });
      if (!rows.length) status(output, 'No matching people found.');
    } catch (error) { status(output, errorText(error), 'error'); }
  };
}

async function editProfile() {
  requireElements('#editForm', '#name', '#bio', '#save', '#status');
  const user = await getUser(me.uid);
  $('#name').value = user.displayName || me.displayName || '';
  $('#bio').value = user.bio || '';
  $('#editForm').onsubmit = async event => {
    event.preventDefault();
    const name = $('#name').value.trim();
    const bio = $('#bio').value.trim();
    if (name.length < 2) return status($('#status'), 'Display name is too short.', 'error');
    $('#save').disabled = true;
    try {
      await updateProfile(me, { displayName: name });
      await updateDoc(doc(db, 'users', me.uid), { displayName: name, displayNameLower: name.toLowerCase(), bio, updatedAt: serverTimestamp() });
      meData = { ...meData, displayName: name, bio };
      status($('#status'), 'Profile updated ✨', 'notice');
    } catch (error) { status($('#status'), errorText(error), 'error'); }
    finally { $('#save').disabled = false; }
  };
}

function conversationId(a, b) { return [a, b].sort().join('_'); }

async function messages() {
  requireElements('#conversationList', '#chatPanel', '#chatName', '#chatBox', '#messageForm', '#messageInput', '#closeChat');
  const list = $('#conversationList');
  const panel = $('#chatPanel');
  const selectedUid = new URLSearchParams(location.search).get('user');
  let stopMessages = null;

  const openChat = async uid => {
    if (!uid || uid === me.uid) return;
    const other = await getUser(uid);
    $('#chatName').textContent = displayName(other);
    $('#chatStatus').textContent = other.username ? `@${other.username}` : 'Private chat';
    panel.classList.remove('hide');
    if (stopMessages) stopMessages();

    const id = conversationId(me.uid, uid);
    const conversationRef = doc(db, 'conversations', id);
    const messagesQuery = query(collection(db, 'conversations', id, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    stopMessages = onSnapshot(messagesQuery, snapshot => {
      const box = $('#chatBox');
      box.replaceChildren();
      snapshot.forEach(item => {
        const message = item.data();
        const bubble = document.createElement('div');
        bubble.className = message.senderId === me.uid ? 'message mine' : 'message';
        bubble.textContent = message.text || '';
        box.append(bubble);
      });
      box.scrollTop = box.scrollHeight;
    }, error => status($('#chatBox'), errorText(error), 'error'));

    $('#messageForm').onsubmit = async event => {
      event.preventDefault();
      const input = $('#messageInput');
      const text = input.value.trim();
      if (!text) return;
      const send = event.submitter || $('#messageForm button');
      send.disabled = true;
      try {
        const existing = await getDoc(conversationRef);
        if (!existing.exists()) {
          await setDoc(conversationRef, { participantIds: [me.uid, uid], createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastMessage: text, lastMessageSenderId: me.uid });
        } else {
          await updateDoc(conversationRef, { lastMessage: text, lastMessageSenderId: me.uid, updatedAt: serverTimestamp() });
        }
        await addDoc(collection(db, 'conversations', id, 'messages'), { senderId: me.uid, text, type: 'text', createdAt: serverTimestamp() });
        input.value = '';
      } catch (error) { alert(errorText(error)); }
      finally { send.disabled = false; }
    };
  };

  $('#closeChat').onclick = () => {
    if (stopMessages) stopMessages();
    stopMessages = null;
    panel.classList.add('hide');
    history.replaceState({}, '', 'messages.html');
  };

  const conversationsQuery = query(collection(db, 'conversations'), where('participantIds', 'array-contains', me.uid), orderBy('updatedAt', 'desc'), limit(50));
  onSnapshot(conversationsQuery, async snapshot => {
    list.replaceChildren();
    if (snapshot.empty) return status(list, 'No conversations yet. Open someone’s profile to start a chat.');
    for (const item of snapshot.docs) {
      const data = item.data();
      const uid = (data.participantIds || []).find(id => id !== me.uid);
      if (!uid) continue;
      const user = await getUser(uid);
      const row = document.createElement('button'); row.type = 'button'; row.className = 'user-row';
      row.append(avatar(user));
      const details = document.createElement('div'); details.className = 'grow';
      const name = document.createElement('strong'); name.textContent = displayName(user);
      const preview = document.createElement('div'); preview.className = 'muted'; preview.textContent = data.lastMessage || 'No messages yet.';
      details.append(name, preview); row.append(details);
      row.onclick = () => openChat(uid);
      list.append(row);
    }
  }, error => status(list, errorText(error), 'error'));

  if (selectedUid) await openChat(selectedUid);
}

async function live() {
  requireElements('#liveList');
  const list = $('#liveList');
  status(list, 'Loading live sessions…');
  const q = query(collection(db, 'liveSessions'), where('status', '==', 'live'), orderBy('startedAt', 'desc'), limit(30));
  onSnapshot(q, snapshot => {
    list.replaceChildren();
    if (snapshot.empty) return status(list, 'No one is live right now.');
    snapshot.forEach(item => {
      const liveSession = item.data();
      const link = document.createElement('a');
      link.href = `live.html?id=${item.id}`;
      link.className = 'live-card';
      const title = document.createElement('strong'); title.textContent = liveSession.title || 'Spark Live';
      const viewers = document.createElement('div'); viewers.className = 'muted'; viewers.textContent = `🔴 ${liveSession.viewerCount || 0} watching`;
      link.append(title, viewers); list.append(link);
    });
  }, error => status(list, errorText(error), 'error'));
}

async function creator() {
  requireElements('#creatorName', '#creatorXP', '#creatorLevel', '#creatorFollowers', '#creatorPosts', '#enableCreator');
  $('#creatorName').textContent = displayName(meData);
  $('#creatorXP').textContent = meData.sparkXP || 0;
  $('#creatorLevel').textContent = meData.sparkLevel || 1;

  const [followers, posts, creatorProfile] = await Promise.all([
    getCountFromServer(query(collection(db, 'follows'), where('followingId', '==', me.uid))),
    getCountFromServer(query(collection(db, 'posts'), where('authorId', '==', me.uid))),
    getDoc(doc(db, 'creatorProfiles', me.uid))
  ]);
  $('#creatorFollowers').textContent = followers.data().count;
  $('#creatorPosts').textContent = posts.data().count;

  const button = $('#enableCreator');
  if (creatorProfile.exists() && creatorProfile.data().enabled === true) {
    button.textContent = 'Creator Mode Enabled';
    button.disabled = true;
  }

  button.onclick = async () => {
    button.disabled = true;
    try {
      await setDoc(doc(db, 'creatorProfiles', me.uid), { userId: me.uid, enabled: true, category: 'General', description: '', totalViews: 0, totalLikes: 0, totalLiveSessions: 0, totalLiveMinutes: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      button.textContent = 'Creator Mode Enabled';
      status(document.querySelector('.container'), 'Creator mode enabled ✨', 'notice');
    } catch (error) {
      status(document.querySelector('.container'), errorText(error), 'error');
      button.disabled = false;
    }
  };
}

const pages = { home, discover, create, profile, notifications, settings, search: searchPage, editProfile, messages, live, creator };

shell();
waitForVerifiedUser().then(ok => {
  if (!ok) return;
  const handler = pages[page];
  if (handler) handler().catch(error => {
    console.error(`SparkSocial ${page}:`, error);
    status(document.querySelector('.container'), errorText(error), 'error');
  });
});