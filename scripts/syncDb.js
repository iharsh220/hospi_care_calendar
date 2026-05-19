require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Admin, Organogram, Event, EventAssignment } = require('../models');
const bcrypt = require('bcryptjs');

async function syncAndSeed() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    // Sync only — do NOT alter existing organogram table (data already exists)
    console.log('📦 Syncing models (force: false, alter: false)...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tables synced (existing tables untouched)');

    // ── Seed default admin (only if not already present) ──
    const existingAdmin = await Admin.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await Admin.create({
        name: 'Super Admin',
        username: 'admin',
        password: 'admin',
        avatar_initials: 'SA'
      });
      console.log('✅ Default admin created  (username: admin / password: admin)');
    } else {
      console.log('ℹ️  Admin already exists, skipping');
    }

    // ── Seed default events (only if not already present) ──
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const pad = n => String(n).padStart(2, '0');

    const defaultEvents = [
      { name: 'Safety inspection',        description: 'Monthly field safety check',           type: 'monthly',   event_date: null,                       assigned_to: 'all', seven_day_reminder: false },
      { name: 'Equipment maintenance log', description: 'Log all equipment maintenance done',  type: 'monthly',   event_date: null,                       assigned_to: 'all', seven_day_reminder: false },
      { name: 'Route compliance check',   description: 'Verify field route compliance',        type: 'monthly',   event_date: null,                       assigned_to: 'all', seven_day_reminder: false },
      { name: 'Annual audit',             description: 'Yearly compliance audit',              type: 'specific',  event_date: `${y}-${pad(m)}-15`,        assigned_to: 'all', seven_day_reminder: true  },
      { name: 'Compliance review',        description: 'Regulatory compliance review',         type: 'specific',  event_date: `${y}-${pad(m)}-22`,        assigned_to: 'all', seven_day_reminder: true  },
      { name: 'Field site survey',        description: 'On-site field survey',                 type: 'specific',  event_date: `${y}-${pad(m)}-28`,        assigned_to: 'all', seven_day_reminder: true  },
    ];

    const createdEvents = [];
    for (const ev of defaultEvents) {
      let event = await Event.findOne({ where: { name: ev.name } });
      if (!event) {
        event = await Event.create(ev);
        console.log(`✅ Event created: ${ev.name}`);
      }
      createdEvents.push(event);
    }

    // ── Auto-assign events to all active organogram entries for current month ──
    const allUsers = await Organogram.findAll({ where: { status: 'active' } });

    let assignmentCount = 0;
    for (const user of allUsers) {
      for (const event of createdEvents) {
        if (event.assigned_to !== 'all' && event.assigned_to !== user.region) continue;

        const existing = await EventAssignment.findOne({
          where: { field_user_id: user.id, event_id: event.id, month: m, year: y, is_carry_forward: false }
        });

        if (!existing) {
          let status = 'pending';
          if (event.type === 'specific' && event.event_date) {
            const dueDate = new Date(event.event_date);
            const diff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (diff <= 7 && diff > 0) status = 'remind';
            else if (diff > 7) status = 'upcoming';
          }
          await EventAssignment.create({
            field_user_id: user.id,
            event_id: event.id,
            month: m,
            year: y,
            status,
            is_carry_forward: false
          });
          assignmentCount++;
        }
      }
    }
    console.log(`✅ Event assignments created: ${assignmentCount} (for ${allUsers.length} active organogram entries)`);
    console.log('\n🚀 Database ready! You can now start the server with: npm start\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync/Seed failed:', err.message);
    process.exit(1);
  }
}

syncAndSeed();
