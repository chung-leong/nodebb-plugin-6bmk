'use strict';

const { normalizeHaiku, generateHaiku, createFlyer } = require('6bmk/cjs');
const { createHash } = require('crypto');
const db = require.main.require('./src/database');

const PLUGIN_KEY = 'nodebb-plugin-6bmk';
const FLYER_SET_KEY = `${PLUGIN_KEY}:flyer-set`;
const HAIKU_SET_KEY = `${PLUGIN_KEY}:haiku-set`;
const createFlyerKey = fid => (`${PLUGIN_KEY}:flyer:${fid}`);
const createHaikuKey = hid => (`${PLUGIN_KEY}:haiku:${hid}`);

const Helpers = {};

async function loadSet(set) {
  const keys = await db.getSortedSetRange(set, 0, -1);
  return Promise.all(keys.map(key => db.getObject(key)));
}

Helpers.createFlyer = async (name, options) => {
  const fid = await db.incrObjectField(PLUGIN_KEY, 'nextFlyerId');
  const flyerKey = createFlyerKey(fid);
  const flyer = {
    fid,
    name,
    haikuKeys: [],
    options,
  };
  db.setObject(flyerKey, flyer);
  db.sortedSetAdd(FLYER_SET_KEY, Date.now(), flyerKey);
  return fid;
};

Helpers.getFlyers = async () => {
  const flyers = await loadSet(FLYER_SET_KEY);
  const list = [];
  for (const { fid, name, haikuKeys } of flyers) {
    const haiku = await Promise.all(haikuKeys.map(key => db.getObject(key)));
    list.push({ fid, name, haiku });
  }
  return list;
};

Helpers.deactivateFlyer = async (fid) => {
  const { haikuKeys } = await db.getObject(createFlyerKey(fid));
  for (const key of haikuKeys) {
    const exists = await db.isSortedSetMember(HAIKU_SET_KEY, key);
    if (exists) {
      db.setObjectField(key, 'uid', -1);
      db.sortedSetRemove(HAIKU_SET_KEY, key);
    }
  }
};

Helpers.useHaiku = async (hid, uid) => {
  const key = createHaikuKey(hid);
  db.setObjectField(key, 'uid', uid);
  db.sortedSetRemove(HAIKU_SET_KEY, key);
};

Helpers.findHaiku = async (text) => {
  const sha1 = createHash('sha1');
  sha1.update(normalizeHaiku(text));
  const hash = sha1.digest('hex');
  const haiku = await loadSet(HAIKU_SET_KEY);
  return haiku.find(h => h.hash === hash);
};

Helpers.getFlyerStream = async (fid) => {
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
        yield text;
        const hid = await db.incrObjectField(PLUGIN_KEY, 'nextHaikuId');
        const sha1 = createHash('sha1');
        sha1.update(normalizeHaiku(text));
        const hash = sha1.digest('hex');
        const haiku = {    
          hid,
          hash,
          text,
          uid: 0,
        };
        const key = createHaikuKey(hid);
        db.setObject(key, haiku);
        db.sortedSetAdd(HAIKU_SET_KEY, Date.now(), key);
        flyer.haikuKeys.push(key);
        count++;
      }  
    } finally {
      if (count > 0) {
        db.setObject(flyerKey, flyer);
      }  
    }
  })();
  const stream = await createFlyer({ haiku, ...flyer.options });
  stream.name = flyer.name;
  return stream;
};

module.exports = Helpers;