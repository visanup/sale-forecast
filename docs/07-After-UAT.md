## Overview
หลังจากผมให้ User ทดสอบระบบพบว่า User แบ่งออกเป็น 2 กลุ่มคือ FEED และ AHB โดยโปรแกรมที่เราเขียนไปรองรับเฉพาะ AHB

## สิ่งที่ต้องการแก้ไข

1.) ปรับหน้า Login ก่อนกดปุ่ม Sign In จะต้องเลือกว่าจะเข้า Module ของ AHB หรือ FEED เพื่อแยกว่าจะเข้าโปรแกรม AHB หรือ FEED
2.) ช่วย Generate โปรแกรมของ FEED โดยเบื้องต้นให้เหมือนกับ AHB
3.) User มีการเปลี่ยนแปลงข้อมูล เป็นรูปแบบตามไฟล์นี้ D:\Betagro\sale-forecast\Sample_Template.xlsx ช่วยปรับปรุง BE FE API Prisma และส่วนอื่นที่เกี่ยวข้องทั้งหมดของโปรแกรม

หมายเหตุการปรับปรุงตาม Sample_Template.xlsx (สรุปที่สำคัญ):
- ปรับ Backend (ingest-service) ให้รองรับคอลัมน์ใหม่/ชื่อคอลัมน์:
  - `SAP Code` ถูกแม็ปเป็น `customer_code`/`company_code`
  - `SAPCode` ถูกแม็ปเป็น `material_code`
  - `ชื่อบริษัท` ใช้เป็น `company_desc` (ไม่ใช้ค่า `SAPCode` เป็นคำอธิบายอีกต่อไป)
  - หากไม่มี `Distribution Channel` จะกำหนดค่าเริ่มต้นเป็น `NA` และ `dc_desc` เป็น `N/A`
  - รองรับเฉพาะเดือนที่มีในไฟล์จริง (เช่น `n+1`, `n+2`, `n+3`) ส่วนที่หายไปจะไม่ถูกตรวจสอบ
- Frontend: ตัวตรวจสอบและตัวแปลงหัวตารางรองรับชื่อคอลัมน์ตามด้านบนอยู่แล้ว และไม่บังคับต้องมีทุกคอลัมน์ จึงไม่ต้องแก้ไขโค้ดเพิ่มเติม
- Prisma/API: โครงสร้างฐานข้อมูลยังเหมือนเดิม ไม่ต้องแก้สคีมา (เติมค่า `dc_code` แบบ fallback เมื่อไม่มีข้อมูล)

ผลลัพธ์: สามารถอัปโหลดไฟล์ตามเทมเพลตใหม่ได้ โดยระบบจะเติมค่าเริ่มต้น Distribution Channel และแม็ปคอลัมน์ที่เปลี่ยนชื่อให้อัตโนมัติ
3.1) ปรับหน้า Frontend Manual Entry และ Backend Manual API ให้สอดคล้องกับ Sample_Template.xlsx
- ฟอร์ม Manual Entry แสดง/บังคับเฉพาะคอลัมน์ตามเทมเพลต (หน่วยงาน, ชื่อบริษัท, SAP Code, SAPCode, ชื่อสินค้า, Pack Size, หน่วย, n+1..n+3)
- ตรวจสอบข้อมูลก่อนส่ง (ต้องกรอก หน่วยงาน/SAP Code/SAPCode/Pack Size/หน่วย อย่างน้อยหนึ่งเดือน)
- Payload ส่งเฉพาะฟิลด์เหล่านี้ไปที่ `/v1/manual` และ backend เติม `dc_code` เริ่มต้นเป็น `NA` หากเว้นว่าง

3.2) ปรับหน้า Frontend Preview History Data + Backend ให้แสดงผลตามเทมเพลตใหม่
- ตาราง History เหลือคอลัมน์ SAP Code, SAPCode, หน่วยงาน, ชื่อบริษัท, ชื่อสินค้า, Pack Size, หน่วย, n+1..n+3, Last_User, Action, Update_At
- Service `saleforecast` ต้องแนบ metadata months เฉพาะ n+1..n+3 ให้ frontend จัดรูปแบบตัวเลขได้ตรงกับไฟล์

4.) ในการสมัคร Signup (User ใหม่) ให้ทำการล็อคว่า Email Address จะต้องลงท้ายด้วย @betagro.com เท่านั้น รวมทั้งแสดงข้อความหากใส่ Email ไม่ถูกต้อง เช่น เมลล์นี้ถูกใช่งานแล้ว กรุณาระบบ Email ถูกต้อง ....@betagro.com
- Frontend SignupPage: เพิ่ม regex ตรวจสอบ `*@betagro.com`, แสดงข้อความ “กรุณาใช้อีเมล @betagro.com เท่านั้น” และกรณีซ้ำให้แจ้ง “เมลนี้ถูกใช้งานแล้ว...”
- Backend auth-service: เพิ่ม validation ใน schema/service เพื่อป้องกันเมลโดเมนอื่น และคืน error message ที่ front สามารถแสดงได้ทันที
- อัปเดต register route ให้ trim + lower case email/username และบังคับใช้ข้อความ error ภาษาไทย/อังกฤษที่ตรงกับ UX
- เพิ่ม error message frontend หน้า signup กรณีใช้ Email ซ้ำ ให้แสดงว่า Email นี้ถูกลงทะเบียนแล้ว

