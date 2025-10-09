FROM nginx:alpine AS production

# คัดลอกไฟล์ static ที่ build ไว้ล่วงหน้า
COPY dist /usr/share/nginx/html

# คงค่า nginx.conf ที่ตั้งค่า reverse proxy / headers ไว้
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
