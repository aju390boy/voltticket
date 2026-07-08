// Fix: use ObjectId for the eventId query, not a string
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

mongoose.connect('mongodb://localhost:27017/volttticket').then(async () => {
  const db = mongoose.connection.db;
  const events = await db.collection('events').find({}).toArray();
  console.log('Events found:', events.length);

  for (const ev of events) {
    const eid = new ObjectId(ev._id);   // Use ObjectId for the Seat query

    const avail  = await db.collection('seats').countDocuments({ eventId: eid, status: 'available' });
    const locked = await db.collection('seats').countDocuments({ eventId: eid, status: 'locked' });
    const sold   = await db.collection('seats').countDocuments({ eventId: eid, status: 'sold' });
    const total  = await db.collection('seats').countDocuments({ eventId: eid });

    const needsFix = ev.availableSeats !== avail || ev.soldSeats !== sold;
    console.log(
      `"${ev.title}" | seats total=${total} avail=${avail} locked=${locked} sold=${sold}`,
      `| DB: avail=${ev.availableSeats} sold=${ev.soldSeats}`,
      needsFix ? '⚠ FIXING' : '✓ OK'
    );

    // Always sync to real values
    await db.collection('events').updateOne(
      { _id: ev._id },
      { $set: { availableSeats: avail, soldSeats: sold, lockedSeats: locked } }
    );
  }

  await mongoose.disconnect();
  console.log('\nDone! All event counters synced to real seat counts.');
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
