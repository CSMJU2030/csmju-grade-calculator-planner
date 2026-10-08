# แก้ผลตรวจมาตรฐานก่อน PR

ผลก่อนแก้: backend / frontend build ผ่าน, tests 58 ข้อผ่าน แต่ ARC-02, API, UI-01 และ QA-01 ไม่ผ่าน.

- เปลี่ยนเครื่องมือ lint backend เป็น ESLint + typescript-eslint ใน whitelist ของ 1.8.4.
  ยังคงตรวจ Promise ที่ไม่จัดการ และตรวจ unused variables. ไม่แก้ whitelist หรือไฟล์ CI.
- ตั้ง global prefix `api`; controller ธุรกิจใช้ `v1/...`; health ใช้ controller `health`.
  เส้นทางภายนอกเดิมยังเป็น `/api/v1/...` และ `/api/health`.
  ยกเว้น GET `/auth/login`, GET `/auth/callback`, POST `/auth/logout` และ GET `/` จาก prefix.
- ลบตัวแปร request ที่ไม่ได้ใช้ และจัดการ bootstrap rejection โดยไม่แสดงรายละเอียดลับ.
- เปลี่ยน anchor ของฟอร์มจาก `add-course` เป็น `course-form` พร้อมแก้ลิงก์ที่เกี่ยวข้อง.
  ตัวตรวจสีจับ `#add` ใน anchor เดิมเป็น hex; หน้าตาและการกดเลื่อนฟอร์มยังเหมือนเดิม.
- แทน `any` ใน mock สองจุดด้วย `unknown` และชนิดพารามิเตอร์ของ service.
- เพิ่ม HTTP regression tests ใช้ controller/guard จริง ตรวจ prefix, auth paths, health,
  pagination, การส่ง owner, การปฏิเสธ token และการไม่มี route prefix ซ้ำ.
  Mock เฉพาะ JWT verification กับฐานข้อมูลภายใน test ไม่ใช่ทางข้าม login ของระบบจริง.

หลังติดตั้งให้รัน `corepack pnpm install --no-frozen-lockfile` จากราก repo เพื่อปรับ lockfile
ตามเครื่องมือ lint ใหม่ แล้วรัน `./standards/scripts/run-all-checks.sh .`.
ต้อง commit `backend/package.json`, `backend/eslint.config.mjs`, `pnpm-lock.yaml` และไฟล์โค้ดที่แก้ใน PR เดียวกัน.
สคริปต์ไม่ได้ติดตั้ง dependency, รัน migration, commit หรือ push ให้เอง.

การตรวจ static ของ ARC/API/UI ทำได้ที่ชุดเตรียมไฟล์.
ESLint, TypeScript, Nest tests และ Docker ต้องตรวจด้วย dependency จริงบนเครื่อง AIE.
