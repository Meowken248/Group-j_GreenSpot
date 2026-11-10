import React, { useState, useEffect, useRef } from 'react';
import type {
  GeoLocationPoint,
  VehicleCategory,
  VehicleOption,
} from '../types/navigation.types';
import { fetchRouteAutocomplete } from '../services/navigationApi';

interface Screen1InputProps {
  origin: GeoLocationPoint;
  destination: GeoLocationPoint;
  selectedVehicle: VehicleCategory;
  onOriginChange: (pt: GeoLocationPoint) => void;
  onDestinationChange: (pt: GeoLocationPoint) => void;
  onVehicleChange: (v: VehicleCategory) => void;
  validationError: string | null;
  gpsWarning: string | null;
  onClearErrors: () => void;
  onGpsRequested: () => void;
}

const VEHICLES: VehicleOption[] = [
  {
    type: 'MOTORBIKE',
    name: 'Xe máy',
    icon: '🛵',
    thresholdCm: 25,
    description: 'Chịu ngập tối đa 25cm (tránh ngập bugi/ống xả)',
  },
  {
    type: 'CAR',
    name: 'Ô tô',
    icon: '🚗',
    thresholdCm: 35,
    description: 'Chịu ngập tối đa 35cm (tránh thủy kích)',
  },
  {
    type: 'BICYCLE',
    name: 'Xe đạp',
    icon: '🚲',
    thresholdCm: 15,
    description: 'Chịu ngập tối đa 15cm (tránh ngã/trôi)',
  },
  {
    type: 'WASTE_TRUCK',
    name: 'Xe ép rác chuyên dụng',
    icon: '🚛',
    thresholdCm: 55,
    description: 'Gầm cao chuyên dụng, chịu ngập 55cm',
  },
];

export const Screen1Input: React.FC<Screen1InputProps> = ({
  origin,
  destination,
  selectedVehicle,
  onOriginChange,
  onDestinationChange,
  onVehicleChange,
  validationError,
  gpsWarning,
  onClearErrors,
  onGpsRequested,
}) => {
  const [destInput, setDestInput] = useState(destination.name);
  const [originInput, setOriginInput] = useState(origin.name);
  const [destSuggestions, setDestSuggestions] = useState<GeoLocationPoint[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Focus ô bị trống nếu có lỗi validation
  useEffect(() => {
    if (validationError?.includes('đầy đủ điểm đi')) {
      if (!origin.name.trim()) {
        originInputRef.current?.focus();
      } else if (!destination.name.trim()) {
        destInputRef.current?.focus();
      }
    }
  }, [validationError, origin.name, destination.name]);

  useEffect(() => {
    setOriginInput(origin.name);
  }, [origin.name]);

  useEffect(() => {
    setDestInput(destination.name);
  }, [destination.name]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDestChange = (val: string) => {
    setDestInput(val);
    onClearErrors();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(async () => {
        const results = await fetchRouteAutocomplete(val);
        setDestSuggestions(results);
        setShowDestSuggestions(true);
      }, 250);
    } else {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
    }
  };

  const handleSelectDestSuggestion = (pt: GeoLocationPoint) => {
    setDestInput(pt.name);
    setShowDestSuggestions(false);
    onDestinationChange(pt);
  };

  const isOriginError =
    (validationError?.includes('đầy đủ điểm đi') && !origin.name.trim()) ||
    validationError?.includes('trùng nhau');

  const isDestError =
    (validationError?.includes('đầy đủ điểm đi') && !destination.name.trim()) ||
    validationError?.includes('trùng nhau');

  return (
    <div className="panel-card route-input-panel">
      <h2 className="panel-title">
        <span>📍 LỘ TRÌNH</span>
        <span className="panel-badge">Màn 1/4</span>
      </h2>

      {/* Điểm đi */}
      <div className="form-group">
        <label htmlFor="origin-input">Điểm đi:</label>
        <div className="input-with-action">
          <input
            id="origin-input"
            ref={originInputRef}
            type="text"
            className={isOriginError ? 'input-error' : ''}
            placeholder="Nhập địa chỉ xuất phát..."
            value={originInput}
            onChange={(e) => {
              setOriginInput(e.target.value);
              onClearErrors();
              onOriginChange({ ...origin, name: e.target.value });
            }}
          />
          <button
            type="button"
            className="btn-current-location"
            title="Tự động bắt tọa độ GPS thiết bị"
            onClick={onGpsRequested}
          >
            <span>🎯 Vị trí hiện tại của tôi</span>
          </button>
        </div>

        {gpsWarning && (
          <div className="warning-text">
            <span>⚠️ {gpsWarning}</span>
          </div>
        )}
      </div>

      {/* Điểm đến */}
      <div className="form-group">
        <label htmlFor="dest-input">Điểm đến:</label>
        <div className="input-with-action">
          <input
            id="dest-input"
            ref={destInputRef}
            type="text"
            className={isDestError ? 'input-error' : ''}
            placeholder="Nhập địa chỉ đích cần đến..."
            value={destInput}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => {
              if (destSuggestions.length > 0) setShowDestSuggestions(true);
            }}
          />
        </div>

        {/* Autocomplete gợi ý địa danh */}
        {showDestSuggestions && destSuggestions.length > 0 && (
          <div className="autocomplete-list">
            {destSuggestions.map((item, idx) => (
              <div
                key={idx}
                className="autocomplete-item"
                onClick={() => handleSelectDestSuggestion(item)}
              >
                <span>📍</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        )}

        {validationError && (
          <div className="error-text">
            <span>⛔ {validationError}</span>
          </div>
        )}
      </div>

      {/* Phương tiện */}
      <div className="form-group">
        <label>Phương tiện lưu thông:</label>
        <div className="vehicle-selector">
          {VEHICLES.map((v) => (
            <div
              key={v.type}
              className={`vehicle-card ${selectedVehicle === v.type ? 'selected' : ''}`}
              onClick={() => onVehicleChange(v.type)}
            >
              <span className="vehicle-icon">{v.icon}</span>
              <div className="vehicle-info">
                <span className="vehicle-name">{v.name}</span>
                <span className="vehicle-threshold">Ngưỡng: &lt; {v.thresholdCm}cm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
