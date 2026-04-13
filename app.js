/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PayEay Landing â€” App Logic
   Supabase Auth + Database (localStorage fallback)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

var APK_DOWNLOAD_URL = localStorage.getItem('payeay_apk_url') || '';
var APP_VERSION = '2.0.0';
var _currentUser = null;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function $(id) { return document.getElementById(id); }

function showToast(message, duration) {
    duration = duration || 3000;
    var toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.classList.add('hidden'); }, duration);
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH SYSTEM â€” Supabase or localStorage fallback
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function showLogin() {
    $('loginForm').classList.remove('hidden');
    $('registerForm').classList.add('hidden');
    $('authError').classList.add('hidden');
}

function showRegister() {
    $('loginForm').classList.add('hidden');
    $('registerForm').classList.remove('hidden');
    $('authError').classList.add('hidden');
}

function showAuthError(msg) {
    var el = $('authError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

// â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleLogin() {
    var email = $('loginEmail').value.trim();
    var password = $('loginPassword').value;

    if (!email || !password) {
        showAuthError('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ email vÃ  máº­t kháº©u');
        return;
    }

    if (isSupabaseReady()) {
        try {
            var res = await sbClient.auth.signInWithPassword({ email: email, password: password });
            if (res.error) {
                showAuthError(res.error.message === 'Invalid login credentials'
                    ? 'Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng'
                    : res.error.message);
                return;
            }
            var profile = await loadProfile(res.data.user.id);
            var user = {
                id: res.data.user.id,
                email: res.data.user.email,
                name: profile ? profile.name : '',
                phone: profile ? profile.phone : '',
                plan: profile ? profile.plan : 'free'
            };
            _currentUser = user;
            enterApp(user);
        } catch (e) {
            showAuthError('Lá»—i Ä‘Äƒng nháº­p: ' + e.message);
        }
    } else {
        // localStorage fallback
        var users = JSON.parse(localStorage.getItem('payeay_users') || '[]');
        var user = users.find(function(u) { return u.email === email && u.password === password; });
        if (!user) {
            showAuthError('Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng');
            return;
        }
        _currentUser = user;
        localStorage.setItem('payeay_session', JSON.stringify(user));
        enterApp(user);
    }
}

// â”€â”€â”€ Register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleRegister() {
    var name = $('regName').value.trim();
    var email = $('regEmail').value.trim();
    var phone = $('regPhone').value.trim();
    var password = $('regPassword').value;
    var confirmPassword = $('regConfirmPassword').value;

    if (!name || !email || !password) {
        showAuthError('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
        return;
    }
    if (password.length < 6) {
        showAuthError('Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±');
        return;
    }
    if (password !== confirmPassword) {
        showAuthError('Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthError('Email khÃ´ng há»£p lá»‡');
        return;
    }

    if (isSupabaseReady()) {
        try {
            var res = await sbClient.auth.signUp({
                email: email,
                password: password,
                options: { data: { name: name, phone: phone } }
            });
            if (res.error) {
                showAuthError(res.error.message === 'User already registered'
                    ? 'Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½'
                    : res.error.message);
                return;
            }

            // Update profile
            if (res.data.user) {
                await sbClient.from('profiles').upsert({
                    id: res.data.user.id,
                    name: name,
                    phone: phone,
                    plan: 'free'
                });

                var user = {
                    id: res.data.user.id,
                    email: email,
                    name: name,
                    phone: phone,
                    plan: 'free'
                };
                _currentUser = user;
                enterApp(user);
                showToast('ðŸŽ‰ ÄÄƒng kÃ½ thÃ nh cÃ´ng!');
            } else {
                showToast('ðŸ“§ Vui lÃ²ng kiá»ƒm tra email Ä‘á»ƒ xÃ¡c nháº­n tÃ i khoáº£n');
            }
        } catch (e) {
            showAuthError('Lá»—i Ä‘Äƒng kÃ½: ' + e.message);
        }
    } else {
        // localStorage fallback
        var users = JSON.parse(localStorage.getItem('payeay_users') || '[]');
        if (users.find(function(u) { return u.email === email; })) {
            showAuthError('Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½');
            return;
        }
        var newUser = {
            id: Date.now().toString(),
            name: name, email: email, phone: phone,
            password: password,
            createdAt: new Date().toISOString(),
            plan: 'free'
        };
        users.push(newUser);
        localStorage.setItem('payeay_users', JSON.stringify(users));
        localStorage.setItem('payeay_session', JSON.stringify(newUser));
        _currentUser = newUser;
        enterApp(newUser);
        showToast('ðŸŽ‰ ÄÄƒng kÃ½ thÃ nh cÃ´ng!');
    }
}

// â”€â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleLogout() {
    if (isSupabaseReady()) {
        await sbClient.auth.signOut();
    }
    _currentUser = null;
    localStorage.removeItem('payeay_session');
    $('authOverlay').classList.remove('hidden');
    $('mainApp').classList.add('hidden');
    $('loginEmail').value = '';
    $('loginPassword').value = '';
    showLogin();
    showToast('ÄÃ£ Ä‘Äƒng xuáº¥t');
}

// â”€â”€â”€ Load Supabase Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadProfile(userId) {
    if (!isSupabaseReady()) return null;
    try {
        var res = await sbClient.from('profiles').select('*').eq('id', userId).single();
        return res.data;
    } catch (e) { return null; }
}

