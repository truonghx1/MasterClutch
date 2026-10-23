# CLUTCH — Tập lái số sàn

## Âm thanh động cơ

Cả bản điện thoại và desktop có tiếng động cơ tổng hợp trực tiếp bằng Web Audio, không cần tải tệp âm thanh. Tiếng máy bắt đầu sau khi chạm **Bắt đầu lái** hoặc thao tác lái trên desktop. Nút **🔊 / 🔇** bật/tắt tiếng; tạm dừng, mở hướng dẫn, chuyển ứng dụng hoặc xoay dọc trên bản mobile sẽ ngắt âm thanh.

- Cao độ bám theo vòng tua thật của mô phỏng: đạp ga khi ngắt côn vẫn nghe máy vút lên dù xe đứng yên.
- Lực truyền qua côn làm đổi độ nặng và âm sắc. Khi nhả côn bắt tải, vòng tua tụt; thay số và nhả côn làm tiếng máy đổi theo tốc độ động cơ mới.
- Máy hụt tua dưới tải có tiếng rung; gần giới hạn tua có tiếng ngắt nhịp. Nhả ga khi đang gài số có tiếng ghì máy. Tắt máy làm mất tiếng nổ, khởi động lại có tiếng máy trở lại.

Đây là âm thanh tổng hợp của một động cơ 4 xi-lanh giả định, không phải bản thu của một mẫu xe cụ thể. Khi trình duyệt không hỗ trợ âm thanh, mô phỏng vẫn hoạt động. Kiểm thử âm thanh nằm trong `tests/audio.test.js` và `e2e/audio.spec.js`, bao gồm đo tín hiệu đầu ra Web Audio và vòng đời bật/tắt tiếng. Kiểm thử tín hiệu tự bỏ qua nếu bản trình duyệt không có Web Audio (như Playwright WebKit trên Windows); cần nghe thử trên điện thoại thật để đánh giá âm sắc và độ trễ.

## Bản điện thoại chơi ngang — branch `feature/mobile-landscape`

Trang `/` trên branch này là bản mobile: xoay ngang điện thoại rồi chạm **Bắt đầu lái**. Trang `/desktop.html` giữ giao diện desktop trước đó. Mô hình xe và các bài tập dùng chung.

- Toàn bộ điều khiển nằm trong một màn hình ngang: côn bên trái, số ở giữa, phanh/ga bên phải; không cần cuộn khi chơi.
- Côn, phanh và ga: chạm giữ rồi vuốt lên để tăng, xuống để giảm. Dừng vuốt hoặc nhấc tay đều giữ nguyên mức; lần chạm sau điều chỉnh tiếp từ mức đang có. Chạm đơn không thay đổi mức. Vuốt xuống 0% để nhả hết.
- Xe bắt đầu với phanh tay đang giữ. Khởi hành bằng số 1, thêm ga, nhả côn tới điểm bắt rồi chạm nhả phanh tay.
- Khi tắt máy, đưa côn và phanh lên 100%, ga về 0%, rồi chạm **Bật động cơ** phía trên bàn đạp côn để khởi động lại tại chỗ. Nút **Chi tiết** tạm dừng và mở giải thích lỗi/nhật ký.
- Mỗi bài tập lặp lại các đoạn đường không giới hạn, giữ nguyên xe, thời gian và nhật ký khi qua cuối chặng. Người chơi tự chọn bài khác ở thanh trên khi muốn đổi.
- Xoay về dọc, chuyển ứng dụng hoặc mất tiêu điểm sẽ tạm dừng và hủy thao tác chạm, giữ nguyên mức bàn đạp đã chọn. Chạm **Tiếp tục** khi quay lại; **Tập lại** đặt lại xe và các mức bàn đạp.
- Nút toàn màn hình là tùy chọn. Nếu trình duyệt không hỗ trợ, bật tự động xoay và cầm ngang để chơi trong trình duyệt bình thường.

### Thử bằng điện thoại trong cùng Wi-Fi

```sh
npm run start:lan
```

Mở `http://<IP-LAN-của-máy-tính>:5173` trên điện thoại; ví dụ `http://192.168.1.10:5173`. Dùng `ipconfig` trên Windows để xem IPv4 của Wi-Fi. Nếu Windows hỏi quyền mạng cho Node.js, cho phép trên mạng riêng đang dùng. `localhost` trên điện thoại là chính điện thoại, không phải máy tính.

### Push và deploy branch mobile

```sh
git push -u origin feature/mobile-landscape
```

Nếu Vercel đã nối repository, mở Preview Deployment của branch này để thử. Để dùng bản mobile làm website chính, chọn branch này làm Production Branch trong cấu hình Git của Vercel hoặc merge khi bạn muốn. Cấu hình output vẫn là `dist`, không cần build.

### Kiểm thử bản mobile

```sh
npm ci
npx playwright install webkit
npm test
npm run test:e2e
```

Trên Windows, kiểm thử Chromium dùng Microsoft Edge đã cài. Trên Linux/macOS chạy thêm `npx playwright install chromium`. Kiểm thử gồm kích thước màn hình ngang, vuốt và giữ mức cả ba bàn đạp, khởi hành bằng đa chạm, khởi động lại sau tắt máy, chạy qua cuối chặng, chọn bài, xoay máy và tạm dừng. Chromium và WebKit kiểm tra giao diện và thao tác bàn đạp; kiểm thử đa chạm gốc dùng Chromium CDP. Giả lập trình duyệt không thay thế kiểm tra trên thiết bị iOS/Android thật.

