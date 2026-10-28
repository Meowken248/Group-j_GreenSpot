import React, { useState, useEffect, useRef } from "react";
import type { UserProfile, UpdateProfilePayload } from "../types/profile.types";

interface EditProfileViewProps {
  userProfile: UserProfile;
  onSave: (payload: UpdateProfilePayload, coverFile?: File | null, avatarFile?: File | null) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  userProfile,
  onSave,
  onCancel,
  saving,
}) => {
  // Giá trị ban đầu
  const initialName = userProfile.full_name || "";
  const initialBio = userProfile.bio || "";
  const initialDob = userProfile.date_of_birth
    ? String(userProfile.date_of_birth).split("T")[0]
    : "";

  // Trạng thái Form
  const [fullName, setFullName] = useState<string>(initialName);
  const [bio, setBio] = useState<string>(initialBio);
  const [dob, setDob] = useState<string>(initialDob);

  // File ảnh & preview
  const [coverPreview, setCoverPreview] = useState<string | null>(userProfile.cover_image_url || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile.avatar_url || null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  // Lỗi validation
  const [nameError, setNameError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Tự động đặt con trỏ vào ô Họ tên khi mở màn hình
  useEffect(() => {
    if (fullNameInputRef.current) {
      fullNameInputRef.current.focus();
    }
  }, []);

  // Kiểm tra có thay đổi nào so với dữ liệu ban đầu không
  const hasChanges = () => {
    // Nếu họ tên có khoảng trắng ở đầu hoặc cuối hoặc có lỗi, vô hiệu hóa nút Lưu
    if (fullName.startsWith(" ") || fullName.endsWith(" ")) {
      return false;
    }
    if (nameError) return false;

    const cleanCurrentName = fullName.trim().replace(/\s+/g, " ");
    const cleanInitialName = initialName.trim().replace(/\s+/g, " ");
    const isNameChanged = cleanCurrentName !== cleanInitialName && cleanCurrentName.length > 0;
    const isBioChanged = bio !== initialBio;
    const isDobChanged = dob !== initialDob;
    const isCoverChanged = selectedCoverFile !== null;
    const isAvatarChanged = selectedAvatarFile !== null;
    return isNameChanged || isBioChanged || isDobChanged || isCoverChanged || isAvatarChanged;
  };

  // Cảnh báo beforeunload khi có thay đổi chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  // Validation họ tên
  const validateFullName = (val: string): boolean => {
    // 1. Bắt lỗi khoảng trắng ở đầu hoặc cuối
    if (val.startsWith(" ") || val.endsWith(" ")) {
      setNameError("Họ tên không được chứa khoảng trắng ở đầu hoặc cuối");
      return false;
    }
    // 2. Bắt lỗi để trống hoặc chỉ có khoảng trắng
    if (!val || !val.trim()) {
      setNameError("Vui lòng nhập họ tên");
      return false;
    }
    // 3. Bắt lỗi độ dài từ 2 đến 50 ký tự
    if (val.length < 2 || val.length > 50) {
      setNameError("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng");
      return false;
    }
    // 4. Chỉ gồm chữ cái tiếng Việt và khoảng trắng (không có số hoặc ký tự đặc biệt)
    const nameRegex = /^[a-zA-ZÀ-ỹà-ỹ\s]+$/;
    if (!nameRegex.test(val)) {
      setNameError("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng");
      return false;
    }
    setNameError(null);
    return true;
  };

  // Kiểm tra khi rời ô Họ tên
  const handleNameBlur = () => {
    // Tự động cắt bỏ khoảng trắng thừa ở cuối nếu người dùng vô tình gõ thừa
    const cleaned = fullName.trim();
    setFullName(cleaned);
    validateFullName(cleaned);
  };

  // Validation ngày sinh
  const validateDob = (val: string): boolean => {
    if (!val) {
      setDobError(null);
      return true;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (val > todayStr) {
      setDobError("Ngày sinh không được ở tương lai");
      return false;
    }
    if (val < "1900-01-01") {
      setDobError("Ngày sinh không hợp lệ");
      return false;
    }
    setDobError(null);
    return true;
  };

  // Xử lý chọn file ảnh bìa
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng (JPG, PNG, WebP)
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setCoverError("Ảnh phải là định dạng JPG, PNG hoặc WebP");
      return;
    }

    // Kiểm tra dung lượng (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("Ảnh không được vượt quá 5MB");
      return;
    }

    // Kiểm tra kích thước hình ảnh (tối thiểu 900x300 px)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < 900 || img.height < 300) {
        setCoverError("Ảnh bìa phải có kích thước tối thiểu 900×300 px");
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setCoverError(null);
      setSelectedCoverFile(file);
      setCoverPreview(objectUrl);
    };
    img.src = objectUrl;
  };

  // Xử lý chọn file avatar
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Ảnh phải là định dạng JPG, PNG hoặc WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Ảnh không được vượt quá 5MB");
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < 200 || img.height < 200) {
        setAvatarError("Avatar phải có kích thước tối thiểu 200×200 px");
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setAvatarError(null);
      setSelectedAvatarFile(file);
      setAvatarPreview(objectUrl);
    };
    img.src = objectUrl;
  };

  // Xử lý nhập Bio (tối đa 200 ký tự)
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 200) {
      setBio(val);
    } else {
      setBio(val.slice(0, 200));
    }
  };

  // Xử lý lưu
  const handleSubmit = async () => {
    // 1. Kiểm tra nếu họ tên có khoảng trắng ở đầu hoặc cuối
    if (fullName.startsWith(" ") || fullName.endsWith(" ")) {
      setNameError("Họ tên không được chứa khoảng trắng ở đầu hoặc cuối");
      if (fullNameInputRef.current) {
        fullNameInputRef.current.focus();
      }
      return;
    }

    const cleanName = fullName.trim().replace(/\s+/g, " ");
    const isNameOk = validateFullName(cleanName);
    const isDobOk = validateDob(dob);

    if (!isNameOk || !isDobOk) {
      // Focus vào ô lỗi đầu tiên
      if (!isNameOk && fullNameInputRef.current) {
        fullNameInputRef.current.focus();
      }
      return;
    }

    setFullName(cleanName);

    await onSave(
      {
        full_name: cleanName,
        bio: bio.trim() || null,
        date_of_birth: dob || null,
        version: userProfile.version,
      },
      selectedCoverFile,
      selectedAvatarFile
    );
  };

  // Nhấn Enter trong ô Họ tên = Lưu
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && hasChanges() && !saving) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getAvatarLetter = (name: string) => {
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord ? lastWord.charAt(0).toUpperCase() : "U";
  };

  const isSaveDisabled = !hasChanges() || saving;

  return (
    <div className="edit-profile-layout">
      {/* =================================================================== */}
      {/* CỘT ẢNH */}
      {/* =================================================================== */}
      <section className="col-edit-media">
        {/* Khối Ảnh bìa */}
        <div className="media-upload-block">
          <div className="block-label">Ảnh bìa</div>
          <div className="preview-cover-3to1">
            {coverPreview && <img src={coverPreview} alt="Cover Preview" />}
          </div>

          <button
            type="button"
            className="btn-choose-file"
            onClick={() => coverInputRef.current?.click()}
            disabled={saving}
          >
            Đổi ảnh bìa
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={handleCoverSelect}
          />

          {selectedCoverFile && (
            <div className="pending-save-pill">Ảnh mới chưa được lưu</div>
          )}
          {coverError && <div className="media-error-text">{coverError}</div>}
          <div className="media-hint-text">
            JPG, PNG hoặc WebP, tối đa 5MB, tối thiểu 900×300 px
          </div>
        </div>

        {/* Khối Avatar */}
        <div className="media-upload-block">
          <div className="block-label">Avatar</div>
          <div className="preview-avatar-120">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar Preview" />
            ) : (
              <div className="avatar-char">{getAvatarLetter(fullName)}</div>
            )}
          </div>

          <button
            type="button"
            className="btn-choose-file"
            onClick={() => avatarInputRef.current?.click()}
            disabled={saving}
          >
            Đổi avatar
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={handleAvatarSelect}
          />

          {selectedAvatarFile && (
            <div className="pending-save-pill" style={{ textAlign: "center" }}>
              Ảnh mới chưa được lưu
            </div>
          )}
          {avatarError && <div className="media-error-text" style={{ textAlign: "center" }}>{avatarError}</div>}
          <div className="media-hint-text" style={{ textAlign: "center" }}>
            JPG, PNG hoặc WebP, tối đa 5MB, tối thiểu 200×200 px
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* CỘT THÔNG TIN */}
      {/* =================================================================== */}
      <section className="col-edit-info">
        {/* Họ tên */}
        <div className="form-group">
          <label htmlFor="edit-fullname">Họ tên *</label>
          <input
            id="edit-fullname"
            ref={fullNameInputRef}
            type="text"
            value={fullName}
            onChange={(e) => {
              // Ngăn không cho nhập khoảng trắng ở đầu ô và gộp nhiều khoảng trắng liên tiếp
              let val = e.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
              setFullName(val);
              if (nameError) {
                validateFullName(val);
              }
            }}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            disabled={saving}
            className={nameError ? "input-error" : ""}
          />
          {nameError && <div className="field-error-msg">{nameError}</div>}
        </div>

        {/* Giới thiệu */}
        <div className="form-group">
          <label htmlFor="edit-bio">Giới thiệu</label>
          <textarea
            id="edit-bio"
            rows={3}
            placeholder="Giới thiệu bản thân..."
            value={bio}
            onChange={handleBioChange}
            disabled={saving}
          />
          <div className={`counter-row ${bio.length >= 200 ? "counter-limit" : ""}`}>
            {bio.length}/200
          </div>
        </div>

        {/* Ngày sinh */}
        <div className="form-group">
          <label htmlFor="edit-dob">Ngày sinh</label>
          <input
            id="edit-dob"
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              if (dobError) validateDob(e.target.value);
            }}
            onBlur={() => validateDob(dob)}
            disabled={saving}
            className={dobError ? "input-error" : ""}
          />
          {dobError && <div className="field-error-msg">{dobError}</div>}
          <div className="group-hint-text">
            Ngày sinh dùng để nhắc sinh nhật cho bạn bè và không hiển thị công khai trên trang cá nhân
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* CỘT LƯU */}
      {/* =================================================================== */}
      <section className="col-edit-actions">
        <button
          type="button"
          className="btn-save-profile"
          onClick={handleSubmit}
          disabled={isSaveDisabled}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>

        <button
          type="button"
          className="btn-cancel-profile"
          onClick={onCancel}
          disabled={saving}
        >
          Huỷ
        </button>
      </section>
    </div>
  );
};
