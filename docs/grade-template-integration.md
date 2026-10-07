# การปรับหน้าเว็บตาม standards v1.8.4

ชุดนี้เตรียมจากไฟล์จริงที่รวบรวมวันที่ 7 ต.ค. 2569 เพื่อใช้กับ branch feature/grade-calculator-planner/deploy-v1-8-4

## สิ่งที่ปรับ

- คัดลอก src/csmju, globals.css และโลโก้จาก template ที่มากับ standards v1.8.4 โดยไม่แก้ของกลาง
- Root layout ใช้ CsmjuAppShell เพียงครั้งเดียว พร้อมฟอนต์ Plus Jakarta Sans / Noto Sans Thai, lang=th, เมนูไทย 4 หน้า และ metadata
- ข้อมูลบทบาทและ permissions มาจาก backend /api/v1/me ไม่มีการส่ง cookie/token เป็น props ให้หน้าเว็บ
- ฟอร์มรายวิชาใช้สีและ class จาก @/csmju, ตรวจข้อมูลตอน blur/submit และซ่อนการเพิ่มตาม permissions ที่ backend ส่งมา
- รายการรายวิชาใช้ค้นหา/แบ่งหน้า 20 รายการจากข้อมูลทุกหน้าที่ backend ส่งมา ไม่ได้เพิ่มการเรียงข้อมูลบน frontend
- มี loading/error/not-found ทุกหน้า รวมถึงสถานะว่างและข้อผิดพลาดที่แปลเป็นไทย
- Silent re-SSO ตาม auth-contract §7 ใช้ top-level navigation เมื่อ API ตอบ 401 เก็บเพียงเวลาเพื่อกันวน 30 วินาที ไม่เก็บ token ไม่ต่ออายุ token เอง และไม่ redirect ทับฟอร์มที่มีข้อมูลค้าง
- G0 mapping: student → STUDENT, staff/lecturer → STAFF, admin → ADMIN; alumni/guest ไม่มี mapping และได้ 403
- เพิ่มการตรวจ owner ก่อนลบรายวิชา; เพิ่ม unit tests ของ guard, lecturer/guest และการลบของคนอื่น
- /api/health ใช้ SUBSYSTEM_ID เป็น data.service; manifest ใช้ชื่อเดียวกัน, frontend URL และ probes จริง
- ไฟล์ deploy ที่มีอยู่ยังต้องรวมใน PR เดียวกับโค้ด ตามที่ PL แจ้ง

## ข้อจำกัดที่ยังเหลือ

1. หน้าคำนวณเกรดยังเป็นการทดลองในหน้านั้น ไม่บันทึกรายการคะแนนลง API; มีข้อความแจ้งชัดเจนและแยกคะแนน 0 ออกจากช่องว่างแล้ว ขั้นต่อไปคือเชื่อม CRUD grade items กับรายวิชา แล้วใช้ข้อมูลเดียวกันในหน้าวางแผนเกรด
2. Permission ชุดเดิมยังไม่อนุญาต STUDENT เพิ่มรายวิชา ชุดนี้ไม่ได้เพิ่มสิทธิ์ใหม่โดยไม่มี G0 ยืนยัน ต้องคุยกับ PL ว่าให้นักศึกษาเพิ่มรายการเรียนของตนเองหรือเลือกข้อมูลรายวิชาจาก Core Hub (ห้ามสร้างทะเบียนรายวิชากลางซ้ำ)
3. การค้นหา/แจ้งเตือน/เมนูผู้ใช้/ลิงก์ footer บางส่วนใน CsmjuAppShell ยังเป็นตัวอย่างของ template ส่วนกลาง ชุดนี้ไม่แก้ไฟล์ csmju/ ปัญหาของกลางต้องส่ง PL/PM ตาม ui-design-system §17.4
4. มี local components ชั่วคราว ได้แก่ PageStates, ErrorNotice, CourseForm, formatNumber ประกอบจาก class/token ตาม §17.0 และ §20.1; ระบุไว้ใน subsystem.yaml
5. รอ PL ยืนยันพอร์ตและลงทะเบียน แล้วจึงทดสอบ SSO จริงตาม connect-core-hub §6; callback ต้องเป็นพอร์ต frontend และ host ต้องตรง localhost
6. ยังต้องทำ/ทดสอบ Compose, container runtime, conformance L1–L3 ไม่มี SKIP, ทดสอบมือถือ/คีย์บอร์ด/Lighthouse/axe และแนบผลใน REPORT.md/PR ไม่มีการอ้างว่าผ่านแล้ว
7. NODE_ENV=production ต้องให้ frontend container ได้ CORE_HUB_WEB_URL และ SUBSYSTEM_ID ตอนรันด้วย เพราะ layout อ่านค่า runtime; Dockerfile กลางไม่ถูกแก้
8. ยังไม่ได้ merge PR #7 หรือ commit/push โค้ด สคริปต์นี้ไม่ทำคำสั่งเหล่านั้น

