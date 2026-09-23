// storage.js — reemplaza claude.use("db") por una base de datos local real (IndexedDB).
// Implementa el mismo API estilo Firestore que ya usa la app (collection/doc/
// add/update/delete/onSnapshot) para que el resto del código no tenga que cambiar.
// También sincroniza entre pestañas abiertas del mismo navegador via BroadcastChannel.

var LocalDB = (function () {
  var IDB_NAME = 'control-moto-db';
  var IDB_VERSION = 1;
  var STORES = ['entries', 'platforms', 'settings'];
  var dbPromise = null;
  var listeners = {}; // storeName -> [ {cb, errCb, orderField, orderDir, limitN, single, docId} ]
  var bc = null;

  try { bc = new BroadcastChannel('control-moto-sync'); } catch (e) { bc = null; }

  function openIDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB no disponible')); return; }
      var req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = function (e) {
        var idb = e.target.result;
        STORES.forEach(function (s) {
          if (!idb.objectStoreNames.contains(s)) idb.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function getAll(store) {
    return openIDB().then(function (idb) {
      return new Promise(function (resolve, reject) {
        var tx = idb.transaction(store, 'readonly');
        var req = tx.objectStore(store).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getRecord(store, id) {
    return openIDB().then(function (idb) {
      return new Promise(function (resolve, reject) {
        var tx = idb.transaction(store, 'readonly');
        var req = tx.objectStore(store).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function putRecord(store, record) {
    return openIDB().then(function (idb) {
      return new Promise(function (resolve, reject) {
        var tx = idb.transaction(store, 'readwrite');
        tx.objectStore(store).put(record);
        tx.oncomplete = function () { resolve(record); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function deleteRecord(store, id) {
    return openIDB().then(function (idb) {
      return new Promise(function (resolve, reject) {
        var tx = idb.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function stripId(r) { var c = Object.assign({}, r); delete c.id; return c; }

  function fireListener(store, L) {
    if (L.single) {
      getRecord(store, L.docId).then(function (rec) {
        L.cb({ exists: !!rec, data: function () { return rec ? stripId(rec) : undefined; } });
      }).catch(function (err) { if (L.errCb) L.errCb(err); });
    } else {
      getAll(store).then(function (all) {
        if (L.orderField) {
          all.sort(function (a, b) {
            var av = a[L.orderField], bv = b[L.orderField];
            if (av < bv) return L.orderDir === 'desc' ? 1 : -1;
            if (av > bv) return L.orderDir === 'desc' ? -1 : 1;
            return 0;
          });
        }
        if (L.limitN) all = all.slice(0, L.limitN);
        var docs = all.map(function (r) { return { id: r.id, data: function () { return stripId(r); } }; });
        L.cb({ docs: docs });
      }).catch(function (err) { if (L.errCb) L.errCb(err); });
    }
  }

  function notify(store) {
    (listeners[store] || []).forEach(function (L) { fireListener(store, L); });
    if (bc) { try { bc.postMessage({ store: store }); } catch (e) {} }
  }

  if (bc) {
    bc.onmessage = function (ev) {
      var store = ev.data && ev.data.store;
      if (store) (listeners[store] || []).forEach(function (L) { fireListener(store, L); });
    };
  }

  function docRef(store, id) {
    return {
      update: function (data) {
        return getRecord(store, id).then(function (rec) {
          var merged = Object.assign({}, rec || { id: id }, data, { id: id });
          return putRecord(store, merged);
        }).then(function () { notify(store); });
      },
      set: function (data) {
        var record = Object.assign({}, data, { id: id });
        return putRecord(store, record).then(function () { notify(store); });
      },
      delete: function () {
        return deleteRecord(store, id).then(function () { notify(store); });
      },
      onSnapshot: function (cb, errCb) {
        var L = { cb: cb, errCb: errCb, single: true, docId: id };
        listeners[store] = listeners[store] || [];
        listeners[store].push(L);
        fireListener(store, L);
        return function unsubscribe() {
          listeners[store] = (listeners[store] || []).filter(function (x) { return x !== L; });
        };
      }
    };
  }

  function collection(name) {
    var orderField = null, orderDir = 'asc', limitN = null;
    var ref = {
      orderBy: function (f, d) { orderField = f; orderDir = d || 'asc'; return ref; },
      limit: function (n) { limitN = n; return ref; },
      add: function (data) {
        var record = Object.assign({ id: uid() }, data);
        return putRecord(name, record).then(function () { notify(name); return record; });
      },
      doc: function (id) { return docRef(name, id); },
      onSnapshot: function (cb, errCb) {
        var L = { cb: cb, errCb: errCb, orderField: orderField, orderDir: orderDir, limitN: limitN, single: false };
        listeners[name] = listeners[name] || [];
        listeners[name].push(L);
        fireListener(name, L);
        return function unsubscribe() {
          listeners[name] = (listeners[name] || []).filter(function (x) { return x !== L; });
        };
      }
    };
    return ref;
  }

  function docByPath(path) {
    var parts = path.split('/');
    return docRef(parts[0], parts[1]);
  }

  return {
    collection: collection,
    doc: docByPath,
    ready: openIDB().then(function () { return true; }).catch(function () { return false; })
  };
})();

// downloads.save() local: crea el archivo (CSV, etc.) y dispara la descarga nativa
// del navegador/Android, sin depender de ninguna API de claude.ai.
var LocalDownloads = {
  save: function (opts) {
    return new Promise(function (resolve) {
      var blob = new Blob([opts.data], { type: opts.mime || 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = opts.filename || 'archivo.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 300);
    });
  }
};

// Vibración corta al tocar cosas — se ignora en silencio si el navegador la bloquea.
function haptic(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern || 10); } catch (e) {}
}
