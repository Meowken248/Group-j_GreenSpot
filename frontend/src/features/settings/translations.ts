/**
 * i18n Translations for User Settings & Security Domain (Chức năng 7)
 * Cung cấp từ điển song ngữ VI / EN hỗ trợ cơ chế xem trước tức thì (instant preview)
 */

import type { LanguageCode } from "./types";

export const translations = {
  VI: {
    pageTitle: "Cài đặt tài khoản & Trải nghiệm",
    pageSubtitle: "Tùy chỉnh chế độ hiển thị giao diện, ngôn ngữ hệ thống và quản trị an toàn thông tin",
    tabGeneral: "Cài đặt chung",
    tabPassword: "Đổi mật khẩu",

    // Khối GIAO DIỆN (Cột 1)
    colThemeTitle: "GIAO DIỆN",
    colThemeDesc: "Chọn phong cách hiển thị phù hợp với thị giác của bạn. Thay đổi được áp dụng xem trước tức thì.",
    themeLightTitle: "Chế độ sáng",
    themeLightDesc: "Tối ưu hóa độ tương phản cho môi trường ban ngày và không gian sáng rõ.",
    themeDarkTitle: "Chế độ tối",
    themeDarkDesc: "Dịu mắt, tiết kiệm năng lượng cho thiết bị và phù hợp điều kiện ánh sáng yếu.",

    // Khối NGÔN NGỮ (Cột 2)
    colLangTitle: "NGÔN NGỮ",
    colLangDesc: "Lựa chọn ngôn ngữ sử dụng chính cho giao diện và các thông báo số liệu khí hậu.",
    langViTitle: "Tiếng Việt",
    langViDesc: "Hiển thị nội dung đầy đủ bằng tiếng Việt chuẩn quốc gia.",
    langEnTitle: "English",
    langEnDesc: "Displays full UI elements, reports, and metadata in English.",

    // Khối LƯU CÀI ĐẶT (Cột 3)
    colSaveTitle: "LƯU CÀI ĐẶT",
    colSaveDesc: "Lưu trữ cấu hình vào thiết bị và đồng bộ an toàn lên máy chủ GreenSpot.",
    btnSave: "LƯU THAY ĐỔI",
    btnReset: "ĐẶT LẠI MẶC ĐỊNH",
    noChangesToast: "Bạn chưa thay đổi cấu hình nào",
    syncSuccessToast: "Cấu hình đã được lưu và đồng bộ thành công!",
    conflictErrorToast: "Cấu hình đã được thay đổi từ một thiết bị khác. Đang tải lại dữ liệu mới nhất...",

    // Màn 2: ĐỔI MẬT KHẨU
    pwdTitle: "Thay đổi mật khẩu tài khoản",
    pwdSubtitle: "Vui lòng nhập mật khẩu hiện tại và tạo mật khẩu mới tuân thủ nghiêm ngặt tiêu chuẩn bảo mật.",
    lblCurrentPwd: "Mật khẩu hiện tại",
    placeholderCurrentPwd: "Nhập mật khẩu bạn đang sử dụng",
    lblNewPwd: "Mật khẩu mới",
    placeholderNewPwd: "Nhập mật khẩu mới (tối thiểu 8 ký tự)",
    lblConfirmPwd: "Xác nhận mật khẩu mới",
    placeholderConfirmPwd: "Nhập lại mật khẩu mới",
    pwdReqTitle: "Quy chuẩn an toàn mật khẩu:",
    reqLength: "Tối thiểu 8 ký tự",
    reqUppercase: "Ít nhất 1 chữ in hoa (A-Z)",
    reqLowercase: "Ít nhất 1 chữ in thường (a-z)",
    reqDigit: "Ít nhất 1 chữ số (0-9)",
    reqSpecial: "Ít nhất 1 ký tự đặc biệt (@$!%*?&...)",
    btnCancel: "HỦY",
    btnSubmitPwd: "CẬP NHẬT MẬT KHẨU",
    btnUpdatingPwd: "Đang cập nhật...",
    pwdSuccessToast: "Đổi mật khẩu thành công. Hệ thống sẽ tự động đăng xuất sau 3 giây để đảm bảo an toàn.",
    pwdMismatchError: "Mật khẩu xác nhận không trùng khớp với mật khẩu mới.",
    pwdWeakError: "Mật khẩu mới chưa đáp ứng đủ các tiêu chuẩn bảo mật bắt buộc.",
    pwdSameError: "Mật khẩu mới không được trùng với mật khẩu hiện tại.",

    // Màn 3: POPUP ĐÃ LƯU CÀI ĐẶT
    modalSavedTitle: "ĐÃ LƯU CÀI ĐẶT",
    modalSavedDesc: "Cài đặt giao diện và ngôn ngữ đã được cập nhật thành công và áp dụng cho toàn bộ hệ thống.",
    modalSavedThemeLabel: "Chế độ giao diện:",
    modalSavedLangLabel: "Ngôn ngữ hệ thống:",
    btnClose: "Đóng",

    // POPUP XÁC NHẬN HỦY
    modalDiscardTitle: "Xác nhận hủy thay đổi",
    modalDiscardDesc: "Bạn có dữ liệu mật khẩu chưa lưu. Bạn có chắc chắn muốn hủy bỏ và xóa sạch các thông tin đã nhập?",
    btnKeepEditing: "Tiếp tục nhập",
    btnConfirmDiscard: "Đồng ý hủy",

    // Header & Footer
    headerBack: "Quay lại Bản đồ",
    headerUserGreeting: "Xin chào",
    footerCopyright: "Bản quyền © 2026 GreenSpot EcoReport TP.HCM. Bảo lưu mọi quyền.",
    footerContact: "Liên hệ hỗ trợ",
    footerPrivacy: "Chính sách bảo mật",
    footerTerms: "Điều khoản dịch vụ",
  },
  EN: {
    pageTitle: "Account & Experience Settings",
    pageSubtitle: "Customize interface display mode, system language, and manage account security",
    tabGeneral: "General Settings",
    tabPassword: "Change Password",

    // Khối GIAO DIỆN (Cột 1)
    colThemeTitle: "THEME INTERFACE",
    colThemeDesc: "Select the display style tailored to your vision. Changes are previewed instantly.",
    themeLightTitle: "Light Mode",
    themeLightDesc: "Optimized contrast for daytime work and brightly lit spaces.",
    themeDarkTitle: "Dark Mode",
    themeDarkDesc: "Gentle on eyes, saves device power, and ideal for low-light environments.",

    // Khối NGÔN NGỮ (Cột 2)
    colLangTitle: "SYSTEM LANGUAGE",
    colLangDesc: "Choose your primary language for user interfaces and climate alerts.",
    langViTitle: "Tiếng Việt",
    langViDesc: "Full system content rendered in standard Vietnamese.",
    langEnTitle: "English",
    langEnDesc: "Displays full UI elements, reports, and metadata in English.",

    // Khối LƯU CÀI ĐẶT (Cột 3)
    colSaveTitle: "SAVE SETTINGS",
    colSaveDesc: "Persist preferences locally and sync securely with the GreenSpot server.",
    btnSave: "SAVE CHANGES",
    btnReset: "RESET TO DEFAULT",
    noChangesToast: "You have not changed any preferences yet",
    syncSuccessToast: "Preferences saved and synchronized successfully!",
    conflictErrorToast: "Settings were updated from another device. Reloading latest data...",

    // Màn 2: ĐỔI MẬT KHẨU
    pwdTitle: "Change Account Password",
    pwdSubtitle: "Please enter your current password and create a new password meeting strict security criteria.",
    lblCurrentPwd: "Current Password",
    placeholderCurrentPwd: "Enter your active password",
    lblNewPwd: "New Password",
    placeholderNewPwd: "Enter new password (at least 8 chars)",
    lblConfirmPwd: "Confirm New Password",
    placeholderConfirmPwd: "Re-enter new password",
    pwdReqTitle: "Security standard requirements:",
    reqLength: "At least 8 characters",
    reqUppercase: "At least 1 uppercase letter (A-Z)",
    reqLowercase: "At least 1 lowercase letter (a-z)",
    reqDigit: "At least 1 numerical digit (0-9)",
    reqSpecial: "At least 1 special character (@$!%*?&...)",
    btnCancel: "CANCEL",
    btnSubmitPwd: "UPDATE PASSWORD",
    btnUpdatingPwd: "Updating...",
    pwdSuccessToast: "Password updated successfully. Logging out automatically in 3 seconds for security.",
    pwdMismatchError: "Password confirmation does not match the new password.",
    pwdWeakError: "New password does not meet required security standards.",
    pwdSameError: "New password cannot be the same as current password.",

    // Màn 3: POPUP ĐÃ LƯU CÀI ĐẶT
    modalSavedTitle: "SETTINGS SAVED",
    modalSavedDesc: "Theme and language preferences have been successfully updated and applied system-wide.",
    modalSavedThemeLabel: "Display Theme:",
    modalSavedLangLabel: "System Language:",
    btnClose: "Close",

    // POPUP XÁC NHẬN HỦY
    modalDiscardTitle: "Confirm Discard Changes",
    modalDiscardDesc: "You have unsaved password input. Are you sure you want to discard and clear the form?",
    btnKeepEditing: "Keep Editing",
    btnConfirmDiscard: "Discard Changes",

    // Header & Footer
    headerBack: "Back to Map",
    headerUserGreeting: "Welcome",
    footerCopyright: "Copyright © 2026 GreenSpot EcoReport HCMC. All rights reserved.",
    footerContact: "Support Contact",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
  },
};

export const getT = (lang: LanguageCode) => translations[lang] || translations.VI;
