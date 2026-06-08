import 'dotenv/config'
import prisma from './lib/prisma.js'
import bcryptjs from 'bcryptjs'
import crypto from 'crypto'

// ── 45 Indian names (30 male, 15 female) ──────────────────────────────────────
const USERS = [
  // ── Kannapuram (0-14) ──────────────────────────────────────
  { fullName: 'Arjun Nair',       gender: 'MALE',   dob: '1997-03-12' },
  { fullName: 'Vineeth Krishna',  gender: 'MALE',   dob: '1996-07-22' },
  { fullName: 'Rahul Menon',      gender: 'MALE',   dob: '1998-01-05' },
  { fullName: 'Sujith Pillai',    gender: 'MALE',   dob: '1995-11-18' },
  { fullName: 'Arun Dev',         gender: 'MALE',   dob: '1999-04-30' },
  { fullName: 'Midhun Raj',       gender: 'MALE',   dob: '1997-09-14' },
  { fullName: 'Dileep Varma',     gender: 'MALE',   dob: '1996-06-03' },
  { fullName: 'Vishnu Prasad',    gender: 'MALE',   dob: '1998-12-25' },
  { fullName: 'Abin Jose',        gender: 'MALE',   dob: '1995-02-17' },
  { fullName: 'Jithin Kumar',     gender: 'MALE',   dob: '1999-08-09' },
  { fullName: 'Priya Nair',       gender: 'FEMALE', dob: '1997-05-20' },
  { fullName: 'Divya Menon',      gender: 'FEMALE', dob: '1998-10-11' },
  { fullName: 'Anjali Pillai',    gender: 'FEMALE', dob: '1996-03-28' },
  { fullName: 'Sreelakshmi Das',  gender: 'FEMALE', dob: '1999-01-15' },
  { fullName: 'Nithya Krishnan',  gender: 'FEMALE', dob: '1995-07-04' },

  // ── Dippakayalapadu (15-29) ────────────────────────────────
  { fullName: 'Venkat Reddy',     gender: 'MALE',   dob: '1996-04-22' },
  { fullName: 'Suresh Babu',      gender: 'MALE',   dob: '1997-08-15' },
  { fullName: 'Kiran Kumar',      gender: 'MALE',   dob: '1998-02-07' },
  { fullName: 'Ravi Shankar',     gender: 'MALE',   dob: '1995-11-30' },
  { fullName: 'Manoj Varma',      gender: 'MALE',   dob: '1999-06-19' },
  { fullName: 'Charan Teja',      gender: 'MALE',   dob: '1997-01-08' },
  { fullName: 'Naveen Babu',      gender: 'MALE',   dob: '1996-09-24' },
  { fullName: 'Lokesh Rao',       gender: 'MALE',   dob: '1998-05-13' },
  { fullName: 'Tarun Naidu',      gender: 'MALE',   dob: '1995-03-02' },
  { fullName: 'Pranav Sai',       gender: 'MALE',   dob: '1999-12-16' },
  { fullName: 'Swathi Reddy',     gender: 'FEMALE', dob: '1997-07-09' },
  { fullName: 'Mounika Devi',     gender: 'FEMALE', dob: '1998-04-27' },
  { fullName: 'Kavitha Babu',     gender: 'FEMALE', dob: '1996-10-03' },
  { fullName: 'Sirisha Rao',      gender: 'FEMALE', dob: '1999-02-21' },
  { fullName: 'Bhavana Lakshmi',  gender: 'FEMALE', dob: '1995-08-14' },

  // ── Koyyalagudem (30-44) ───────────────────────────────────
  { fullName: 'Sravan Kumar',     gender: 'MALE',   dob: '1997-05-11' },
  { fullName: 'Deepak Varma',     gender: 'MALE',   dob: '1996-01-26' },
  { fullName: 'Ganesh Rao',       gender: 'MALE',   dob: '1998-07-18' },
  { fullName: 'Harikesh Naidu',   gender: 'MALE',   dob: '1995-04-07' },
  { fullName: 'Dinesh Reddy',     gender: 'MALE',   dob: '1999-11-02' },
  { fullName: 'Pavan Babu',       gender: 'MALE',   dob: '1997-09-29' },
  { fullName: 'Manohar Kumar',    gender: 'MALE',   dob: '1996-06-14' },
  { fullName: 'Vinay Krishna',    gender: 'MALE',   dob: '1998-03-05' },
  { fullName: 'Kishore Varma',    gender: 'MALE',   dob: '1995-12-22' },
  { fullName: 'Santosh Rao',      gender: 'MALE',   dob: '1999-08-17' },
  { fullName: 'Ramya Devi',       gender: 'FEMALE', dob: '1997-02-08' },
  { fullName: 'Pooja Lakshmi',    gender: 'FEMALE', dob: '1998-06-30' },
  { fullName: 'Keerthi Varma',    gender: 'FEMALE', dob: '1996-01-13' },
  { fullName: 'Lavanya Rao',      gender: 'FEMALE', dob: '1999-09-25' },
  { fullName: 'Sowmya Babu',      gender: 'FEMALE', dob: '1995-05-06' },
]

