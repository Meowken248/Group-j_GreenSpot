import React, { useState, useEffect, useCallback } from 'react';
import { DeduplicationHeader } from '../components/DeduplicationHeader';
import { DeduplicationFooter } from '../components/DeduplicationFooter';
import { DeduplicationFilter } from '../components/DeduplicationFilter';
import { ClusterList } from '../components/ClusterList';
import { SideBySideComparison } from '../components/SideBySideComparison';
import { MergeConfirmModal } from '../components/MergeConfirmModal';
import { MergeSuccessModal } from '../components/MergeSuccessModal';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import { deduplicationService } from '../services/deduplicationService';
import type {
  DistrictOption,
  DuplicateClusterListItem,
  ComparisonResponse,
} from '../types/deduplication.types';
import '../styles/deduplication.scss';

interface DeduplicationDashboardProps {
  onBackToHome?: () => void;
  currentUser?: {
    full_name?: string;
    role?: string;
  } | null;
}

export const DeduplicationDashboard: React.FC<DeduplicationDashboardProps> = ({
  onBackToHome,
  currentUser,
}) => {
  // Trạng thái màn hình hiện tại ('list' = Màn 1, 'compare' = Màn 2)
  const [currentScreen, setCurrentScreen] = useState<'list' | 'compare'>('list');

  // Trạng thái Bộ lọc Màn 1
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Tất cả quận/huyện');
  const [minSimilarity, setMinSimilarity] = useState<number | null>(null);

  // Danh sách cụm trùng lặp Màn 1
  const [clusters, setClusters] = useState<DuplicateClusterListItem[]>([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState<boolean>(true);
  const [clustersError, setClustersError] = useState<string | null>(null);

  // Chi tiết đối chứng Màn 2
  const [selectedCluster, setSelectedCluster] = useState<DuplicateClusterListItem | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isMarkingDistinct, setIsMarkingDistinct] = useState<boolean>(false);

  // Modal Màn 3 (Popup xác nhận gộp)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Modal Màn 4 (Thông báo gộp thành công)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Lightbox xem ảnh phóng to
  const [lightboxImg, setLightboxImg] = useState<{ url: string; caption: string } | null>(null);

  // Toast thông báo 3 giây
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Tải danh sách Quận/Huyện khi mount
  useEffect(() => {
    let isMounted = true;
    async function loadDistricts() {
      try {
        const data = await deduplicationService.getDistricts();
        if (isMounted) setDistricts(data);
      } catch (err) {
        console.error('Không thể tải danh sách quận/huyện:', err);
      }
    }
    loadDistricts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Tải danh sách cụm báo cáo trùng lặp
  const loadClusters = useCallback(async (_isRetry: boolean = false) => {
    setIsLoadingClusters(true);
    setClustersError(null);
    try {
      const data = await deduplicationService.getClusters({
        districtName: selectedDistrict,
        minSimilarity: minSimilarity,
        simulateError: false,
      });
      setClusters(data.items);
    } catch (err: unknown) {
      setClustersError('Không thể kết nối dịch vụ AI. Vui lòng thử lại');
    } finally {
      setIsLoadingClusters(false);
    }
  }, [selectedDistrict, minSimilarity]);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  // Hành động: Bấm nút "So sánh" trên một nhóm -> Chuyển sang Màn 2
  const handleSelectCompare = async (cluster: DuplicateClusterListItem) => {
    setSelectedCluster(cluster);
    setCurrentScreen('compare');
    setIsLoadingComparison(true);
    setComparisonError(null);
    try {
      const data = await deduplicationService.getComparison(cluster.cluster_id);
      setComparisonData(data);
    } catch (err) {
      setComparisonError('Không thể tải chi tiết đối chứng báo cáo.');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  // Hành động: Nút "Không trùng" ở Màn 2
  const handleMarkDistinct = async () => {
    if (!comparisonData || !selectedCluster) return;
    setIsMarkingDistinct(true);
    try {
      await deduplicationService.markDistinct({
        cluster_id: comparisonData.cluster_id,
        version: comparisonData.version,
      });
      // Toast 3 giây thông báo và quay về danh sách Màn 1
      showToast('Đã đánh dấu 2 báo cáo không trùng lặp');
      setCurrentScreen('list');
      setSelectedCluster(null);
      setComparisonData(null);
      loadClusters();
    } catch (err) {
      showToast('Lỗi khi đánh dấu báo cáo không trùng lặp.');
    } finally {
      setIsMarkingDistinct(false);
    }
  };

  // Hành động: Mở Popup Màn 3 khi bấm nút "Gộp báo cáo"
  const handleOpenMergeModal = () => {
    setMergeError(null);
    setIsMergeModalOpen(true);
  };

  // Hành động: Bấm nút "Gộp" ở Popup Màn 3
  const handleConfirmMerge = async (primaryId: string, secondaryId: string) => {
    if (!comparisonData) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      await deduplicationService.mergeIncidents({
        cluster_id: comparisonData.cluster_id,
        primary_incident_id: primaryId,
        secondary_incident_id: secondaryId,
        version: comparisonData.version,
      });
      // Đóng Màn 3 và kích hoạt mở Màn 4
      setIsMergeModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: unknown) {
      setMergeError('Không thể gộp báo cáo lúc này. Vui lòng thử lại');
    } finally {
      setIsMerging(false);
    }
  };

  // Hành động: Đóng Popup Màn 4 -> Tự động quay về Màn 1 và làm mới danh sách
  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setCurrentScreen('list');
    setSelectedCluster(null);
    setComparisonData(null);
    loadClusters();
  };

  return (
    <div className="dedup-dashboard-wrapper" data-testid="dedup-dashboard-wrapper">
      {/* HEADER: logo | menu quản trị | chuông | avatar */}
      <DeduplicationHeader
        onBackToHome={onBackToHome}
        userName={currentUser?.full_name || 'Quản trị viên'}
        userRole={currentUser?.role || 'ADMIN'}
      />

      {/* TOAST THÔNG BÁO (3 giây) */}
      {toastMessage && (
        <div className="dedup-toast" role="status" aria-live="polite">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LIGHTBOX PHÓNG TO ẢNH HIỆN TRƯỜNG */}
      <ImageLightboxModal
        imageUrl={lightboxImg?.url || null}
        caption={lightboxImg?.caption}
        onClose={() => setLightboxImg(null)}
      />

      {/* NỘI DUNG CHÍNH (MAIN BODY) */}
      <main className="dedup-content-body">
        {currentScreen === 'list' ? (
          /* ========================================================================= */
          /* MÀN 1/4: DANH SÁCH NHÓM BÁO CÁO TRÙNG (2 CỘT: BỘ LỌC & NHÓM TRÙNG) */
          /* ========================================================================= */
          <div className="screen-1-container">
            {/* Cột trái: BỘ LỌC */}
            <DeduplicationFilter
              districts={districts}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              minSimilarity={minSimilarity}
              onSimilarityChange={setMinSimilarity}
              onResetFilter={() => {
                setSelectedDistrict('Tất cả quận/huyện');
                setMinSimilarity(null);
              }}
            />

            {/* Cột phải: NHÓM TRÙNG */}
            <ClusterList
              clusters={clusters}
              isLoading={isLoadingClusters}
              errorMessage={clustersError}
              onRetry={() => loadClusters(true)}
              onSelectCompare={handleSelectCompare}
            />
          </div>
        ) : (
          /* ========================================================================= */
          /* MÀN 2/4: SO SÁNH BÁO CÁO (3 CỘT: BÁO CÁO A | BÁO CÁO B | KẾT LUẬN AI) */
          /* ========================================================================= */
          isLoadingComparison ? (
            <div className="cluster-loading-state" data-testid="comparison-loading-spinner" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div className="dedup-spinner" aria-hidden="true" />
              <p className="loading-text">AI đang phân tích dữ liệu hình ảnh và toạ độ…</p>
            </div>
          ) : comparisonError ? (
            <div className="cluster-error-state" data-testid="comparison-error-state" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <span className="error-icon" aria-hidden="true">⚠️</span>
              <p className="error-message">{comparisonError}</p>
              <button
                type="button"
                className="btn-retry"
                onClick={() => selectedCluster && handleSelectCompare(selectedCluster)}
              >
                Thử lại
              </button>
            </div>
          ) : (
            comparisonData && (
              <SideBySideComparison
                data={comparisonData}
                onBackToList={() => {
                  setCurrentScreen('list');
                  setSelectedCluster(null);
                  setComparisonData(null);
                }}
                onOpenMergeModal={handleOpenMergeModal}
                onMarkDistinct={handleMarkDistinct}
                isMarkingDistinct={isMarkingDistinct}
                onImageClick={(url, caption) => setLightboxImg({ url, caption })}
              />
            )
          )
        )}
      </main>

      {/* ========================================================================= */}
      {/* MÀN 3/4: POPUP XÁC NHẬN GỘP (GỘP BÁO CÁO?) */}
      {/* ========================================================================= */}
      {comparisonData && (
        <MergeConfirmModal
          isOpen={isMergeModalOpen}
          data={comparisonData}
          isLoading={isMerging}
          errorMessage={mergeError}
          onCancel={() => setIsMergeModalOpen(false)}
          onConfirmMerge={handleConfirmMerge}
        />
      )}

      {/* ========================================================================= */}
      {/* MÀN 4/4: THÔNG BÁO GỘP THÀNH CÔNG (ĐÃ GỘP BÁO CÁO) */}
      {/* ========================================================================= */}
      <MergeSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseSuccessModal}
      />

      {/* FOOTER: bản quyền | liên hệ | chính sách */}
      <DeduplicationFooter />
    </div>
  );
};