## Bản desktop (`/desktop.html`)

Mặc định là góc nhìn người ngồi trong khoang xe, có hai tay trên vô-lăng, gương, cần số và đồng hồ chạy theo trạng thái xe. Nút **Góc nhìn** chuyển về hình xe nhìn từ bên ngoài. Không cần đánh lái.

Điện thoại hỗ trợ màn hình dọc và ngang. Giữ bàn đạp bằng nhiều ngón đồng thời; giữ Côn đến 100% rồi dùng ngón khác chọn số. Khi thả côn, mô phỏng tự nhả dần. Xoay ngang để bố trí khoang lái bên trái và bàn đạp bên phải. Không yêu cầu cài ứng dụng.

## Deploy lên Vercel từ GitHub

1. Push thư mục dự án này lên repository GitHub của bạn, bao gồm `dist/` và `vercel.json`.
2. Trong Vercel chọn **Add New → Project**, import repository đó vào tài khoản Hobby.
3. Giữ **Root Directory** ở thư mục gốc. **Framework Preset: Other**.
4. Cấu hình trong `vercel.json` đặt **Output Directory: dist**, bỏ qua install và build vì đây là website tĩnh. Không cần chạy `npm start` trên Vercel, không cần biến môi trường.
5. Chọn **Deploy**. Các lần push sau vào nhánh production sẽ cập nhật website nếu bật tích hợp Git tự động.

Vercel Hobby dành cho sử dụng cá nhân, phi thương mại: https://vercel.com/docs/limits/fair-use-guidelines . Hướng dẫn build tĩnh: https://vercel.com/docs/builds/configure-a-build . Dự án không cần backend hoặc cơ sở dữ liệu.

Ứng dụng HTML/CSS/JavaScript, không cần cài thư viện.

## Chạy thử

Yêu cầu Node.js 20 trở lên. Trong thư mục dự án:

```sh
npm start
```

Mở http://127.0.0.1:5173. Kiểm thử mô hình xe: `npm test`.

## Điều khiển

- Giữ A: đạp côn; thả A: côn tự nhả dần trong khoảng 1,5 giây.
- Giữ J: phanh; giữ L: ga.
- 1–5: số tiến; 6: số lùi; N: số mo.
- Enter: khởi động lại; Space: tạm dừng.
- H hoặc nút Phanh tay: bật/tắt phanh tay để giữ xe khi đề-pa dốc.
- S hoặc nút Giữ mức côn: giữ nguyên vị trí côn hiện tại; bấm lần nữa để nhả tiếp. Đạp A luôn hủy giữ mức và đạp hết côn. Đây là hỗ trợ thao tác bàn phím/cảm ứng, không phải cơ cấu khóa côn trên xe thật.
- Các bàn đạp hỗ trợ chạm giữ đồng thời trên màn hình cảm ứng.

Ba bài tập có các đoạn đường bằng, lên và xuống dốc dài khác nhau. Nhật ký giải thích lỗi gài số, vượt vòng tua, tắt máy, trôi lùi, động cơ ì và thả trôi xuống dốc. Dừng mô phỏng khi mất tiêu điểm để tránh kẹt phím.

Mô hình vật lý được đơn giản hóa để luyện phối hợp bàn phím; không mô phỏng đầy đủ cảm giác bàn đạp hoặc thay thế thực hành trên xe. Phông Google Fonts có phông hệ thống dự phòng. Không lưu dữ liệu người dùng.

## Nguyên lý và phạm vi bài tập

- Côn truyền tải giữa động cơ và bánh xe. Tải quá lớn làm vòng tua tụt và tắt máy; số cao ở tốc độ thấp, phanh giữ xe khi côn bắt, hoặc trôi ngược chiều số có thể gây tắt máy.
- Không ga không đồng nghĩa luôn tắt máy: nhả côn đủ chậm ở số 1 trên đường bằng có thể làm xe bò. Dùng Giữ mức côn để giữ điểm bắt trong lúc xe tăng tốc.
- Ga vừa đủ kết hợp nhả côn dần giúp khởi hành. Khi phanh dừng, đạp côn trước khi vòng tua tụt quá thấp.
- Đề-pa dốc: giữ phanh chân, bật phanh tay, đạp côn và chọn số 1. Nhả phanh chân, thêm ga, nhả côn tới điểm bắt; nhả phanh tay khi đủ lực kéo. Nếu trôi, phanh dừng và thử lại. Không giữ xe lâu trên dốc bằng côn trượt.
- Giới hạn tua khoảng 6.000 RPM giảm lực kéo khi giữ ga. Nó không ngăn bánh xe ép động cơ quá tua khi xuống dốc; khi đó cần phanh giảm tốc. Bài tập chặn thao tác về số gây quá tua.
- Các ngưỡng chỉ là cấu hình một xe giả định; không mô phỏng hỏng hóc, hao mòn, nhiệt côn hoặc hỗ trợ giữ dốc tự động.
