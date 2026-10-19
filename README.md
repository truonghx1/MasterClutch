# CLUTCH — Tập lái số sàn

## Bản PC trên nhánh develop

Mặc định là góc nhìn người ngồi trong khoang xe, có hai tay trên vô-lăng, gương, cần số và đồng hồ chạy theo trạng thái xe. Nút **Góc nhìn** chuyển về hình xe nhìn từ bên ngoài. Không cần đánh lái.

Trên PC, bài tập và nhật ký ở bên trái, khung nhìn đường thu gọn ở trên, thông số xe và độ dốc ở giữa, bàn đạp và hộp số ở dưới cùng. Các điều khiển chính nằm trong màn hình laptop từ 1280×720. Có thể dùng bàn phím, nhấn giữ nút tăng/giảm hoặc kéo thanh mức bằng chuột. Giao diện tự xếp lại khi cửa sổ nhỏ hơn.

Mỗi lần nhấn chỉnh 3%. Giữ phím quá 0,15 giây sẽ tăng/giảm đều 30 điểm phần trăm mỗi giây; tốc độ không phụ thuộc tính năng lặp phím của hệ điều hành. Thả phím giữ nguyên mức, không tự nhả. Xe bắt đầu với côn 100% và phanh tay đang giữ.

## Deploy lên Vercel từ GitHub

1. Push thư mục dự án này lên repository GitHub của bạn, bao gồm `dist/` và `vercel.json`.
2. Trong Vercel chọn **Add New → Project**, import repository đó vào tài khoản Hobby.
3. Giữ **Root Directory** ở thư mục gốc. **Framework Preset: Other**.
4. Cấu hình trong `vercel.json` đặt **Output Directory: dist**, bỏ qua install và build vì đây là website tĩnh. Không cần chạy `npm start` trên Vercel, không cần biến môi trường.
5. Chọn **Deploy**. Các lần push sau vào nhánh production sẽ cập nhật website nếu bật tích hợp Git tự động.

Vercel Hobby dành cho sử dụng cá nhân, phi thương mại: https://vercel.com/docs/limits/fair-use-guidelines . Hướng dẫn build tĩnh: https://vercel.com/docs/builds/configure-a-build . Dự án không cần backend hoặc cơ sở dữ liệu.

Ứng dụng HTML/CSS/JavaScript, không cần cài thư viện.

## Chạy

Yêu cầu Node.js 20 trở lên. Trong thư mục dự án:

```sh
npm start
```

Mở http://127.0.0.1:5173. Kiểm thử mô hình xe: `npm test`.

## Điều khiển

- Q tăng côn, A giảm côn.
- I tăng phanh, K giảm phanh.
- O tăng ga, L giảm ga.
- Nhấn ngắn chỉnh 3%; giữ để chỉnh đều; thả phím giữ mức. Có thể giữ nhiều phím đồng thời. Hai phím ngược chiều của cùng bàn đạp triệt tiêu nhau.
- 1–5: số tiến; 6: số lùi; N: số mo.
- Enter: khởi động lại; Space: tạm dừng.
- H hoặc nút Phanh tay: bật/tắt phanh tay để giữ xe khi đề-pa dốc.
- Khi tắt máy, đưa côn lên 100% bằng Q, tăng phanh bằng I, giảm ga về 0% bằng L, rồi nhấn Enter hoặc **Bật động cơ** để đề lại tại chỗ.
- Tạm dừng hoặc chuyển cửa sổ sẽ hủy các phím đang giữ, giữ nguyên vị trí bàn đạp. **Tập lại** hoặc chọn bài khác đưa xe và các mức bàn đạp về ban đầu.

Ba bài tập có các đoạn đường bằng, lên và xuống dốc dài khác nhau. Đường lặp lại liên tục trong cùng bài, không tự kết thúc hay chuyển bài; người chơi chủ động chọn bài khác. Nhật ký giải thích lỗi gài số, vượt vòng tua, tắt máy, trôi lùi, động cơ ì và thả trôi xuống dốc.

## Kiểm thử PC

```sh
npm ci
npm test
npm run test:e2e
```

Trên Windows, kiểm thử trình duyệt dùng Microsoft Edge. Trên Linux/macOS, chạy `npx playwright install chromium` trước. Các ca kiểm thử bao gồm sáu phím bàn đạp, tốc độ giữ phím, giữ mức sau nhả, phối hợp nhiều phím, tạm dừng/mất tiêu điểm, khởi động lại, đổi bài và bố cục 1280×720, 1366×768, 1920×1080.

Mô hình vật lý được đơn giản hóa để luyện phối hợp bàn phím; không mô phỏng đầy đủ cảm giác bàn đạp hoặc thay thế thực hành trên xe. Phông Google Fonts có phông hệ thống dự phòng. Không lưu dữ liệu người dùng.

## Nguyên lý và phạm vi bài tập

- Côn truyền tải giữa động cơ và bánh xe. Tải quá lớn làm vòng tua tụt và tắt máy; số cao ở tốc độ thấp, phanh giữ xe khi côn bắt, hoặc trôi ngược chiều số có thể gây tắt máy.
- Không ga không đồng nghĩa luôn tắt máy: nhả côn đủ chậm ở số 1 trên đường bằng có thể làm xe bò. Thả phím A để giữ côn ở điểm bắt trong lúc xe tăng tốc.
- Ga vừa đủ kết hợp nhả côn dần giúp khởi hành. Khi phanh dừng, đạp côn trước khi vòng tua tụt quá thấp.
- Đề-pa dốc: giữ phanh chân, bật phanh tay, đạp côn và chọn số 1. Nhả phanh chân, thêm ga, nhả côn tới điểm bắt; nhả phanh tay khi đủ lực kéo. Nếu trôi, phanh dừng và thử lại. Không giữ xe lâu trên dốc bằng côn trượt.
- Giới hạn tua khoảng 6.000 RPM giảm lực kéo khi giữ ga. Nó không ngăn bánh xe ép động cơ quá tua khi xuống dốc; khi đó cần phanh giảm tốc. Bài tập chặn thao tác về số gây quá tua.
- Các ngưỡng chỉ là cấu hình một xe giả định; không mô phỏng hỏng hóc, hao mòn, nhiệt côn hoặc hỗ trợ giữ dốc tự động.