// â”€â”€â”€ Enter App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function enterApp(user) {
    $('authOverlay').classList.add('hidden');
    $('mainApp').classList.remove('hidden');
    $('userName').textContent = user.name || 'User';
    $('userAvatar').textContent = (user.name || 'U').charAt(0).toUpperCase();

    var setEmailEl = $('setEmail');
    if (setEmailEl) setEmailEl.textContent = user.email;

    loadAllData();
    generateQR();
    generateSettingsQR();
}

async function loadAllData() {
    await loadUserSettings();
    await loadApiKey();
    await loadKeywords();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB NAVIGATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    var target = $('tab-' + tabName);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    var userMenu = $('userMenu');
    if (userMenu) userMenu.classList.add('hidden');
    if (tabName === 'settings') generateSettingsQR();
}

function showProfile() {
    switchTab('settings');
    toggleUserMenu();
}

function toggleUserMenu() {
    var menu = $('userMenu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        setTimeout(function() {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target.id !== 'userAvatar') {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// QR CODE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function generateQR() {
    var container = $('qrCode');
    if (!container || container.childNodes.length > 0) return;
    var qrUrl = APK_DOWNLOAD_URL || window.location.href;
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, { text: qrUrl, width: 104, height: 104, colorDark: '#1e293b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
}

function generateSettingsQR() {
    var container = $('qrCodeSettings');
    if (!container || container.childNodes.length > 0) return;
    var qrUrl = APK_DOWNLOAD_URL || window.location.href;
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, { text: qrUrl, width: 88, height: 88, colorDark: '#1e293b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
    // Also generate sync QR
    generateSyncQR();
}

async function generateSyncQR() {
    var container = $('qrSyncApp');
    if (!container) return;
    container.innerHTML = '';

    // Need Supabase session to generate deep link
    if (!isSupabaseReady() || !sbClient) {
        container.innerHTML = '<p style="color:#94A3B8;font-size:12px;">Cần cấu hình Supabase</p>';
        return;
    }

    try {
        var sessionResult = await sbClient.auth.getSession();
        var session = sessionResult.data.session;
        if (!session) {
            container.innerHTML = '<p style="color:#94A3B8;font-size:12px;">Cần đăng nhập</p>';
            return;
        }

        var deepLink = 'payeay://sync?' +
            'url=' + encodeURIComponent(SUPABASE_URL) +
            '&key=' + encodeURIComponent(SUPABASE_ANON_KEY) +
            '&token=' + encodeURIComponent(session.access_token) +
            '&uid=' + encodeURIComponent(session.user.id) +
            '&email=' + encodeURIComponent(session.user.email || '');

        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: deepLink,
                width: 88,
                height: 88,
                colorDark: '#2196F3',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.L
            });
        }
    } catch (e) {
        console.error('Sync QR error:', e);
        container.innerHTML = '<p style="color:#EF4444;font-size:11px;">Lỗi tạo QR</p>';
    }
}

