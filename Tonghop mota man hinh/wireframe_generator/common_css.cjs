// common_css.js - Base CSS styles for black & white wireframes

module.exports = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background: #f0f2f5; padding: 24px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
  .screen-card { width: 980px; background: #fff; border: 2px solid #222; border-radius: 12px; overflow: visible; box-shadow: 0 6px 24px rgba(0,0,0,0.08); position: relative; margin-top: 15px; }
  .badge-tag { position: absolute; background: #e5e7eb; border: 1.5px solid #374151; color: #111827; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 6px; letter-spacing: 0.5px; z-index: 50; }
  
  /* Top Photo Number Badge */
  .photo-num-badge { position: absolute; top: -14px; left: 24px; background: #111827; color: #fff; border: 1.5px solid #000; font-size: 12px; font-weight: 800; padding: 3px 12px; border-radius: 6px; letter-spacing: 0.5px; z-index: 60; }
  
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; border-bottom: 2px solid #222; position: relative; background: #fff; border-radius: 10px 10px 0 0; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo-box { border: 2px solid #222; border-radius: 6px; font-weight: 800; font-size: 13px; padding: 4px 8px; background: #fff; }
  .header-title { font-size: 15px; font-weight: 700; color: #111; }
  .header-user { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #222; }
  
  /* Body Layout */
  .layout-body { display: flex; min-height: 520px; }
  .sidebar { width: 210px; border-right: 2px solid #222; padding: 14px 0; background: #fafafa; position: relative; flex-shrink: 0; }
  .nav-item { padding: 9px 18px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .nav-item.active { background: #e5e7eb; border-left: 4px solid #111; font-weight: 700; color: #111; }
  
  /* Content */
  .content { flex: 1; padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; background: #fff; position: relative; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
  .page-title { font-size: 17px; font-weight: 800; color: #111; line-height: 1.3; }
  .page-subtitle { font-size: 12px; color: #6b7280; font-weight: 500; margin-top: 2px; }
  
  /* Boxes and Cards */
  .card-box { border: 2px solid #222; border-radius: 8px; padding: 14px 16px; position: relative; background: #fff; }
  .card-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 8px; }
  
  /* Buttons */
  .btn { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
  .btn-black { background: #111; color: #fff; border: 2px solid #111; }
  .btn-white { background: #fff; color: #111; border: 2px solid #222; }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  
  /* Form elements */
  .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  .form-label { font-size: 12px; font-weight: 700; color: #222; }
  .form-input { border: 1.5px solid #222; border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none; background: #fff; color: #111; }
  .form-select { border: 1.5px solid #222; border-radius: 6px; padding: 7px 10px; font-size: 12px; font-weight: 600; outline: none; background: #fff; }
  
  /* Tables */
  .wire-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
  .wire-table th { background: #f3f4f6; border-top: 2px solid #222; border-bottom: 2px solid #222; padding: 8px 10px; font-weight: 700; color: #111; }
  .wire-table td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; color: #374151; font-weight: 500; }
  .wire-table tr:hover td { background: #f9fafb; }
  
  /* Map View */
  .map-box { border: 2px solid #222; border-radius: 8px; height: 260px; position: relative; background: #f8fafc; overflow: hidden; }
  
  /* Modals */
  .modal-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 18px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 40; text-align: center; }
  .modal-title { font-size: 15px; font-weight: 800; color: #111; margin-bottom: 8px; }
  .modal-text { font-size: 13px; font-weight: 500; color: #333; line-height: 1.5; margin-bottom: 16px; }
  .modal-actions { display: flex; justify-content: center; gap: 10px; }
  
  /* Tags & Pills */
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #222; background: #fff; }
  .tag-dark { background: #222; color: #fff; }
  .tag-gray { background: #e5e7eb; color: #111; border-color: #6b7280; }
  
  /* Grid utilities */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
`;
