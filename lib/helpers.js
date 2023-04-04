'use strict';

const { normalizeHaiku, generateHaiku, createFlyer } = require('6bmk/cjs');
const { createHash } = require('crypto');
const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');
const siteConfig = require.main.require('./config.json');

const PLUGIN_KEY = 'nodebb-plugin-6bmk';
const FLYER_SET_KEY = `${PLUGIN_KEY}:flyer-set`;
const HAIKU_SET_KEY = `${PLUGIN_KEY}:haiku-set`;
const USED_HAIKU_SET_KEY = `${PLUGIN_KEY}:haiku-set:used`;
const createFlyerKey = fid => (`${PLUGIN_KEY}:flyer:${fid}`);
const createHaikuKey = hid => (`${PLUGIN_KEY}:haiku:${hid}`);

module.exports = {
  addFlyer,
  getFlyer,
  getFlyers,
  formatFlyer,
  formatFlyers,
  deactivateFlyer,
  useHaiku,
  findHaiku,
  getFlyerStream,
};

function getHash(text) {
  const sha1 = createHash('sha1');
  sha1.update(normalizeHaiku(text));
  return sha1.digest('hex');
}

function scoreHash(hash) {
  return parseInt(hash.substring(0, 16), 16);
}

async function increment(field) {
  return db.incrObjectField(PLUGIN_KEY, field)
}

async function loadSet(set, score) {
  let keys;
  if (score === undefined) {
    keys = await db.getSortedSetRange(set, 0, -1);
  } else {
    keys = await db.getSortedSetRangeByScore(set, 0, -1, score, score);
  }
  return Promise.all(keys.map(key => db.getObject(key)));
}

function appendSet(set, key, object, score = Date.now()) {
  db.setObject(key, object);
  db.sortedSetAdd(set, score, key);
  return object;
}

async function addFlyer(options) {
  const fid = await increment('nextFlyerId');
  return appendSet(FLYER_SET_KEY, createFlyerKey(fid), {
    fid,
    date: Date.now(),
    haikuKeys: [],
    options,
  });
}

async function getFlyers() {
  return await loadSet(FLYER_SET_KEY);
}

async function getFlyer(fid) {
  const flyers = await getFlyers();
  return flyers.find(f => f.fid === fid);
}

async function formatFlyers(flyers) {
  const list = [];
  for (const flyer of flyers) {
    list.push(await formatFlyer(flyer));
  }
  return list.reverse();
}

async function formatFlyer({ fid, date, haikuKeys }) {
  const haiku = await Promise.all(haikuKeys.map(key => db.getObject(key)));
  let used = 0, free = 0, total = haiku.length;
  for (const { uid } of haiku) {
    if (uid > 0) {
      used++;
    } else if (uid === 0) {
      free++;
    }
  }
  const { defaultLang } = meta.config;
  date = new Date(date).toLocaleDateString(defaultLang, { dateStyle: 'full' });
  return { fid, date, used, free, total };
}

async function deactivateFlyer(fid) {
  const { haikuKeys } = await db.getObject(createFlyerKey(fid));
  for (const key of haikuKeys) {
    const exists = await db.isSortedSetMember(HAIKU_SET_KEY, key);
    if (exists) {
      db.setObjectField(key, 'uid', -1);
      db.sortedSetRemove(HAIKU_SET_KEY, key);
    }
  }
}

async function useHaiku(hid, uid) {
  if (siteConfig['6bmk']?.allowHaikuReuse) {
    return;
  }
  const key = createHaikuKey(hid);
  const { hash } = await db.getObject(key);
  const score = scoreHash(hash);
  db.setObjectField(key, 'uid', uid);
  db.sortedSetRemove(HAIKU_SET_KEY, key);
  db.sortedSetAdd(USED_HAIKU_SET_KEY, score, key);
}

async function findHaiku(text, unused = true) {
  const hash = getHash(text), score = scoreHash(hash);
  const haiku = await loadSet(unused ? HAIKU_SET_KEY : USED_HAIKU_SET_KEY, score);
  return haiku.find(h => h.hash === hash);
}

async function getFlyerStream(fid) {
  const flyerKey = createFlyerKey(fid);
  const flyer = await db.getObject(flyerKey);
  const haiku = (async function*() {
    for (const key of flyer.haikuKeys) {
      const { text } = await db.getObject(key);
      yield text;
    }
    let count = 0;
    try {
      for await (const text of generateHaiku()) {
        const hash = getHash(text), score = scoreHash(hash);
        const hid = await increment('nextHaikuId');
        const key = createHaikuKey(hid);
        appendSet(HAIKU_SET_KEY, key, {
          hid,
          hash,
          text,
          uid: 0,
        }, score);
        flyer.haikuKeys.push(key);
        count++;
        yield text;
      }  
    } finally {
      if (count > 0) {
        db.setObject(flyerKey, flyer);
      }  
    }
  })();
  const address = siteConfig.url;
  return createFlyer({ haiku, address, ...flyer.options });
}
