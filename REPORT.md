<!-- grade-verification-2026-10-08 -->
# รายงานผลตรวจระบบ Grade Calculator and Study Planner

วันที่: 8 ตุลาคม 2569 (Asia/Bangkok)

ระบบ: `csmju-grade-calculator-planner`
Repository: `github.com/CSMJU2030/csmju-grade-calculator-planner`
Branch ขณะตรวจ: `feature/grade-calculator-planner/deploy-v1-8-4`
Standards: `.standards-version` = `1.8.4`, submodule = tag `v1.8.4`

## ขอบเขตชุดที่เสนอ review

NestJS API, Prisma/PostgreSQL, auth ผ่าน Core Hub, Next.js frontend จาก template ของ standards, รายวิชา/คำนวณคะแนน/วางแผนเกรด/ประมาณคะแนนเต็มของงาน, migrations และไฟล์ Docker deployment ใน PR เดียวกัน

Frontend dev ใช้พอร์ต 3214, backend dev ใช้ 4214; ใน container ใช้ 3000/4000 ตามลำดับ Compose ใน repo ใช้สำหรับทดสอบในเครื่อง การ deploy server จริงต้องใช้การตั้งค่าฐานข้อมูลและ secret ของผู้ดูแล

## ผลที่ยืนยันจากการรันบนเครื่องทีม

| การตรวจ | ผล |
| --- | --- |
| pnpm install และ Prisma Client generate | ผ่าน |
| Backend/frontend ESLint | ผ่าน |
| Backend `tsc --noEmit` | ผ่าน |
| Backend Jest | 7 test suites, 73 tests ผ่านทั้งหมด |
| Backend Nest build | ผ่าน |
| Frontend Next.js build และ TypeScript | ผ่าน |
| `standards/scripts/run-all-checks.sh .` | Summary: All 20 checks passed; มีข้อข้ามตรวจด้าน OpenAPI ตามหมายเหตุ |
| `docker compose config --quiet` | ผ่าน |
| Docker images api/web build | ผ่าน |
| `docker compose up -d --build --wait --wait-timeout 180` | ผ่าน; db/api/web healthy ครบ |
| `git diff --check` ก่อน stage | ผ่าน |

### HTTP ผ่าน frontend

ทดสอบด้วย curl โดยไม่ส่ง token และไม่ตาม redirect:

| Request | ผลจริง | ความหมาย |
| --- | --- | --- |
| GET `http://localhost:3214/api/health` | 200 | health ผ่าน frontend proxy |
| GET `http://localhost:3214/api/v1/me` | 401 | ปฏิเสธผู้ใช้ที่ไม่มี token ตามที่ควรเป็น |
| GET `http://localhost:3214/auth/login?next=%2F` | 302 | endpoint เริ่ม redirect สำหรับ SSO ได้ |

ไม่พบการใช้ bypass login ในชุด auth ที่เตรียมส่ง การทดสอบ auth/routing ใช้ mocks ใน test เท่านั้น

### Docker runtime

- `db`: PostgreSQL 16, healthy; ไม่ publish พอร์ตฐานข้อมูล
- `api`: healthy; local mapping `127.0.0.1:4214 → 4000`
- `web`: healthy; local mapping `127.0.0.1:3214 → 3000`
- Compose project: `csmju-grade-calculator-planner-local`
- API entrypoint ใช้ `prisma migrate deploy` ก่อนเริ่ม server

## การเปลี่ยนแปลงสำคัญ

- เปลี่ยน backend lint เป็น ESLint และ dependencies ตาม whitelist
- ตั้ง global prefix `/api` และ exclude root/auth routes โดยคง external API `/api/v1/...`, health `/api/health`, auth `/auth/*`
- เพิ่ม routing regression tests ตรวจ health, auth, me, owner/pagination, nested API และ double prefix
- Rename SQL column/index ของเจ้าของรายวิชาเป็น `owner_core_user_id` โดยรักษาข้อมูล และคง property Prisma `coreUserId` ผ่าน mapping
- Frontend Dockerfile ใช้ template; Next.js standalone; env examples และ .dockerignore รองรับ runtime deployment
- ตั้ง dev ports 3214/4214, container ports 3000/4000 และ DATABASE_POOL_MAX ค่าเริ่มต้น 5

## ข้อจำกัดและงานที่ยังไม่ยืนยัน

1. API-01 OpenAPI sync แสดงข้อความข้ามตรวจ เพราะ backend ยังไม่มี script `generate:openapi` แม้ summary รวม PASS จึงยังไม่อ้างว่า OpenAPI sync ตรวจผ่านจริง
2. ยังไม่มีผล conformance L1–L3 แบบไม่มี SKIP
3. Production deployment, ทะเบียน Core Hub ที่ APPROVED + ACTIVE และ SSO ครบวงจรบนเว็บจริงยังรอทดสอบ ต้องแนบผลภายหลัง
4. ยังต้องทดสอบ role ที่รับ/ไม่รับ, logout, token หมดอายุ, owner isolation และการเข้าเมนูจาก Core Hub ด้วยบัญชีทดสอบจริง
5. ต้องยืนยัน permissions ตาม G0/PL โดยเฉพาะการเพิ่มรายวิชาของ STUDENT: permissions ปัจจุบันยังไม่ให้ COURSE_CREATE
6. ตัวประมาณและร่างใน calculator เป็นการคำนวณฝั่ง frontend การบันทึกค่าประมาณ/ร่างทั้งหมดลงฐานข้อมูลยังไม่ยืนยัน; ต้องทบทวนงาน grade-item UI, GPA, attendance/type และ reference-data integration เทียบขอบเขต G0
7. Docker DB ใหม่แยกจาก PostgreSQL เดิมในเครื่อง หากกลับไปรัน dev กับ DB เดิมต้องตรวจและ apply migration rename ให้ตรง schema ไม่ได้ยืนยัน migration ของ DB เดิมจากผล Docker

## เป้าหมายหลัง merge/deploy

Web: `https://csmju-grade-calculator-planner.jowave.com`
Callback: `https://csmju-grade-calculator-planner.jowave.com/auth/callback`
Core Hub: `https://csmju2030.jowave.com`

PL ยืนยัน role mapping/ทะเบียน และผู้ดูแล deploy ก่อนทดสอบ SSO ตาม `connect-core-hub.md` ข้อ 6 จากนั้นเพิ่มผลจริงในรายงาน ห้ามใส่บัญชีทดสอบ รหัสผ่าน token หรือ callback URL ที่มี token ลงรายงานหรือ log
