var assert = require('assert');
var fs = require('fs');
var vm = require('vm');

function createStorage(seed) {
  var values = Object.assign({}, seed || {});
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem: function (key, value) { values[key] = String(value); },
    dump: function () { return Object.assign({}, values); }
  };
}

function boot(seed, career) {
  var storage = createStorage(seed);
  var savedCareer = null;
  var context = {
    localStorage: storage,
    crypto: { randomUUID: function () { return 'test-session'; } },
    window: {
      MCE: {
        load: function () { return Object.assign({}, career); },
        save: function (patch) { savedCareer = Object.assign({}, career, patch); return savedCareer; }
      }
    },
    setInterval: function () { return 1; },
    clearInterval: function () {}
  };
  vm.runInNewContext(fs.readFileSync('./music_city_social.js', 'utf8'), context);
  return { social: context.window.MCESocial, storage: storage, savedCareer: function () { return savedCareer; } };
}

var artist = boot({
  mceAvatar: JSON.stringify({ name: 'Old Name', type: 'Rapper', shirtColor: '#7b2cff' })
}, { name: 'Mic Legend' });
var loaded = artist.social.loadProfile();
assert.strictEqual(loaded.name, 'Mic Legend');
assert.strictEqual(loaded.role, 'Rapper');
assert.strictEqual(loaded.color, '#7b2cff');

artist.social.saveProfile({ name: 'New Legend', role: 'Singer', color: '#123456' });
assert.strictEqual(artist.savedCareer().name, 'New Legend');
var syncedAvatar = JSON.parse(artist.storage.dump().mceAvatar);
assert.strictEqual(syncedAvatar.name, 'New Legend');
assert.strictEqual(syncedAvatar.type, 'Singer');
assert.strictEqual(syncedAvatar.shirtColor, '#123456');

var fan = boot({
  'mce-social-profile': JSON.stringify({ name: 'Music Fan', role: 'Fan', color: '#abcdef' }),
  mceAvatar: JSON.stringify({ name: 'Mic Legend', type: 'Rapper', shirtColor: '#7b2cff' })
}, { name: 'Mic Legend' });
assert.strictEqual(fan.social.loadProfile().name, 'Music Fan');
fan.social.saveProfile({ name: 'Super Fan', role: 'Fan', color: '#abcdef' });
assert.strictEqual(fan.savedCareer(), null);
assert.strictEqual(JSON.parse(fan.storage.dump().mceAvatar).name, 'Mic Legend');

console.log('3 social identity tests passed');
