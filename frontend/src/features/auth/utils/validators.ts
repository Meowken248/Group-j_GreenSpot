/**
 * Bộ kiểm tra biểu thức chính quy và quy tắc nghiệp vụ cho tính năng Đăng ký tài khoản
 * Tuân thủ 100% tài liệu đặc tả chức năng #1 của GreenSpot
 */

/** Chuẩn hóa họ tên: cắt khoảng trắng đầu/cuối và gộp nhiều khoảng trắng liền nhau thành một */
export const normalizeFullName = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Kiểm tra Họ tên:
 * - Bắt buộc.
 * - Sau khi chuẩn hóa: độ dài từ 2 đến 50 ký tự.
 * - Chỉ gồm chữ cái (có dấu tiếng Việt) và khoảng trắng, không chứa số hay ký tự đặc biệt.
 */
export const validateFullName = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return 'Vui lòng nhập họ tên';
  }

  // Cấm khoảng trắng ở đầu hoặc cuối chuỗi
  if (value.startsWith(' ') || value.endsWith(' ')) {
    return 'Họ tên không được chứa khoảng trắng ở đầu hoặc cuối';
  }

  // Cấm từ 2 khoảng trắng liên tiếp trở lên trong đoạn text
  if (/\s{2,}/.test(value)) {
    return 'Họ tên không được chứa nhiều khoảng trắng liên tiếp';
  }

  if (value.length < 2 || value.length > 50) {
    return 'Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng';
  }

  // Cho phép chữ cái tiếng Việt và khoảng trắng, từ chối số và ký tự đặc biệt
  const nameRegex = /^[\p{L}\s]+$/u;
  if (!nameRegex.test(value)) {
    return 'Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng';
  }

  return null;
};

/**
 * Kiểm tra Email:
 * - Bắt buộc.
 * - Tối đa 254 ký tự.
 * - Tuyệt đối không chứa khoảng trắng ở bất kỳ vị trí nào.
 * - Đúng định dạng chuẩn RFC
 */
export const validateEmail = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return 'Vui lòng nhập email';
  }

  // Cấm hoàn toàn khoảng trắng ở bất kỳ vị trí nào (đầu, cuối hoặc giữa)
  if (/\s/.test(value)) {
    return 'Email không được chứa khoảng trắng';
  }

  // Cấm chữ in hoa
  if (/[A-Z]/.test(value)) {
    return 'Email không được chứa chữ in hoa';
  }

  if (value.length > 254) {
    return 'Email không hợp lệ';
  }

  // Chặn dấu phẩy hoặc hai dấu chấm liên tiếp
  if (value.includes(',') || value.includes('..')) {
    return 'Email không hợp lệ';
  }

  // Chuẩn RFC: local-part @ domain-labels . tld (TLD chỉ gồm chữ cái, tối thiểu 2 ký tự, chỉ chữ thường)
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(value)) {
    return 'Email không hợp lệ';
  }

  return null;
};

/**
 * Kiểm tra Mật khẩu:
 * - Bắt buộc.
 * - Từ 8 đến 32 ký tự, không chứa khoảng trắng.
 * - Có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt thuộc tập: `!@#$%^&*()_+-=[]{}`
 */
export const validatePassword = (value: string): string | null => {
  if (!value || value.length === 0) {
    return 'Vui lòng nhập mật khẩu';
  }

  // Không chứa khoảng trắng và độ dài từ 8 đến 32
  if (value.includes(' ') || value.length < 8 || value.length > 32) {
    return 'Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  // Hỗ trợ tập ký tự đặc biệt đầy đủ bao gồm dấu chấm (.), dấu phẩy, hai chấm, hỏi chấm, gạch chéo...
  const hasSpecial = /[`!@#$%^&*()_+\-=[\]{}.:;,?\/~]/.test(value);

  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return 'Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
  }

  return null;
};

/**
 * Kiểm tra Nhập lại mật khẩu:
 * - Bắt buộc.
 * - Phải trùng khớp tuyệt đối với ô Mật khẩu.
 */
export const validateConfirmPassword = (confirmValue: string, passwordValue: string): string | null => {
  if (!confirmValue || confirmValue.length === 0) {
    return 'Vui lòng nhập lại mật khẩu';
  }

  if (confirmValue !== passwordValue) {
    return 'Mật khẩu nhập lại không khớp';
  }

  return null;
};

/**
 * Che bớt địa chỉ email theo đặc tả Màn 2:
 * Hiển thị 2 ký tự đầu của phần tên, theo sau là *** rồi đến phần tên miền
 * Ví dụ: nguyenvana@gmail.com -> ng***@gmail.com, dat@gmail.com -> da***@gmail.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email || '';
  const atIndex = email.indexOf('@');
  const namePart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex);

  const prefix = namePart.substring(0, 2);
  return `${prefix}***${domainPart}`;
};

/**
 * Kiểm tra Mật khẩu ở Màn Đăng nhập:
 * - Bắt buộc.
 * - Tối đa 32 ký tự.
 * - Tuyệt đối không kiểm tra độ mạnh ở màn đăng nhập.
 */
export const validateLoginPassword = (value: string): string | null => {
  if (!value || value.length === 0) {
    return 'Vui lòng nhập mật khẩu';
  }
  return null;
};

/**
 * Kiểm tra an toàn cho tham số redirect:
 * - Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng đúng 1 dấu / và không bắt đầu bằng //
 * - Nếu sai hoặc không có, trả về defaultPath ('/geo-feed')
 */
export const sanitizeRedirectUrl = (redirectParam: string | null | undefined, defaultPath = '/geo-feed'): string => {
  if (!redirectParam) return defaultPath;
  const trimmed = redirectParam.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return defaultPath;
};