function downloadAPK() {
    if (APK_DOWNLOAD_URL) {
        window.open(APK_DOWNLOAD_URL, '_blank');
    } else {
        showToast('âš ï¸ Link táº£i APK chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// KEYWORD / WEBHOOK MANAGEMENT â€” Supabase or localStorage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

var editingKeywordId = null;

async function loadKeywords() {
    var keywords = await getKeywords();
    renderKeywordTable(keywords);
}

async function getKeywords() {
    if (!_currentUser) return [];

    if (isSupabaseReady()) {
        try {
            var res = await supabase
                .from('keywords')
                .select('*')
                .eq('user_id', _currentUser.id)
                .order('created_at', { ascending: false });
            if (res.error) throw res.error;
            return (res.data || []).map(function(kw) {
                return {
                    id: kw.id,
                    keyword: kw.keyword,
                    webhookUrl: kw.webhook_url,
                    source: kw.source,
                    submits: kw.submits,
                    lastSubmit: kw.last_submit,
                    active: kw.active,
                    createdAt: kw.created_at
                };
            });
        } catch (e) {
            console.error('Load keywords error:', e);
            return [];
        }
    } else {
        return JSON.parse(localStorage.getItem('payeay_keywords_' + _currentUser.id) || '[]');
    }
}

async function saveKeywordToDb(kwData) {
    if (isSupabaseReady()) {
        var row = {
            user_id: _currentUser.id,
            keyword: kwData.keyword,
            webhook_url: kwData.webhookUrl,
            source: kwData.source || '*',
            active: true
        };
        if (kwData.id) {
            // Update
            var res = await sbClient.from('keywords').update({
                keyword: kwData.keyword,
                webhook_url: kwData.webhookUrl,
                source: kwData.source || '*'
            }).eq('id', kwData.id);
            if (res.error) throw res.error;
        } else {
            // Insert
            var res = await sbClient.from('keywords').insert(row);
            if (res.error) throw res.error;
        }
    } else {
        var keywords = JSON.parse(localStorage.getItem('payeay_keywords_' + _currentUser.id) || '[]');
        if (kwData.id) {
            var idx = keywords.findIndex(function(k) { return k.id === kwData.id; });
            if (idx !== -1) {
                keywords[idx].keyword = kwData.keyword;
                keywords[idx].webhookUrl = kwData.webhookUrl;
                keywords[idx].source = kwData.source;
            }
        } else {
            keywords.push({
                id: Date.now().toString(),
                keyword: kwData.keyword,
                webhookUrl: kwData.webhookUrl,
                source: kwData.source || '*',
                submits: 0, lastSubmit: null, active: true,
                createdAt: new Date().toISOString()
            });
        }
        localStorage.setItem('payeay_keywords_' + _currentUser.id, JSON.stringify(keywords));
    }
}

function renderKeywordTable(keywords) {
    var tbody = $('keywordTableBody');
    var empty = $('keywordEmpty');
    var table = document.querySelector('.keyword-table');
    if (!tbody) return;

    if (!keywords || keywords.length === 0) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (table) table.style.display = 'table';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = keywords.map(function(kw) {
        var statusClass = kw.active !== false ? 'active' : 'paused';
        var statusText = kw.active !== false ? 'Hoáº¡t Ä‘á»™ng' : 'Táº¡m dá»«ng';
        return '<tr>' +
            '<td><span class="kw-badge">' + escapeHtml(kw.keyword) + '</span></td>' +
            '<td><span class="kw-url">' + escapeHtml(kw.webhookUrl) + '</span></td>' +
            '<td><span class="kw-submits">' + (kw.submits || 0) + '</span></td>' +
            '<td>' + (kw.lastSubmit ? new Date(kw.lastSubmit).toLocaleString('vi-VN') : 'â€”') + '</td>' +
            '<td><span class="kw-status ' + statusClass + '">' + statusText + '</span></td>' +
            '<td class="kw-actions"><button class="kw-actions-btn" onclick="toggleActionMenu(this, \'' + kw.id + '\')">â‹®</button></td>' +
        '</tr>';
    }).join('');
}

function toggleActionMenu(btn, kwId) {
    document.querySelectorAll('.kw-actions-menu').forEach(function(m) { m.remove(); });
    var menu = document.createElement('div');
    menu.className = 'kw-actions-menu';
    menu.innerHTML =
        '<button onclick="editKeyword(\'' + kwId + '\')">âœï¸ Sá»­a</button>' +
        '<button onclick="toggleKeywordStatus(\'' + kwId + '\')">â¸ï¸ Báº­t/Táº¯t</button>' +
        '<button class="danger" onclick="deleteKeyword(\'' + kwId + '\')">ðŸ—‘ï¸ XÃ³a</button>';
    btn.parentElement.appendChild(menu);
    setTimeout(function() {
        document.addEventListener('click', function close(e) {
            if (!menu.contains(e.target) && e.target !== btn) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        });
    }, 10);
}

async function openKeywordModal(kwId) {
    editingKeywordId = kwId || null;
    if (kwId) {
        var keywords = await getKeywords();
        var kw = keywords.find(function(k) { return k.id === kwId; });
        if (kw) {
            $('kwKeyword').value = kw.keyword;
            $('kwWebhookUrl').value = kw.webhookUrl;
            $('kwSource').value = kw.source || '*';
            $('modalTitle').textContent = 'Sá»­a Webhook';
        }
    } else {
        $('kwKeyword').value = '';
        $('kwWebhookUrl').value = '';
        $('kwSource').value = '*';
        $('modalTitle').textContent = 'Cáº¥u hÃ¬nh Webhook';
    }
    $('keywordModal').classList.remove('hidden');
}

function closeKeywordModal() {
    $('keywordModal').classList.add('hidden');
    editingKeywordId = null;
}

async function saveKeyword() {
    var keyword = $('kwKeyword').value.trim();
    var webhookUrl = $('kwWebhookUrl').value.trim();
    var source = $('kwSource').value.trim() || '*';

    if (!keyword) { showToast('âš ï¸ Vui lÃ²ng nháº­p keyword'); return; }
    if (!webhookUrl) { showToast('âš ï¸ Vui lÃ²ng nháº­p Webhook URL'); return; }

    try {
        await saveKeywordToDb({
            id: editingKeywordId,
            keyword: keyword,
            webhookUrl: webhookUrl,
            source: source
        });
        await loadKeywords();
        closeKeywordModal();
        showToast('âœ… ÄÃ£ lÆ°u keyword thÃ nh cÃ´ng');
    } catch (e) {
        showToast('âŒ Lá»—i: ' + e.message);
    }
}

async function editKeyword(kwId) {
    document.querySelectorAll('.kw-actions-menu').forEach(function(m) { m.remove(); });
    await openKeywordModal(kwId);
}

async function toggleKeywordStatus(kwId) {
    document.querySelectorAll('.kw-actions-menu').forEach(function(m) { m.remove(); });

    if (isSupabaseReady()) {
        var res = await sbClient.from('keywords').select('active').eq('id', kwId).single();
        if (res.data) {
            await sbClient.from('keywords').update({ active: !res.data.active }).eq('id', kwId);
        }
    } else {
        var keywords = JSON.parse(localStorage.getItem('payeay_keywords_' + _currentUser.id) || '[]');
        var kw = keywords.find(function(k) { return k.id === kwId; });
        if (kw) {
            kw.active = !kw.active;
            localStorage.setItem('payeay_keywords_' + _currentUser.id, JSON.stringify(keywords));
        }
    }
    await loadKeywords();
    showToast('âœ… ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i');
}

async function deleteKeyword(kwId) {
    document.querySelectorAll('.kw-actions-menu').forEach(function(m) { m.remove(); });
    if (!confirm('Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a keyword nÃ y?')) return;

    if (isSupabaseReady()) {
        await sbClient.from('keywords').delete().eq('id', kwId);
    } else {
        var keywords = JSON.parse(localStorage.getItem('payeay_keywords_' + _currentUser.id) || '[]');
        keywords = keywords.filter(function(k) { return k.id !== kwId; });
        localStorage.setItem('payeay_keywords_' + _currentUser.id, JSON.stringify(keywords));
    }
    await loadKeywords();
    showToast('ðŸ—‘ï¸ ÄÃ£ xÃ³a keyword');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BANK SETTINGS â€” Supabase or localStorage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function saveBankSettings() {
    if (!_currentUser) return;

    var bank = {
        bank_name: $('setBankName') ? $('setBankName').value : '',
        account_num: $('setAccountNum') ? $('setAccountNum').value : '',
        account_name: $('setAccountName') ? $('setAccountName').value : ''
    };

    if (isSupabaseReady()) {
        try {
            await sbClient.from('bank_settings').upsert({
                user_id: _currentUser.id,
                bank_name: bank.bank_name,
                account_num: bank.account_num,
                account_name: bank.account_name,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {
            showToast('âŒ Lá»—i: ' + e.message);
            return;
        }
    } else {
        localStorage.setItem('payeay_bank_' + _currentUser.id, JSON.stringify(bank));
    }
    showToast('âœ… ÄÃ£ lÆ°u thÃ´ng tin ngÃ¢n hÃ ng');
}

async function loadUserSettings() {
    if (!_currentUser) return;

    if (isSupabaseReady()) {
        try {
            var res = await sbClient.from('bank_settings').select('*').eq('user_id', _currentUser.id).single();
            if (res.data) {
                if ($('setBankName')) $('setBankName').value = res.data.bank_name || '';
                if ($('setAccountNum')) $('setAccountNum').value = res.data.account_num || '';
                if ($('setAccountName')) $('setAccountName').value = res.data.account_name || '';
            }
        } catch (e) {}
    } else {
        try {
            var bank = JSON.parse(localStorage.getItem('payeay_bank_' + _currentUser.id) || '{}');
            if (bank.bank_name && $('setBankName')) $('setBankName').value = bank.bank_name;
            if (bank.account_num && $('setAccountNum')) $('setAccountNum').value = bank.account_num;
            if (bank.account_name && $('setAccountName')) $('setAccountName').value = bank.account_name;
        } catch (e) {}
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// API KEY MANAGEMENT â€” Supabase or localStorage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function generateApiKeyString() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var key = 'pk_live_';
    for (var i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

async function loadApiKey() {
    if (!_currentUser) return;

    var key = null;
    if (isSupabaseReady()) {
        try {
            var res = await sbClient.from('profiles').select('api_key').eq('id', _currentUser.id).single();
            key = res.data ? res.data.api_key : null;
        } catch (e) {}
    } else {
        key = localStorage.getItem('payeay_apikey_' + _currentUser.id);
    }

    var display = $('apiKeyValue');
    if (!display) return;
    display.textContent = key || 'ChÆ°a cÃ³ API Key â€” nháº¥n "Táº¡o má»›i" Ä‘á»ƒ sinh key';
}

async function regenerateApiKey() {
    if (!_currentUser) return;

    var existing = null;
    if (isSupabaseReady()) {
        var res = await sbClient.from('profiles').select('api_key').eq('id', _currentUser.id).single();
        existing = res.data ? res.data.api_key : null;
    } else {
        existing = localStorage.getItem('payeay_apikey_' + _currentUser.id);
    }

    if (existing) {
        if (!confirm('Táº¡o API key má»›i sáº½ vÃ´ hiá»‡u hÃ³a key cÅ©. Tiáº¿p tá»¥c?')) return;
    }

    var newKey = generateApiKeyString();

    if (isSupabaseReady()) {
        await sbClient.from('profiles').update({ api_key: newKey }).eq('id', _currentUser.id);
    } else {
        localStorage.setItem('payeay_apikey_' + _currentUser.id, newKey);
    }

    $('apiKeyValue').textContent = newKey;
    showToast('ðŸ”‘ ÄÃ£ táº¡o API key má»›i');
}

function copyApiKey() {
    var display = $('apiKeyValue');
    var key = display ? display.textContent : '';
    if (!key || key.indexOf('ChÆ°a cÃ³') !== -1) {
        showToast('âš ï¸ ChÆ°a cÃ³ API Key');
        return;
    }
    copyToClipboard(key);
    showToast('ðŸ“‹ ÄÃ£ copy API Key');
}

function copyText(elementId) {
    var el = $(elementId);
    if (!el) return;
    copyToClipboard(el.textContent);
    showToast('ðŸ“‹ ÄÃ£ copy');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CODE TABS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function switchCodeTab(lang) {
    document.querySelectorAll('.code-tab').forEach(function(tab) { tab.classList.remove('active'); });
    document.querySelectorAll('.code-example').forEach(function(ex) { ex.classList.remove('active'); });

    var tabs = document.querySelectorAll('.code-tab');
    tabs.forEach(function(tab) {
        var txt = tab.textContent.toLowerCase();
        if ((lang === 'curl' && txt === 'curl') ||
            (lang === 'js' && txt === 'javascript') ||
            (lang === 'php' && txt === 'php')) {
            tab.classList.add('active');
        }
    });

    var codeEl = $('code-' + lang);
    if (codeEl) codeEl.classList.add('active');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT â€” Check Supabase session or localStorage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

document.addEventListener('DOMContentLoaded', async function() {
    var sbReady = initSupabase();

    if (sbReady) {
        // Check existing Supabase session
        try {
            var sessionRes = await sbClient.auth.getSession();
            if (sessionRes.data.session) {
                var u = sessionRes.data.session.user;
                var profile = await loadProfile(u.id);
                var user = {
                    id: u.id,
                    email: u.email,
                    name: profile ? profile.name : '',
                    phone: profile ? profile.phone : '',
                    plan: profile ? profile.plan : 'free'
                };
                _currentUser = user;
                enterApp(user);
                return;
            }
        } catch (e) {
            console.error('Session check error:', e);
        }
    } else {
        // localStorage fallback
        var session = localStorage.getItem('payeay_session');
        if (session) {
            try {
                var user = JSON.parse(session);
                _currentUser = user;
                enterApp(user);
                return;
            } catch (e) {}
        }
    }
    // No session â€” show auth overlay (default state)
});