5.) หน้าต่างใหม่ให้ Admin ระบบ
  5.1) เพิ่ม User Admin อีก 3 User ดังนี้
    - User: AHBadmin@betagro.com Password: AhbP@ssw0rd1150
    - User: FEEDadmin@betagro.com Password: FeedP@ssw0rd1112
    - User: AGROSCMadmin@betagro.com Password: AGROSCMP@ssw0rd1169
    - เพิ่มบัญชีผ่าน seed script (`services/auth-service/prisma/seed.ts`) และสามารถกดซิงค์ซ้ำผ่านหน้า Admin > Sync Admin Accounts ได้
  - ให้เพิ่ม seed script หรือ admin console action ใน auth-service เพื่อสร้างผู้ใช้พร้อม role=Admin และบันทึกรหัสผ่านแบบ hash
  - เสนอให้มี toggle บังคับเปลี่ยนรหัสผ่านครั้งแรก และ UI ใหม่สำหรับแอดมินตรวจสอบ/รีเซ็ตรหัสผ่านผู้ใช้เหล่านี้
  - Seed script details: ใช้ Prisma + PasswordUtil.hash เพื่อสร้าง record หากยังไม่มี และ log ผลลัพธ์, สามารถรันซ้ำได้โดยไม่ duplicate (upsert ตาม email)
  - Admin UI (หน้าต่างใหม่):
      • ตารางรายชื่อ admin + สถานะ “ต้องเปลี่ยนรหัสผ่าน”
      • ปุ่ม Reset Password / Disable Account / Force MFA (ถ้ามี)
      • Audit log ผูกกับทุก action ที่กดจากหน้าดังกล่าว

6.) หน้า Frontend หน้า Preview History Data
  6.1) เพิ่มเงื่อนไขในการกรอง LAST_USER เข้าไปในช่องค้นหาข้อมูล
      - ปรับ data-service (`/v1/saleforecast`) ให้ดึง audit_logs ตามค่า user_username / user_email / performed_by / client_id ทำให้ค้นหา LAST_USER ได้จากช่องเดียวกับคีย์เวิร์ดอื่น ๆ
      - ปรับคำอธิบาย placeholder บนหน้า Preview History Data เพื่อแจ้งผู้ใช้ว่าสามารถค้นหาจาก Last_User ได้
  6.2) เพิ่มปุ่มสำหรับกด Confirm และ ยกเลิก Confirm ทั้งแบบทีละรายการ และแบบทั้งหมดที่มีการกรองอยู่
      - เพิ่มปุ่ม Confirm/Cancel ต่อแถวในตาราง History และผูกกับ metadata `confirmed`, `confirmed_by`, `confirmed_at`
      - เพิ่มปุ่ม Confirm Filtered / Cancel Confirm (Filtered) สำหรับทำงานตามข้อมูลที่ถูกกรอง พร้อม progress state / throttling ป้องกัน spam
      - แจ้งผลผ่าน toast/notice และบันทึก error ผ่านระบบ useErrorLog
  6.3) ให้เพิ่ม Column Confirm อีกหนึ่งคอลัม
      - ตาราง HistoryTable แสดงสถานะ Confirm (badge) และ tooltip รายละเอียดผู้อนุมัติ+เวลา รวมทั้ง export CSV เพิ่มคอลัมน์ `confirm_status`, `confirmed_by`, `confirmed_at`
 
7.) เพิ่มหน้า Frontend เมนู Monthly Access Control เฉพาะสิทธิ์ Admin ที่จะเห็น และจะสามารถเปลี่ยนสถานะข้อมูล Locked/Unlocked การใช้งาน User ของแต่ละเดือนได้ว่า จะสามารถบันทึก/แก้ไข/ลบ ข้อมูลได้หรือไม่ โดยออกแบบให้ beautiful premium professional
  - Role User จะมีสถานะ Unlocked เป็นค่าเริ่มต้นทุก Anchor_Month (ทุกต้นเดือน) ทั้งเดือนปัจจุบันและเดือนถัดไป เพื่อให้ Admin เป็นผู้เปลี่ยนสถานะเมื่อจำเป็น
  - รูปแบบตารางรายชื่อ User  Anchor_Month สถานะสิทธิ์
  - มีตัวกรองสามารถกรอง User  Anchor_Month สถานะสิทธิ์
 - มีปุ่ม Unlock All และ Lock all เป็นปุ่มเดียวกัน โดยดำเนินการเฉพาะข้อมูลที่ถูกกรองไว้อยู่
      - Backend (data-service) เพิ่มตาราง `monthly_access_control` + API `/v1/monthly-access` (GET/POST/PATCH/bulk-toggle) พร้อมบันทึก audit log เพื่อควบคุมสถานะ Anchor_Month ต่อผู้ใช้
      - Frontend สร้างหน้า `Monthly Access Control` (เฉพาะ Admin) มี Hero + Filter (ค้นหา, Anchor Month, สถานะ) + ปุ่ม Lock/Unlock All ที่สลับตามสถานะของผลลัพธ์ปัจจุบัน พร้อมสรุปจำนวนรายการที่ Locked/Unlocked
      - ตารางสไตล์ premium แสดง User / Anchor Month / Status / Updated At + ปุ่มล็อก-ปลดล็อกต่อแถว รวมถึงฟอร์มเพิ่มกฎการล็อก (กำหนด email, Username, Anchor Month, สถานะตั้งต้น)
      - เมนูนำทางเพิ่มรายการ “Monthly Access” ทั้ง desktop/mobile ปรากฏเฉพาะ Admin และ route `admin/monthly-access` เชื่อมกับหน้าใหม่
  
