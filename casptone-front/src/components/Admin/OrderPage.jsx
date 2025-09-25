import React from "react";
import { useNavigate } from "react-router-dom";
import OrdersTable from "./OrdersTable";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import AppLayout from "../Header";

const OrdersPage = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
    <div className="container py-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* Back Button */}
        <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="text-center mb-4">
          <h2 className="fw-bold">Unick Furniture Orders</h2>
        </div>

        {/* Orders Section */}
        <div className="card shadow-lg border-0">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">🛒 Customer Orders</h5>
            <span className="badge bg-light text-success"></span>
          </div>
          <div className="card-body bg-light">
            <OrdersTable />
          </div>
        </div>
      </motion.div>
    </div>
    </AppLayout>
  );
};

export default OrdersPage;
