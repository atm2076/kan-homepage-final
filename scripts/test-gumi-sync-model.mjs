import assert from 'node:assert/strict';

class SyncModel {
  constructor() { this.properties = new Map(); this.sources = new Map(); this.ids = new Map(); this.nextId = 1; this.batch = null; }
  start() { this.batch = { seen: new Set(), chunks: 0 }; }
  chunk(records) {
    assert(this.batch);
    assert(records.length <= 1000);
    this.batch.chunks += 1;
    for (const row of records) {
      if (!row.identity) continue;
      let source = this.sources.get(row.identity);
      if (!source) {
        const property = { id: String(this.nextId++), listingNumber: 1000 + this.nextId, listingType: 'quick', availability: 'active', photos: [], details: {}, deposit: row.deposit, rent: row.rent };
        source = { property, intSeqHistory: new Set(), lastSeen: null };
        this.properties.set(property.id, property); this.sources.set(row.identity, source);
      } else if (source.property.listingType === 'quick') {
        source.property.deposit = row.deposit; source.property.rent = row.rent; source.property.availability = 'active';
      } else source.property.availability = 'active';
      source.intSeqHistory.add(row.intSeq); source.lastSeen = this.batch; this.ids.set(row.intSeq, source);
      this.batch.seen.add(row.identity);
    }
  }
  finalize() { for (const [identity, source] of this.sources) if (!this.batch.seen.has(identity)) source.property.availability = 'missing'; this.batch = null; }
  enrich(identity, patch) {
    const property = this.sources.get(identity).property;
    property.photos = [...new Set([...property.photos, ...(patch.photos || [])])];
    property.details = { ...property.details, ...Object.fromEntries(Object.entries(patch.details || {}).filter(([, value]) => value !== '')) };
    if (property.photos.length && ['area', 'floor', 'direction', 'parking', 'moveIn'].every((key) => property.details[key])) property.listingType = 'normal';
    return property;
  }
}

const model = new SyncModel();
const identity = '인의동 669-8|301|미니투룸';
model.start();
model.chunk(Array.from({ length: 1000 }, (_, index) => ({ identity: `인의동 ${index}|301|원룸`, intSeq: index + 1, deposit: 100, rent: 30 })));
model.chunk([{ identity, intSeq: 2001, deposit: 100, rent: 25 }]);
assert.equal(model.batch.chunks, 2);
const original = model.sources.get(identity).property;
const originalId = original.id;
const originalNumber = original.listingNumber;
model.chunk([{ identity, intSeq: 3001, deposit: 200, rent: 23 }]);
assert.equal(model.sources.get(identity).property.id, originalId);
assert.equal(model.sources.get(identity).property.rent, 23);
assert.deepEqual([...model.sources.get(identity).intSeqHistory], [2001, 3001]);
model.finalize();

model.start(); model.chunk([{ identity: '다른동 1|101|원룸', intSeq: 9000, deposit: 100, rent: 30 }]); model.finalize();
assert.equal(model.sources.get(identity).property.availability, 'missing');
model.start(); model.chunk([{ identity, intSeq: 4001, deposit: 200, rent: 23 }]);
assert.equal(model.sources.get(identity).property.availability, 'active');

const partial = model.enrich(identity, { photos: ['one.jpg'], details: { area: '20㎡' } });
assert.equal(partial.id, originalId); assert.equal(partial.listingNumber, originalNumber); assert.deepEqual(partial.photos, ['one.jpg']); assert.equal(partial.listingType, 'quick');
const normal = model.enrich(identity, { photos: ['one.jpg', 'two.jpg'], details: { floor: '3층', direction: '남향', parking: '가능', moveIn: '즉시' } });
assert.equal(normal.id, originalId); assert.equal(normal.listingType, 'normal'); assert.deepEqual(normal.photos, ['one.jpg', 'two.jpg']);
const protectedDetails = structuredClone(normal.details);
model.chunk([{ identity, intSeq: 5001, deposit: 300, rent: 22 }]);
assert.deepEqual(normal.details, protectedDetails); assert.deepEqual(normal.photos, ['one.jpg', 'two.jpg']); assert.equal(normal.rent, 23);

console.log('gumi sync model tests: ok');
