import React, { useEffect, useState } from "react";
import { getAnalytics } from "../../api/productionApi";
import { getAdminOverview } from "../../api/inventoryApi";
import KPICards from "./Analytics/KPICards";
import DailyOutputChart from "./Analytics/DailyOutputChart";
import StagePieChart from "./Analytics/StagePieChart";
import TopProductsChart from "./Analytics/TopProductsChart";
import TopUsersChart from "./Analytics/TopUsersChart";

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    status: "",
  });
  const [overview, setOverview] = useState(null);
  const [forecastSort, setForecastSort] = useState({ key: "days_to_depletion", dir: "asc" });
  const [forecastFilter, setForecastFilter] = useState({ text: "", onlyReorder: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAnalytics = async () => {
    const data = await getAnalytics(filters);
    setAnalytics(data);
  };

  const fetchOverview = async () => {
    const data = await getAdminOverview();
    setOverview(data);
  };

  useEffect(() => {
    fetchAnalytics();
    fetchOverview();
  }, []); // fetch on mount

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchAnalytics();
  };

  const sortedFilteredForecasts = () => {
    const rows = [...(overview?.forecasts || [])];
    const { text, onlyReorder } = forecastFilter;
    const filtered = rows.filter(r => {
      const matches = !text || (r.sku?.toLowerCase().includes(text.toLowerCase()) || r.name?.toLowerCase().includes(text.toLowerCase()));
      const reorder = r.suggested_order > 0;
      return matches && (!onlyReorder || reorder);
    });
    const { key, dir } = forecastSort;
    filtered.sort((a,b) => {
      const va = a[key] ?? 0; const vb = b[key] ?? 0;
      if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return dir === "asc" ? (va - vb) : (vb - va);
    });
    return filtered;
  };

  const sortBy = (key) => {
    setForecastSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const badge = (row) => {
    if (row.max_level && row.on_hand > row.max_level) return <span className="badge bg-warning text-dark">Overstock</span>;
    if (row.suggested_order > 0) return <span className="badge bg-danger">Reorder now</span>;
    return <span className="badge bg-success">OK</span>;
  };

  return (
    <div className="container mt-4 wood-animated">
      <div className="text-center mb-4 wood-card p-3 wood-header">
        <h2 style={{ color: "black" }}>UNICK FURNITURE DASHBOARD</h2>
      </div>

      {/* 🔹 Filters */}
      <div className="row mb-4 wood-card p-3">
        <div className="col-md-3">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={filters.start_date}
            onChange={handleFilterChange}
            className="form-control"
          />
        </div>
        <div className="col-md-3">
          <label>End Date</label>
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={handleFilterChange}
            className="form-control"
          />
        </div>
        <div className="col-md-3">
          <label>Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="form-control"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Hold">Hold</option>
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button onClick={applyFilters} className="btn btn-primary w-100">
            Apply Filters
          </button>
        </div>
      </div>

      {/* 🔹 Analytics */}
      {!analytics ? (
        <p className="text-center mt-4">Loading analytics...</p>
      ) : (
        <>
          <KPICards kpis={analytics.kpis} />

          <div className="row mt-4">
            <div className="col-md-6">
              <DailyOutputChart data={analytics.daily_output} />
            </div>
            <div className="col-md-6">
              <StagePieChart data={analytics.stage_breakdown} />
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-md-6">
              <TopProductsChart data={analytics.top_products} />
            </div>
            <div className="col-md-6">
              <TopUsersChart data={analytics.top_users} />
            </div>
          </div>
        </>
      )}

      {/* 🔹 Forecasts & Stocks Overview */}
      {!overview ? (
        <p className="text-center mt-4">Loading overview...</p>
      ) : (
        <div className="mt-4">
          <h4>Inventory Forecasts</h4>
          <div className="d-flex gap-2 mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search SKU or Name"
              value={forecastFilter.text}
              onChange={(e)=> setForecastFilter({ ...forecastFilter, text: e.target.value })}
              style={{ maxWidth: 300 }}
            />
            <div className="form-check ms-2">
              <input id="onlyReorder" className="form-check-input" type="checkbox"
                     checked={forecastFilter.onlyReorder}
                     onChange={(e)=> setForecastFilter({ ...forecastFilter, onlyReorder: e.target.checked })} />
              <label htmlFor="onlyReorder" className="form-check-label">Only Reorder</label>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <label className="mb-0">Rows</label>
            <select className="form-select" style={{width: 'auto'}} value={pageSize} onChange={(e)=> { setPage(1); setPageSize(Number(e.target.value)); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="ms-auto">
              <button className="btn btn-sm btn-outline-secondary me-2" disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))}>Prev</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=> setPage(p=> p+1)}>Next</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th role="button" onClick={()=>sortBy('sku')}>SKU</th>
                  <th role="button" onClick={()=>sortBy('name')}>Name</th>
                  <th role="button" className="text-end" onClick={()=>sortBy('on_hand')}>On Hand</th>
                  <th role="button" className="text-end" onClick={()=>sortBy('avg_daily_usage')}>Avg Daily</th>
                  <th role="button" className="text-end" onClick={()=>sortBy('days_to_depletion')}>Days to Depletion</th>
                  <th role="button" className="text-end" onClick={()=>sortBy('reorder_point')}>ROP</th>
                  <th role="button" className="text-end" onClick={()=>sortBy('suggested_order')}>Suggested Order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = sortedFilteredForecasts();
                  const start = (page - 1) * pageSize;
                  const paged = rows.slice(start, start + pageSize);
                  return paged;
                })().map((f) => (
                  <tr key={f.sku}>
                    <td>{f.sku}</td>
                    <td>{f.name}</td>
                    <td className="text-end">{f.on_hand}</td>
                    <td className="text-end">{f.avg_daily_usage}</td>
                    <td className="text-end">{f.days_to_depletion ?? "-"}</td>
                    <td className="text-end">{f.reorder_point}</td>
                    <td className="text-end fw-bold">{f.suggested_order}</td>
                    <td>{badge(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
