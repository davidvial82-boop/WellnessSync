// WellnessSync shared data module.
// Handles: local-date keying (no UTC drift), localStorage reads, Netlify Blobs sync,
//          and PER-PROFILE namespacing (added for Dave + Heath multi-user).
// Used by: index.html, nutrition.html, history.html, workout.html, recovery.html, athlete.html
var DB = {
  _base: "/.netlify/functions/data",

  // ── PROFILES ──────────────────────────────────────────────
  // Two people, one shared blob store, no accounts. Each device picks a
  // profile; every data key is namespaced by it. Dave is the LEGACY profile
  // and stays UNPREFIXED so all pre-existing data keeps working untouched.
  // Other profiles (Heath) get an "id::" prefix, so datasets never collide.
  PROFILES: [{id:'dave', name:'Dave'}, {id:'heath', name:'Heath'}],
  getProfile: function(){
    try { return localStorage.getItem('dw_active_profile') || 'dave'; }
    catch(e){ return 'dave'; }
  },
  setProfile: function(id){
    try { localStorage.setItem('dw_active_profile', id); } catch(e){}
  },
  profileName: function(id){
    id = id || this.getProfile();
    for (var i=0;i<this.PROFILES.length;i++) if (this.PROFILES[i].id===id) return this.PROFILES[i].name;
    return id;
  },
  // Namespace a logical key for the active profile.
  _k: function(k){
    if (k === 'active_profile') return k;      // never namespace the pointer itself
    var p = this.getProfile();
    return (p === 'dave' ? '' : p + '::') + k;
  },

  // Returns YYYY-MM-DD in LOCAL time (not UTC). This was the bug yesterday —
  // toISOString() returns UTC, which in Brisbane (UTC+10) meant the Hub was
  // reading yesterday's key until 10am local time.
  dayKey: function(off){
    off = off || 0;
    var d = new Date();
    d.setDate(d.getDate() + off);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  },
  // Convert a Date object to a local dayKey (used by history.html when
  // iterating back through past days).
  dateToKey: function(d){
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  },
  _ls: function(k, v){
    k = this._k(k);
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem("dw_" + k) || "null");
      localStorage.setItem("dw_" + k, JSON.stringify(v));
    } catch(e) { return null; }
  },
  // Synchronous read (localStorage only) if no callback. Async cloud+local merge if callback.
  get: function(k, cb){
    if (!cb) return this._ls(k);
    var self = this;
    var local = this._ls(k);
    var ck = this._k(k);
    fetch(this._base + "?key=" + encodeURIComponent(ck))
      .then(function(r){ return r.json(); })
      .then(function(d){
        var val = (d.value !== undefined && d.value !== null) ? d.value : local;
        self._ls(k, val);
        if (cb) cb(val);
      })
      .catch(function(){ if (cb) cb(local); });
  },
  set: function(k, v, cb){
    this._ls(k, v);
    var ck = this._k(k);
    fetch(this._base, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({key: ck, value: v})
    })
    .then(function(){ if (cb) cb(true); })
    .catch(function(){ if (cb) cb(false); });
  },

  // Read ANOTHER profile's key straight from the cloud (read-only, not cached
  // locally). Used by the coach view so Dave's phone can see Heath's training.
  getForProfile: function(profileId, k, cb){
    var pref = (profileId === 'dave' ? '' : profileId + '::');
    fetch(this._base + "?key=" + encodeURIComponent(pref + k))
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(d && d.value !== undefined ? d.value : null); })
      .catch(function(){ cb(null); });
  },

  // ── RECOVERY HELPERS ──────────────────────────────────────
  getRecovery: function(key){
    key = key || this.dayKey();
    return this.get('recovery_' + key) || [];
  },
  addRecoverySession: function(session){
    var key = this.dayKey();
    var list = this.getRecovery(key);
    list.push(session);
    this.set('recovery_' + key, list);
    return list;
  },

  // ── JOURNAL HELPERS ───────────────────────────────────────
  getJournal: function(key){
    key = key || this.dayKey();
    return this.get('journal_' + key) || null;
  },
  saveJournalEntry: function(entry, key){
    key = key || this.dayKey();
    entry.time = entry.time || new Date().toISOString();
    this.set('journal_' + key, entry);
    return entry;
  },

  // ── CURRENT WEIGHT (for kcal calcs) ───────────────────────
  currentWeightKg: function(){
    var weights = this.get('weights') || [];
    if (!weights.length) return 80;
    return parseFloat(weights[weights.length - 1].kg) || 80;
  }
};
