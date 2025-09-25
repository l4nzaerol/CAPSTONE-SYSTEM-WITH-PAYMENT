// src/components/CartTable.js
import React, { useState, useEffect } from "react";
import api from "../../api/client";

const CartTable = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      const response = await api.get("/cart");
      setCartItems(response.data || []);
    } catch (err) {
      setError("Failed to load cart items.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuantity = async (itemId, newQuantity) => {
    try {
      await api.put(`/cart/${itemId}`, { quantity: newQuantity });
      fetchCartItems(); // refresh cart
    } catch (err) {
      alert("Failed to update item quantity.");
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      fetchCartItems();
    } catch (err) {
      alert("Failed to remove item.");
    }
  };

  const createProductionsForOrder = async (orderResponse) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No token available for production creation");
      return { success: false, error: "Authentication required" };
    }

    try {
      const headers = undefined;
      const orderId = orderResponse?.data?.order?.id || orderResponse?.data?.id || null;
      const today = new Date().toISOString().slice(0, 10);
      const stageStart = "Design";
      
      // Create production payloads
      const payloads = cartItems.map((item) => ({
        product_name: item.product?.name || item.name || "Product",
        date: today,
        stage: stageStart,
        status: "Pending",
        quantity: item.quantity || 0,
        resources_used: {
          materials: item.product?.materials || "",
          workers: 0,
        },
        notes: orderId ? `From order #${orderId}` : "From checkout",
      }));

      // Create all production records
      const productionResults = await Promise.allSettled(
          payloads.map((payload) =>
            api.post("/productions", payload)
          )
      );

      // Check results
      const successful = productionResults.filter(result => result.status === 'fulfilled');
      const failed = productionResults.filter(result => result.status === 'rejected');

      if (failed.length > 0) {
        console.error("Some production records failed:", failed.map(f => f.reason));
        return { 
          success: successful.length > 0, 
          error: `${failed.length} of ${payloads.length} production records failed`,
          partial: true
        };
      }

      console.log(`Successfully created ${successful.length} production records`);
      return { success: true, count: successful.length };

    } catch (error) {
      console.error("Failed to create production records:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || "Unknown error" 
      };
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await api.post("/checkout", {
        payment_method: paymentMethod,
        shipping_address: address,
        contact_phone: phone,
      });

      // Try to create production records
      const productionResult = await createProductionsForOrder(response);

      // Show appropriate success message
      if (productionResult.success) {
        if (productionResult.partial) {
          alert(`Order placed successfully!\n\nProduction tracking: ${productionResult.error}`);
        } else {
          alert(`Order placed successfully!\n\n✅ ${productionResult.count || cartItems.length} items added to production tracking.`);
        }
      } else {
        alert(`Order placed successfully!\n\n⚠️ Production tracking setup failed: ${productionResult.error}\n\nPlease contact support if production tracking is not visible.`);
      }

      // Clear cart on successful checkout
      setCartItems([]);
      setShowCheckout(false);

    } catch (err) {
      console.error("Checkout failed:", err);
      const msg = err.response?.data?.message || err.message || "Unknown error";
      const shortages = err.response?.status === 422 ? (err.response?.data?.shortages || []) : [];
      if (shortages.length > 0) {
        const lines = shortages.map(s => `• ${s.material_name} (SKU ${s.sku}): need ${s.required}, on hand ${s.on_hand}, deficit ${s.deficit} for ${s.product_name}`).join("\n");
        alert(`Cannot place order due to insufficient materials:\n\n${lines}\n\nPlease reduce quantity or wait for replenishment.`);
      } else {
        alert(`Checkout failed: ${msg}`);
      }
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || item.price || 0) * item.quantity,
    0
  );

  // Helper function to get image URL
  const getImageUrl = (item) => {
    const imagePath = item.product?.image || item.image;
    if (!imagePath) return "https://via.placeholder.com/150";
    
    // If image path already includes the full URL, use it as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // Try both possible path formats to match your AdminProductsTable
    if (imagePath.startsWith('storage/')) {
      return `http://localhost:8000/${imagePath}`;
    } else {
      return `http://localhost:8000/storage/${imagePath}`;
    }
  };

  // Helper function to get product name
  const getProductName = (item) => {
    return item.product?.name || item.name || "Unknown Product";
  };

  // Helper function to get product price
  const getProductPrice = (item) => {
    return item.product?.price || item.price || 0;
  };

  if (loading) return <p>Loading cart...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="cart-container">
      {cartItems.length > 0 ? (
        <div className="cart-grid">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-card">
              <img
                src={getImageUrl(item)}
                alt={getProductName(item)}
                className="cart-item-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150";
                }}
              />

              <div className="cart-details">
                <h5>{getProductName(item)}</h5>
                <p className="price">₱{getProductPrice(item)}</p>

                <div className="d-flex align-items-center">
                  <button
                    onClick={() =>
                      handleEditQuantity(item.id, Math.max(item.quantity - 1, 1))
                    }
                  >
                    ➖
                  </button>
                  <span className="mx-2">{item.quantity}</span>
                  <button
                    onClick={() => handleEditQuantity(item.id, item.quantity + 1)}
                  >
                    ➕
                  </button>
                </div>

                <p className="subtotal">
                  Subtotal: ₱{getProductPrice(item) * item.quantity}
                </p>
              </div>

              <div className="cart-actions">
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  ❌ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-cart">Your cart is empty 🛍️</p>
      )}
      {showCheckout && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h5 className="mb-3">Checkout</h5>
            <div className="mb-2">
              <label className="form-label">Shipping Address</label>
              <textarea className="form-control" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Unit, Street, Barangay, City, Province, ZIP" />
            </div>
            <div className="mb-2">
              <label className="form-label">Contact Phone</label>
              <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxxx" />
            </div>
            <div className="mb-3">
              <label className="form-label">Payment Method</label>
              <div className="pm-row">
                <label className={`pm-pill ${paymentMethod==='cod'?'active':''}`}>
                  <input type="radio" name="pm" value="cod" checked={paymentMethod==='cod'} onChange={() => setPaymentMethod('cod')} />
                  Cash on Delivery
                </label>
                <label className={`pm-pill ${paymentMethod==='gcash'?'active':''}`}>
                  <input type="radio" name="pm" value="gcash" checked={paymentMethod==='gcash'} onChange={() => setPaymentMethod('gcash')} />
                  GCash
                </label>
                <label className={`pm-pill ${paymentMethod==='maya'?'active':''}`}>
                  <input type="radio" name="pm" value="maya" checked={paymentMethod==='maya'} onChange={() => setPaymentMethod('maya')} />
                  Maya
                </label>
              </div>
            </div>

            {paymentMethod !== 'cod' && (
              <div className="alert alert-info p-2 mb-3">
                You will be redirected to complete your payment after placing the order.
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowCheckout(false)} disabled={payLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  setPayLoading(true);
                  if (paymentMethod === 'cod') {
                    await handleCheckout();
                  } else {
                    const res = await api.post('/checkout', {
                      payment_method: paymentMethod,
                      shipping_address: address,
                      contact_phone: phone,
                    });
                    const orderId = res?.data?.order_id || res?.data?.order?.id;
                    if (!orderId) throw new Error('Order not created');
                    const init = await api.post('/payments/init', {
                      order_id: orderId,
                      provider: paymentMethod,
                    });
                    const url = init?.data?.checkout_url;
                    if (url) window.open(url, '_blank');
                    // Poll payment status for up to ~2 minutes
                    const start = Date.now();
                    const poll = async () => {
                      try {
                        const s = await api.get(`/orders/${orderId}/payment-status`);
                        if (s?.data?.payment_status === 'paid') {
                          alert('Payment confirmed. Thank you!');
                          setCartItems([]);
                          setShowCheckout(false);
                          return;
                        }
                      } catch {}
                      if (Date.now() - start < 120000) {
                        setTimeout(poll, 3000);
                      }
                    };
                    poll();
                  }
                } catch (e) {
                  alert(e?.response?.data?.message || e.message || 'Payment failed');
                } finally {
                  setPayLoading(false);
                }
              }} disabled={payLoading}>
                {payLoading ? 'Processing…' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
      {cartItems.length > 0 && (
        <div className="summary-box mt-4">
          <h5>Order Summary</h5>
          <p>Total Items: {totalItems}</p>
          <p>Total Price: ₱{totalPrice}</p>
          <button className="btn-checkout" onClick={() => setShowCheckout(true)}>
            Proceed to Checkout →
          </button>
        </div>
      )}
      {showCheckout && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h5 className="mb-3">Checkout</h5>
            <div className="mb-2">
              <label className="form-label">Shipping Address</label>
              <textarea className="form-control" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Unit, Street, Barangay, City, Province, ZIP" />
            </div>
            <div className="mb-2">
              <label className="form-label">Contact Phone</label>
              <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxxx" />
            </div>
            <div className="mb-3">
              <label className="form-label">Payment Method</label>
              <div className="pm-row">
                <label className={`pm-pill ${paymentMethod==='cod'?'active':''}`}>
                  <input type="radio" name="pm" value="cod" checked={paymentMethod==='cod'} onChange={() => setPaymentMethod('cod')} />
                  Cash on Delivery
                </label>
                <label className={`pm-pill ${paymentMethod==='gcash'?'active':''}`}>
                  <input type="radio" name="pm" value="gcash" checked={paymentMethod==='gcash'} onChange={() => setPaymentMethod('gcash')} />
                  GCash
                </label>
                <label className={`pm-pill ${paymentMethod==='maya'?'active':''}`}>
                  <input type="radio" name="pm" value="maya" checked={paymentMethod==='maya'} onChange={() => setPaymentMethod('maya')} />
                  Maya
                </label>
              </div>
            </div>

            {paymentMethod !== 'cod' && (
              <div className="alert alert-info p-2 mb-3">
                You will be redirected to complete your payment after placing the order.
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowCheckout(false)} disabled={payLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  setPayLoading(true);
                  if (paymentMethod === 'cod') {
                    await handleCheckout();
                  } else {
                    const res = await api.post('/checkout', {
                      payment_method: paymentMethod,
                      shipping_address: address,
                      contact_phone: phone,
                    });
                    const orderId = res?.data?.order_id || res?.data?.order?.id;
                    if (!orderId) throw new Error('Order not created');
                    const init = await api.post('/payments/init', {
                      order_id: orderId,
                      provider: paymentMethod,
                    });
                    const url = init?.data?.checkout_url;
                    if (url) window.open(url, '_blank');
                    alert('Order placed. Complete payment in the opened page. After payment, return here.');
                    setCartItems([]);
                    setShowCheckout(false);
                  }
                } catch (e) {
                  alert(e?.response?.data?.message || e.message || 'Payment failed');
                } finally {
                  setPayLoading(false);
                }
              }} disabled={payLoading}>
                {payLoading ? 'Processing…' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
  
      <style jsx>{`
        .cart-container {
          padding: 20px;
        }

        .cart-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .cart-card {
          background: #fffdf9;
          border: 2px solid #e0c097;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 10px rgba(107, 66, 38, 0.1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .cart-img img {
          width: 100%;
          height: 150px;
          object-fit: contain;
          border-bottom: 1px solid #eee;
          margin-bottom: 10px;
        }

        .cart-details h5 {
          color: #6b4226;
          font-weight: bold;
        }

        .price {
          font-weight: bold;
          color: #c0392b;
        }

        .subtotal {
          font-size: 0.9rem;
          color: #555;
        }

        .cart-actions {
          margin-top: auto;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-edit,
        .btn-remove {
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-edit {
          background: #f1c40f;
          color: #6b4226;
        }
        .btn-edit:hover {
          background: #d4ac0d;
        }

        .btn-remove {
          background: #e74c3c;
          color: white;
        }
        .btn-remove:hover {
          background: #c0392b;
        }

        /* Order Summary Box */
        .summary-box {
          background: #fefaf6;
          border: 2px solid #6b4226;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(107, 66, 38, 0.15);
          max-width: 400px;
          margin-left: auto;
        }

        .btn-checkout {
          width: 100%;
          background: #6b4226;
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-weight: bold;
          transition: 0.3s;
          border: none;
        }
        .btn-checkout:hover {
          background: #8e5b3d;
        }

        .empty-cart {
          text-align: center;
          font-size: 1.2rem;
          color: #6b4226;
          margin-top: 50px;
        }
        
        .cart-item-image {
          width: 100%;
          max-height: 120px;
          object-fit: contain;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 10px;
        }

        .d-flex {
          display: flex;
        }

        .align-items-center {
          align-items: center;
        }

        .mx-2 {
          margin: 0 8px;
        }

        .mx-2 {
          margin: 0 8px;
          font-weight: bold;
          min-width: 30px;
          text-align: center;
        }

        .cart-details button {
          background: #6b4226;
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .cart-details button:hover {
          background: #8e5b3d;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-card {
          background: #ffffff;
          border-radius: 12px;
          width: 600px;
          max-width: 95vw;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          border: 1px solid #e6e6e6;
        }
        .form-label { font-weight: 600; }
        .form-control {
          width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;
        }
        .pm-row { display: flex; gap: 10px; }
        .pm-pill {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          border: 2px solid #6b4226; color: #6b4226; border-radius: 999px; cursor: pointer; user-select: none;
        }
        .pm-pill.active, .pm-pill:hover { background: #6b4226; color: white; }
      `}</style>
    </div>
  );
};

export default CartTable;