const CITIES = [
  { city: 'Kannapuram',       state: 'Kerala',          pincode: '670003' },
  { city: 'Dippakayalapadu',  state: 'Andhra Pradesh',  pincode: '521235' },
  { city: 'Koyyalagudem',     state: 'Andhra Pradesh',  pincode: '534327' },
]

function inviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
}

async function main() {
  // ── 1. Clear all data in FK-safe order ──────────────────────────────────────
  console.log('🗑️  Clearing database...')
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.connection.deleteMany()
  await prisma.message.deleteMany()
  await prisma.groundSlot.deleteMany()
  await prisma.ground.deleteMany()
  await prisma.userSport.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Database cleared\n')

  // ── 2. Create 45 users ───────────────────────────────────────────────────────
  const passwordHash = await bcryptjs.hash('123456', 10)
  const createdUsers = []

  for (let i = 0; i < 45; i++) {
    const info     = USERS[i]
    const cityData = CITIES[Math.floor(i / 15)]
    const slug     = info.fullName.toLowerCase().replace(/\s+/g, '_')
    const username = `${slug}_${i + 1}`
    const phone    = `9${String(i).padStart(9, '0')}`  // 9000000000 – 9000000044

    const user = await prisma.user.create({
      data: {
        phone,
        fullName:    info.fullName,
        username,
        dateOfBirth: new Date(info.dob),
        gender:      info.gender,
        country:     'India',
        state:       cityData.state,
        city:        cityData.city,
        pincode:     cityData.pincode,
        passwordHash,
        isVerified:  true,
        sports: {
          create: [{
            sport:      'CRICKET',
            skillLevel: 'INTERMEDIATE',
          }],
        },
      },
    })
    createdUsers.push(user)
    process.stdout.write(`\r  Users created: ${i + 1}/45`)
  }
  console.log('\n✅ 45 users created\n')

  // ── 3. Create 3 teams (15 members each) ──────────────────────────────────────
  const TEAM_NAMES = ['Kannapuram A', 'Kannapuram B', 'Kannapuram C']

  for (let t = 0; t < 3; t++) {
    const slice   = createdUsers.slice(t * 15, t * 15 + 15)
    const creator = slice[0]
    const code    = inviteCode()

    const team = await prisma.team.create({
      data: {
        name:        TEAM_NAMES[t],
        sport:       'CRICKET',
        description: `Cricket team — ${TEAM_NAMES[t]}`,
        inviteCode:  code,
        maxPlayers:  15,
        createdBy:   creator.id,
        members: {
          create: slice.map((u, idx) => ({
            userId: u.id,
            role:   idx === 0 ? 'ADMIN' : 'PLAYER',
          })),
        },
      },
    })

    console.log(`✅ Team "${team.name}" created`)
    console.log(`   Admin   : ${creator.fullName} (@${creator.username})`)
    console.log(`   Members : ${slice.length}`)
    console.log(`   Invite  : ${code}\n`)
  }

  console.log('🎉 Seed complete!')
  console.log('   All user passwords : 123456')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