8.) Frontend หน้า Upload Data, Manual Entry 
  8.1) เมื่อกด Submit หากพบ Error จะต้องระบุว่า Error จากบรรทัดไหน
      - Manual Entry ตรวจสอบข้อมูลแต่ละแถวก่อนส่ง หากแถวใดขาดคอลัมน์สำคัญจะแจ้งข้อความ “บรรทัดที่ X” พร้อมชื่อฟิลด์ และเมื่อ ingest API ตอบกลับด้วยข้อความที่มี `Line #` ระบบจะ format ให้ผู้ใช้เห็นหมายเลขแถวชัดเจนทั้งใน Manual Entry และ Upload Data
      - Upload Data ดักจับข้อความ error ที่ตอบกลับจาก backend แล้วผูก line number (Line #/Row/บรรทัด) เพื่อแจ้งกรณีผิดพลาดหลังกด Submit โดยตรง
  8.2) เมื่อกด Submit ให้เช็คว่า Anchor Month ตรงกับเดือนในปัจจุบันหรือไม่ ถ้าไม่ตรงให้ Pop-Up เตือนว่าคุณกำลังอัพโหลดข้อมูลข้ามเดือน ยืนยันหรือไม่
      - เพิ่มตัวช่วย confirmCrossMonth ให้ทั้งปุ่ม Upload และ Manual Entry แจ้งเตือนเมื่อ Anchor Month ไม่ตรงเดือนปัจจุบัน และจะส่งต่อได้ต่อเมื่อผู้ใช้กดยืนยัน
 
9.) เพิ่มให้ระบบ default ข้อมูล Role User ให้มี Status Unlock ในเดือนปัจจุบัน และล่วงหน้า 1 เดือน
  - data-service เพิ่ม job/command (เช่น cron ภายใน service หรือ endpoint `/v1/monthly-access/seed-default`) สำหรับ upsert รายการ `monthly_access_control` ให้ Role=User ทุกคนใน 2 Anchor Month ล่าสุด (เดือนปัจจุบัน + เดือนถัดไป) โดย default เป็น `Unlocked`
      - สถานะล่าสุด: data-service มี API `POST /v1/monthly-access/seed-default` (ต้องมี `X-API-Key`) พร้อม cron job ภายใน service ที่เรียกทุก 24 ชั่วโมงและดึงรายชื่อ Role=User จาก auth-service เพื่อ ensure Anchor Month ปัจจุบัน + เดือนถัดไปเป็น `Unlocked` เสมอ
  - เมื่อสร้าง User ใหม่ (Role=User) ระบบ auth-service/data-service trigger ให้สร้างข้อมูล Monthly Access สำหรับ Anchor Month ปัจจุบันและเดือนถัดไปทันที โดยสถานะเริ่มต้นเป็น Unlocked
      - เมื่อ register เรียบร้อย auth-service จะยิงไปยัง endpoint ข้างต้นพร้อมข้อมูลผู้ใช้ (id/email/display name) เพื่อสร้างระเบียนปลดล็อกทั้ง 2 เดือนทันที
  - job ควรรันทุกวัน (หรืออย่างน้อยต้นเดือน) เพื่อค้ำประกันว่าหากมี Anchor Month ใหม่ถูกเพิ่มเข้ามา จะถูกเติมข้อมูลอัตโนมัติ
  - Role User ที่ถูกตั้งค่าสถานะ Locked จะไม่สามารถ Upload/Manual Entry/สร้าง/แก้ไข/ลบข้อมูล saleforecast ได้ ระบบ backend (ingest-service + data-service) จะตอบกลับรหัส 403 พร้อมข้อความ “ติดต่อ admin เพื่อปลดล็อค”

10.) แก้ไข Role User ติดสถานะ Locked จะไม่สามารถ Upload, เพิ่มข้อมูล, ลบหรือแก้ไขข้อมูลได้ โดยให้ขึ้น error message ว่า ติดต่อ admin เพื่อปลดล็อค
