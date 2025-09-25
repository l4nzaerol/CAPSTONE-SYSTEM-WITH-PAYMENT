import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import CartTable from "./CartTable";
import OrderTable from "../OrderTable";

const Cart = () => {
  const [view, setView] = useState("cart");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const provider = params.get('provider');
    const orderId = params.get('order_id');
    if (payment && provider && orderId) {
      // Stay on cart tab and show a small notice
      if (payment === 'success') {
        alert('Payment successful. We are confirming your order now.');
        // Ask backend to confirm in case webhook is delayed
        import('../../api/client').then(({ default: api }) => {
          api.post('/payments/confirm', { order_id: Number(orderId), provider })
            .catch(() => {})
            .finally(() => {
              // no-op; CartTable polls for the final state
            });
        });
      } else if (payment === 'failed') {
        alert('Payment failed or canceled. You can try again.');
      }
      // remove query params without reload
      const url = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, url);
    }
  }, []);

  return (
    <div className="container-fluid mt-4 px-5 cart-page">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold text-brown">
          {view === "cart" ? "🛒 My Shopping Cart" : "📦 My Orders"}
        </h2>
      </div>

      {/* Switch Tabs */}
      <div className="toggle-tabs mb-4">
        <button
          className={`pill-btn ${view === "cart" ? "active" : ""}`}
          onClick={() => setView("cart")}
        >
          Cart
        </button>
        <button
          className={`pill-btn ${view === "orders" ? "active" : ""}`}
          onClick={() => setView("orders")}
        >
          My Orders
        </button>
      </div>

      {/* Cart or Orders View */}
      <div className="cart-body">
        {view === "cart" ? <CartTable /> : <OrderTable />}
      </div>

      {/* Back Navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-outline-brown mt-4 px-4"
      >
        ⬅ Continue Shopping
      </button>

      <style jsx>{`
        .cart-page {
          background: #f9f6f1;
          min-height: 100vh;
          padding-bottom: 50px;
        }

        .text-brown {
          color: #6b4226;
        }

        /* Toggle Tabs */
        .toggle-tabs {
          display: flex;
          gap: 1rem;
        }

        .pill-btn {
          padding: 10px 25px;
          border-radius: 50px;
          border: 2px solid #6b4226;
          background: transparent;
          color: #6b4226;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .pill-btn.active,
        .pill-btn:hover {
          background: #6b4226;
          color: white;
        }

        /* Custom Button */
        .btn-outline-brown {
          border: 2px solid #6b4226;
          color: #6b4226;
          font-weight: bold;
          border-radius: 8px;
        }
        .btn-outline-brown:hover {
          background: #6b4226;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default Cart;
