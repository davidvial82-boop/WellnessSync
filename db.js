// WellnessSync shared data layer
// Handles localStorage + Netlify Blobs persistence, with correct local-date keying.
//
// IMPORTANT: dayKey() uses LOCAL date, not UTC. Previously this used toISOString()
// which returned UTC date — meaning in Brisbane (UTC+10), every day from midnight
// until 10am was still reading yesterday's UTC-dated keys. That's been fixed.

var DB = {
  _cache: {},
  _base: "/.netlify/functions/data",

  // Returns YYYY-MM-DD in the user's LOCAL timezone.
  // off: integer offset in days (e.g. -1 for yesterday, +1 for tomorrow).
  dayKey: function (off) {
    off = off || 0;
    var d = new Date();
    d.setDate(d.getDate() + off);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  // localStorage get/set (prefixed with dw_ to namespace).
  _ls: function (k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem("dw_" + k) || "null");
      localStorage.setItem("dw_" + k, JSON.stringify(v));
    } catch (e) {
      return null;
    }
  },

  // Synchronous read (localStorage only) if no callback.
  // Async read (localStorage first, then cloud) if callback provided.
  get: function (k, cb) {
    if (!cb) return this._ls(k);
    var self = this;
    var local = this._ls(k);
    fetch(this._base + "?key=" + encodeURIComponent(k))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var val = (d.value !== undefined && d.value !== null) ? d.value : local;
        self._ls(k, val);
        if (cb) cb(val);
      })
      .catch(function () { if (cb) cb(local); });
  },

  // Writes to localStorage immediately, then syncs to cloud.
  set: function (k, v, cb) {
    this._ls(k, v);
    fetch(this._base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: k, value: v })
    })
      .then(function () { if (cb) cb(true); })
      .catch(function () { if (cb) cb(false); });
  }
};
