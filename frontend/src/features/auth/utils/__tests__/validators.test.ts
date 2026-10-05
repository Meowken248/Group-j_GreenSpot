import { describe, it, expect } from "vitest";
import {
  normalizeFullName,
  validateFullName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  maskEmail,
  validateLoginPassword,
  sanitizeRedirectUrl,
} from "../validators";

describe("Auth Validators - Quy tắc kiểm tra từng ô chức năng #1", () => {
  describe("1. Kiểm tra Họ tên", () => {
    it("Cắt khoảng trắng đầu cuối và gộp khoảng trắng liền nhau", () => {
      expect(normalizeFullName("   Nguyễn   Thành    Đạt   ")).toBe("Nguyễn Thành Đạt");
    });

    it("Bắt lỗi khi để trống họ tên", () => {
      expect(validateFullName("")).toBe("Vui lòng nhập họ tên");
      expect(validateFullName("   ")).toBe("Vui lòng nhập họ tên");
    });

    it("Bắt lỗi khi họ tên dưới 2 ký tự", () => {
      expect(validateFullName("A")).toBe("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng");
    });

    it("Bắt lỗi khi họ tên chứa số", () => {
      expect(validateFullName("Nguyễn Đạt 123")).toBe("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng");
    });

    it("Bắt lỗi khi họ tên chứa ký tự đặc biệt", () => {
      expect(validateFullName("Nguyễn @ Đạt")).toBe("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng");
    });

    it("Bắt lỗi khi họ tên có khoảng trắng ở đầu hoặc cuối", () => {
      expect(validateFullName(" Lovuong")).toBe("Họ tên không được chứa khoảng trắng ở đầu hoặc cuối");
      expect(validateFullName("Lovuong ")).toBe("Họ tên không được chứa khoảng trắng ở đầu hoặc cuối");
    });

    it("Bắt lỗi khi họ tên chứa từ 2 khoảng trắng liên tiếp trở lên", () => {
      expect(validateFullName("Lov  uong")).toBe("Họ tên không được chứa nhiều khoảng trắng liên tiếp");
      expect(validateFullName("Nguyễn   Thành    Đạt")).toBe("Họ tên không được chứa nhiều khoảng trắng liên tiếp");
    });

    it("Chấp nhận họ tên tiếng Việt có dấu hợp lệ", () => {
      expect(validateFullName("Nguyễn Thành Đạt")).toBeNull();
      expect(validateFullName("Trần Lê Hoàng Oanh")).toBeNull();
      expect(validateFullName("Vũ Đình Khánh")).toBeNull();
      expect(validateFullName("Lov uong")).toBeNull();
    });
  });

  describe("2. Kiểm tra Email", () => {
    it("Bắt lỗi khi để trống email", () => {
      expect(validateEmail("")).toBe("Vui lòng nhập email");
      expect(validateEmail("   ")).toBe("Vui lòng nhập email");
    });

    it("Bắt lỗi khi email chứa khoảng trắng", () => {
      expect(validateEmail(" Lovuong@gmail.com")).toBe("Email không được chứa khoảng trắng");
      expect(validateEmail("Lovuong@gmail.com ")).toBe("Email không được chứa khoảng trắng");
      expect(validateEmail("Lov uong@gmail.com")).toBe("Email không được chứa khoảng trắng");
    });

    it("Bắt lỗi khi email sai định dạng", () => {
      expect(validateEmail("datnguyen")).toBe("Email không hợp lệ");
      expect(validateEmail("datnguyen@")).toBe("Email không hợp lệ");
      expect(validateEmail("datnguyen@gmail")).toBe("Email không hợp lệ");
      expect(validateEmail("datnguyen@.com")).toBe("Email không hợp lệ");
      expect(validateEmail("@gmail.com")).toBe("Email không hợp lệ");
      expect(validateEmail("Lovuong@gmail.,com")).toBe("Email không hợp lệ");
      expect(validateEmail("user@gmail,com")).toBe("Email không hợp lệ");
      expect(validateEmail("user,name@gmail.com")).toBe("Email không hợp lệ");
      expect(validateEmail("user@gmail..com")).toBe("Email không hợp lệ");
    });

    it("Chấp nhận email hợp lệ", () => {
      expect(validateEmail("dat.nguyen@greenspot.vn")).toBeNull();
      expect(validateEmail("user123@gmail.com")).toBeNull();
      expect(validateEmail("lovuong@gmail.com")).toBeNull();
    });
  });

  describe("3. Kiểm tra Mật khẩu", () => {
    it("Bắt lỗi khi để trống mật khẩu", () => {
      expect(validatePassword("")).toBe("Vui lòng nhập mật khẩu");
    });

    it("Bắt lỗi khi mật khẩu dưới 8 ký tự hoặc trên 32 ký tự", () => {
      expect(validatePassword("Abc1!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
      expect(validatePassword("A".repeat(33) + "a1!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
    });

    it("Bắt lỗi khi mật khẩu chứa khoảng trắng", () => {
      expect(validatePassword("Abc 12345!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
    });

    it("Bắt lỗi khi thiếu chữ hoa, chữ thường, số hoặc ký tự đặc biệt", () => {
      expect(validatePassword("abcdef123!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"); // thiếu hoa
      expect(validatePassword("ABCDEF123!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"); // thiếu thường
      expect(validatePassword("Abcdefgh!")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"); // thiếu số
      expect(validatePassword("Abcdefgh1")).toBe("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"); // thiếu ký tự đặc biệt
    });

    it("Chấp nhận mật khẩu hợp lệ với các ký tự đặc biệt trong tập quy định", () => {
      expect(validatePassword("GreenSpot@2026")).toBeNull();
      expect(validatePassword("Secure#Pass123")).toBeNull();
      expect(validatePassword("User_123$Pass")).toBeNull();
      expect(validatePassword("Pass!12345")).toBeNull();
      expect(validatePassword("Eco[2026]Safe")).toBeNull();
      expect(validatePassword("DatDatdemo123.")).toBeNull();
    });
  });

  describe("4. Kiểm tra Nhập lại mật khẩu", () => {
    it("Bắt lỗi khi để trống nhập lại mật khẩu", () => {
      expect(validateConfirmPassword("", "GreenSpot@2026")).toBe("Vui lòng nhập lại mật khẩu");
    });

    it("Bắt lỗi khi nhập lại mật khẩu không khớp", () => {
      expect(validateConfirmPassword("GreenSpot@2025", "GreenSpot@2026")).toBe("Mật khẩu nhập lại không khớp");
    });

    it("Chấp nhận khi nhập lại mật khẩu khớp chính xác", () => {
      expect(validateConfirmPassword("GreenSpot@2026", "GreenSpot@2026")).toBeNull();
    });
  });

  describe("5. Kiểm tra Che email (maskEmail) cho Màn 2", () => {
    it("Che đúng 2 ký tự đầu + *** + domain", () => {
      expect(maskEmail("dat@gmail.com")).toBe("da***@gmail.com");
      expect(maskEmail("nguyenvana@gmail.com")).toBe("ng***@gmail.com");
      expect(maskEmail("thanhdat@greenspot.vn")).toBe("th***@greenspot.vn");
    });

    it("Xử lý an toàn khi email rỗng", () => {
      expect(maskEmail("")).toBe("");
    });
  });

  describe("6. Kiểm tra Mật khẩu Đăng nhập & Tham số redirect (Chức năng 2)", () => {
    it("Bắt lỗi khi để trống mật khẩu đăng nhập", () => {
      expect(validateLoginPassword("")).toBe("Vui lòng nhập mật khẩu");
    });

    it("Chấp nhận mật khẩu đăng nhập bất kỳ không rỗng", () => {
      expect(validateLoginPassword("123456")).toBeNull();
      expect(validateLoginPassword("anySimplePassword")).toBeNull();
    });

    it("Kiểm tra tham số redirect an toàn", () => {
      // Hợp lệ: bắt đầu bằng 1 dấu / và không có //
      expect(sanitizeRedirectUrl("/groups")).toBe("/groups");
      expect(sanitizeRedirectUrl("/devices")).toBe("/devices");
      expect(sanitizeRedirectUrl("/geo-feed?sort=newest")).toBe("/geo-feed?sort=newest");

      // Không hợp lệ: bắt đầu bằng // (chống Open Redirect)
      expect(sanitizeRedirectUrl("//google.com")).toBe("/geo-feed");
      expect(sanitizeRedirectUrl("//malicious.site/login")).toBe("/geo-feed");

      // Rỗng hoặc null: trả về mặc định
      expect(sanitizeRedirectUrl(null)).toBe("/geo-feed");
      expect(sanitizeRedirectUrl("")).toBe("/geo-feed");
    });
  });
});

