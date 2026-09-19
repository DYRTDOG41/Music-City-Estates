const test=require("node:test");
const assert=require("node:assert");
const Trailer=require("./trailer_mode.js");
test("trailer route presents the complete seven-shot career story",function(){assert.strictEqual(Trailer.ROUTE.length,7);assert.strictEqual(Trailer.ROUTE[0].page,"city_map.html");assert.strictEqual(Trailer.ROUTE[6].page,"music_city_radio.html");});
test("trailer links preserve existing scene query strings",function(){assert.strictEqual(Trailer.buildUrl(2),"record_music.html?studio=bedroom&trailer=1&shot=2");assert.strictEqual(Trailer.buildUrl(7),"trailer_director.html?finale=1");});
test("trailer mode is explicit and does not affect normal gameplay",function(){assert.strictEqual(Trailer.isActive("?trailer=1&shot=0"),true);assert.strictEqual(Trailer.isActive("?shot=0"),false);});
