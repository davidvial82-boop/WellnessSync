// WellnessSync shared data module.
// Handles: local-date keying (no UTC drift), localStorage reads, Netlify Blobs sync.
// Used by: index.html, nutrition.html, history.html, workout.html, recovery.html
var DB = {
  _base: "/.netlify/functions/data",
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
    fetch(this._base + "?key=" + encodeURIComponent(k))
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
    fetch(this._base, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({key: k, value: v})
    })
    .then(function(){ if (cb) cb(true); })
    .catch(function(){ if (cb) cb(false); });
  },

  // ── RECOVERY HELPERS ──────────────────────────────────────
  // Recovery sessions (yoga, stretching, sauna) are stored under
  //   recovery_YYYY-MM-DD  →  [{id, type, name, duration, startTime, endTime, met}]
  // duration is in MINUTES, met is the MET value used for burn calc.
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

  // ── CURRENT WEIGHT (for kcal calcs) ───────────────────────
  // Used by Hub net-calories and workout burn calcs. Falls back to 80kg
  // if nothing has been logged yet.
  currentWeightKg: function(){
    var weights = this.get('weights') || [];
    if (!weights.length) return 80;
    return parseFloat(weights[weights.length - 1].kg) || 80;
  }
};