## การตรวจที่ทำแล้วในการเตรียมไฟล์

- ตรวจ hash ของไฟล์ที่ได้รับและไฟล์กลางที่คัดลอก
- ตรวจพฤติกรรมสูตรคำนวณ/permissions/owner/AuthGuard ด้วย isolated Node harness 27 กรณี ผ่าน
- Harness ไม่ใช่ Nest/Jest, ไม่ได้ต่อ database หรือทดสอบ SSO จริง
- สภาพแวดล้อมที่เตรียมชุดนี้ไม่มี dependencies ของ repo จึงยังไม่อ้างว่า Next/Nest build หรือ Jest ชุดเต็มผ่าน ต้องรันบนเครื่องทีม

## ติดตั้งและตรวจบน Mac

หยุด frontend/backend ที่รัน watch ด้วย Ctrl+C ก่อน build เพื่อไม่ให้สอง process เขียน/ลบ dist พร้อมกัน

```bash
cd ~/Desktop/csmju2030/csmju-grade-calculator
python3 ~/Downloads/apply-grade-estimation.py
corepack pnpm --filter backend build
corepack pnpm --filter backend test --runInBand
corepack pnpm --filter frontend build
```

สคริปต์ตรวจทั้งหมดก่อนเขียนและสำรองไฟล์ที่จะเปลี่ยนไว้นอก repo ก่อนทำงาน รวมถึง .env.local หากต้องเพิ่มค่า URL/ID ที่ยังไม่มี ไม่แก้รหัสผ่านหรือ DATABASE_URL

เปิดคนละ Terminal หลัง build:

```bash
corepack pnpm --filter backend start:dev
```

```bash
corepack pnpm --filter frontend dev
```

ใช้พอร์ตชั่วคราวปัจจุบัน frontend :3000 / backend :3002 จน PL แจ้งพอร์ตที่จัดสรร ห้ามใช้ 3238/4238 หรือ 3201/4201

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3002/api/v1/me
```

ไม่มี cookie/token ต้องได้ 401 หลัง restart ไม่มี bypass; guard เปลี่ยนเพื่อ role mapping ดังนั้นสคริปต์ grade-local-auth.py รุ่นเก่าที่เทียบ byte กับต้นฉบับเดิมจะไม่ตรงแล้ว อย่าใช้ enable/disable ของสคริปต์เก่าเพื่อทับ guard ใหม่นี้

## ถ้าต้องคืนไฟล์

ใช้ `python3 ~/Downloads/apply-grade-estimation.py --restore <โฟลเดอร์สำรอง>` สคริปต์คืนได้เมื่อไฟล์ใน repo ยังตรงกับไฟล์ที่ชุดนี้เขียน ถ้ามีการแก้ต่อแล้วจะหยุดเพื่อไม่ทับงานใหม่

อย่า commit .env หรือไฟล์สำรอง ตรวจ git status/diff และรวม Dockerfile/.dockerignore/entrypoint ใน PR เดียวกัน หลังได้พอร์ตจริงต้องแก้ทั้ง .env, package scripts ตามที่ใช้จริง, manifest และทะเบียนให้ตรงกัน

ฟีเจอร์ประมาณคะแนนเต็มของงาน: ดู docs/grade-task-estimation.md ชุดใหม่นี้รวม template และฟีเจอร์ประมาณแล้ว อย่ารันสคริปต์ติดตั้งชุดเก่าซ้ำหลังแก้โค้ดต่อ
