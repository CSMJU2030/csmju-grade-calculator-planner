# เตรียมระบบขึ้น server

มาตรฐาน 1.8.4 · ชื่อระบบ `csmju-grade-calculator-planner`

| การรัน | Frontend | Backend |
|---|---|---|
| dev บนเครื่อง | http://localhost:3214 | http://127.0.0.1:4214 |
| ใน container | 3000 | 4000 |
| เว็บจริง | https://csmju-grade-calculator-planner.jowave.com | ผ่าน frontend เท่านั้น |

Callback ที่ PL จะลงทะเบียน: `https://csmju-grade-calculator-planner.jowave.com/auth/callback`.
ทดสอบการกลับจาก SSO ที่เว็บจริงหลัง DevOps ขึ้นระบบและ admin อนุมัติ + activate.
ในเครื่องตรวจได้ว่า `/auth/login` ส่ง 302 ไป Core Hub และ API ที่ไม่มี token ตอบ 401.
ไม่มีการข้าม login ในชุด deploy นี้.

## ฐานข้อมูล

`courses.owner_core_user_id` เป็น TEXT. ชื่อ property Prisma ยังคง `coreUserId`
เพื่อรักษา API และ service เดิม. Migration ใหม่ RENAME COLUMN และ RENAME INDEX ภายใน
transaction เท่านั้น ไม่ลบรายวิชา ไม่เปลี่ยนเจ้าของหรือ ID และไม่แก้ migration ที่เคยใช้แล้ว.

ฐาน Docker เป็นฐานแยกจาก Homebrew ของเครื่อง. `.env` ที่รากมีรหัสสุ่มสำหรับฐาน Docker
และไม่ติด Git หรือ build context. เก็บไฟล์นี้ไว้เมื่อใช้ volume เดิม; อย่าลบ volume เพื่อแก้ปัญหา.
บน server DevOps ใช้ PostgreSQL กลาง จึงไม่ใช้ service db ของไฟล์ Compose ใน repo.

## ทดสอบ dev กับฐานเดิม

หยุด backend watch ก่อน build. หลังสำรองฐานตามวิธีที่ใช้อยู่ รัน:

```sh
corepack pnpm --filter backend exec prisma migrate deploy
corepack pnpm --filter backend exec prisma generate
corepack pnpm --filter backend build
corepack pnpm --filter backend test --runInBand
corepack pnpm --filter frontend build
```

ใช้ `corepack pnpm --filter backend start:dev` และ
`corepack pnpm --filter frontend dev` คนละ Terminal.
สคริปต์ติดตั้งปรับ PORT ใน backend/.env เป็น 4214 โดยรักษา DATABASE_URL เดิม.

## ซ้อม container ก่อน PR

```sh
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
curl -s -o /dev/null -w 'health HTTP %{http_code}\n' --max-time 5 http://localhost:3214/api/health
curl -s -o /dev/null -w 'me HTTP %{http_code}\n' --max-time 5 http://localhost:3214/api/v1/me
curl -s -o /dev/null -w 'login HTTP %{http_code}\n' --max-time 5 'http://localhost:3214/auth/login?next=%2F'
docker stats --no-stream
./standards/scripts/run-all-checks.sh .
```

ต้องเห็น db/api/web healthy, health 200, me 401, login 302.
อย่าใช้ `curl -L` กับการตรวจ redirect นี้ เพราะยังไม่ใช่ทดสอบ login ครบวงจร.
`docker compose down` หยุดระบบโดยรักษา volume; ไม่ใช้ `down -v`.
หากต่อ db ไม่ได้ ให้ตรวจรหัสใน `.env` กับ volume เดิม อย่าแสดงรหัสหรือ URL ฐานในรายงาน.

## หลักฐานงานและสิ่งที่ยังต้องทดสอบ

ก่อนชุด deploy: backend build / frontend build ผ่าน และ unit tests 58 tests ผ่านบนเครื่อง AIE.
หลังติดตั้งชุดนี้ต้องรัน build/tests/checks/Compose อีกครั้ง ไม่ถือว่าผ่านล่วงหน้า.
บันทึกผลจริงใน REPORT.md หลังทดสอบ. งานทะเบียน, SSO ทุก role, หมดอายุและ logout
ยังรอเว็บจริง. การประมาณคะแนนในหน้าคำนวณยังเป็นร่างในหน้าเว็บ ไม่บันทึกกลุ่มงานลงฐาน.

ไฟล์ frontend/Dockerfile ต้องตรง template. โฟลเดอร์ csmju/ และ globals.css ไม่แก้.
Backend ใช้ DATABASE_POOL_MAX (default 5), USER node และ migrate deploy ใน entrypoint.
หน้าที่ DevOps ต้องตั้ง env ครบอยู่ใน backend/.env.example และ frontend/.env.example.
