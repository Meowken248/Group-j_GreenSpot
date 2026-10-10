import React, { useState, useEffect, useCallback } from 'react';
import type {
  PenaltyScreenMode,
  TargetType,
  PenaltySummaryItem,
  PenaltyDetailResponse,
  QuickCategoryStat,
} from './types/penalty.types';
import { penaltyService } from './services/penaltyService';
import { PenaltySearchScreen } from './components/PenaltySearchScreen';
import { PenaltyListScreen } from './components/PenaltyListScreen';
import { PenaltyDetailScreen } from './components/PenaltyDetailScreen';
import './styles/PenaltyLookup.scss';

interface PenaltyLookupContainerProps {
  currentUser?: any;
  onNavigateToReport?: (prefillTitle: string, isAnonymous: boolean) => void;
  onNavigateToAuth?: () => void;
}

export const PenaltyLookupContainer: React.FC<PenaltyLookupContainerProps> = ({
  currentUser,
  onNavigateToReport,
  onNavigateToAuth,
}) => {
  // Trạng thái màn hình hiện tại (Màn 1: SEARCH, Màn 2: LIST, Màn 3: DETAIL)
  const [screenMode, setScreenMode] = useState<PenaltyScreenMode>('SEARCH');

  // Bộ lọc tra cứu
  const [keyword, setKeyword] = useState<string>('');
  const [domain, setDomain] = useState<string>('ALL');
  const [quickCategory, setQuickCategory] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetType>('INDIVIDUAL');

  // Dữ liệu Màn 1 (Danh mục nhanh)
  const [categories, setCategories] = useState<QuickCategoryStat[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Dữ liệu Màn 2 (Kết quả & Lĩnh vực)
  const [items, setItems] = useState<PenaltySummaryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Dữ liệu Màn 3 (Chi tiết điều luật)
  const [selectedPenaltyId, setSelectedPenaltyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PenaltyDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 1. Tải danh mục nhanh cho Màn 1
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryError(null);
    try {
      const data = await penaltyService.getQuickCategories();
      setCategories(data);
    } catch {
      setCategoryError('Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // 2. Tải danh sách lĩnh vực & số lượng cho Màn 2
  const loadDomains = useCallback(async () => {
    try {
      const [doms, counts] = await Promise.all([
        penaltyService.getDomains(),
        penaltyService.getDomainCounts(),
      ]);
      setAvailableDomains(doms);
      setDomainCounts(counts);
    } catch {
      // Dùng fallback nếu lỗi mạng
      setAvailableDomains([
        'Rác thải sinh hoạt',
        'Rác công nghiệp/nguy hại',
        'Nước thải',
        'Khí thải',
        'Tiếng ồn',
      ]);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadDomains();
  }, [loadCategories, loadDomains]);

  // 3. Thực hiện tra cứu danh sách kết quả (Màn 2)
  const executeSearch = useCallback(
    async (
      searchQuery: string,
      searchDomain: string,
      searchQuickCat: string | null,
      currentTarget: TargetType,
      targetPage: number = 1,
      append: boolean = false
    ) => {
      setIsLoadingResults(true);
      setResultsError(null);
      try {
        const res = await penaltyService.searchPenalties({
          query: searchQuery,
          domain: searchDomain,
          quick_category: searchQuickCat || undefined,
          target: currentTarget,
          page: targetPage,
          limit: 10,
        });

        if (append) {
          setItems((prev) => [...prev, ...res.items]);
        } else {
          setItems(res.items);
        }
        setTotal(res.total);
        setPage(targetPage);
      } catch {
        setResultsError('Lỗi truy vấn dữ liệu pháp luật. Vui lòng thử lại');
      } finally {
        setIsLoadingResults(false);
      }
    },
    []
  );

  // 4. Xem chi tiết điều luật (Màn 3)
  const loadDetail = useCallback(
    async (id: string, currentTarget: TargetType) => {
      setIsLoadingDetail(true);
      setDetailError(null);
      try {
        const data = await penaltyService.getPenaltyDetail(id, currentTarget);
        setDetail(data);
      } catch {
        setDetailError('Không thể tải chi tiết điều luật. Vui lòng thử lại');
      } finally {
        setIsLoadingDetail(false);
      }
    },
    []
  );

  // Handlers Màn 1
  const handleTriggerSearch = (customKw?: string) => {
    const kw = customKw !== undefined ? customKw : keyword;
    setDomain('ALL'); // Luôn tìm kiếm trên toàn bộ lĩnh vực khi bắt đầu tìm từ khóa mới
    setQuickCategory(null);
    setScreenMode('LIST');
    executeSearch(kw, 'ALL', null, target, 1, false);
  };

  const handleSelectQuickCategory = (catName: string) => {
    setQuickCategory(catName);
    setDomain('ALL'); // Đặt lại về ALL khi chọn danh mục nhanh
    setKeyword('');
    setScreenMode('LIST');
    executeSearch('', 'ALL', catName, target, 1, false);
  };

  // Handlers Màn 2
  const handleTargetChange = (newTarget: TargetType) => {
    setTarget(newTarget);
    if (screenMode === 'LIST') {
      executeSearch(keyword, domain, quickCategory, newTarget, 1, false);
    } else if (screenMode === 'DETAIL' && selectedPenaltyId) {
      loadDetail(selectedPenaltyId, newTarget);
    }
  };

  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain);
    executeSearch(keyword, newDomain, quickCategory, target, 1, false);
  };

  const handleViewDetail = (id: string) => {
    setSelectedPenaltyId(id);
    setScreenMode('DETAIL');
    loadDetail(id, target);
  };

  const handleLoadMore = () => {
    executeSearch(keyword, domain, quickCategory, target, page + 1, true);
  };

  // Navigation handlers
  const handleBackToSearch = () => {
    setScreenMode('SEARCH');
  };

  const handleBackToList = () => {
    setScreenMode('LIST');
  };

  const handleReportViolation = (title: string, isAnon: boolean) => {
    if (onNavigateToReport) {
      onNavigateToReport(title, isAnon);
    }
  };

  return (
    <div className="penalty-lookup-wrapper" data-testid="penalty-lookup-container">
      <div className="pl-container">
        {/* Header Bar chung & Breadcrumb */}
        <header className="pl-header-bar" role="banner">
          <nav className="pl-breadcrumb" aria-label="Điều hướng phân cấp">
            <span
              className="crumb-link"
              onClick={handleBackToSearch}
              role="button"
              tabIndex={0}
            >
              Hệ thống pháp luật môi trường
            </span>
            <span>/</span>
            {screenMode === 'SEARCH' ? (
              <span className="current">Tra cứu quy định xử phạt</span>
            ) : screenMode === 'LIST' ? (
              <>
                <span
                  className="crumb-link"
                  onClick={handleBackToSearch}
                  role="button"
                  tabIndex={0}
                >
                  Tra cứu
                </span>
                <span>/</span>
                <span className="current">Kết quả tìm kiếm</span>
              </>
            ) : (
              <>
                <span
                  className="crumb-link"
                  onClick={handleBackToSearch}
                  role="button"
                  tabIndex={0}
                >
                  Tra cứu
                </span>
                <span>/</span>
                <span
                  className="crumb-link"
                  onClick={handleBackToList}
                  role="button"
                  tabIndex={0}
                >
                  Danh sách
                </span>
                <span>/</span>
                <span className="current">Chi tiết điều luật</span>
              </>
            )}
          </nav>

          <div className="pl-header-title-box">
            <h1 className="pl-main-title">
              <span className="title-icon">⚖️</span>
              <span>Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường</span>
            </h1>
            <div className="pl-decree-badge">
              <span>Căn cứ: Nghị định 45/2022/NĐ-CP</span>
            </div>
          </div>

          <p className="pl-sub-desc">
            Cung cấp thông tin chuẩn xác, minh bạch về các khung hình phạt, chế tài xử lý và biện pháp khắc phục hậu quả đối với các hành vi gây ô nhiễm môi trường đô thị.
          </p>
        </header>

        {/* Nội dung tương ứng theo 3 Màn hình */}
        <main>
          {screenMode === 'SEARCH' && (
            <PenaltySearchScreen
              keyword={keyword}
              onKeywordChange={setKeyword}
              onSearch={handleTriggerSearch}
              onSelectCategory={handleSelectQuickCategory}
              categories={categories}
              isLoadingCategories={isLoadingCategories}
              categoryError={categoryError}
              onRetryCategories={loadCategories}
            />
          )}

          {screenMode === 'LIST' && (
            <PenaltyListScreen
              keyword={keyword}
              domain={domain}
              quickCategory={quickCategory}
              target={target}
              onTargetChange={handleTargetChange}
              onDomainChange={handleDomainChange}
              availableDomains={availableDomains}
              domainCounts={domainCounts}
              items={items}
              total={total}
              isLoading={isLoadingResults}
              errorMessage={resultsError}
              onRetry={() => executeSearch(keyword, domain, quickCategory, target, 1, false)}
              onViewDetail={handleViewDetail}
              onBackToSearch={handleBackToSearch}
              hasMore={items.length < total}
              onLoadMore={handleLoadMore}
            />
          )}

          {screenMode === 'DETAIL' && (
            <PenaltyDetailScreen
              detail={detail}
              isLoading={isLoadingDetail}
              errorMessage={detailError}
              onRetry={() => selectedPenaltyId && loadDetail(selectedPenaltyId, target)}
              onBackToList={handleBackToList}
              target={target}
              onTargetToggle={handleTargetChange}
              isLoggedIn={Boolean(currentUser)}
              onNavigateToReport={handleReportViolation}
              onNavigateToLogin={() => onNavigateToAuth && onNavigateToAuth()}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default PenaltyLookupContainer;
