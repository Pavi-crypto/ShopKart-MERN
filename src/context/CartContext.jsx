import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartQuantity as apiUpdateCartQuantity,
  removeFromCart as apiRemoveFromCart,
} from '../services/api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // In-flight promise ref to deduplicate simultaneous calls to fetchCart
  const fetchPromiseRef = useRef(null);

  const fetchCart = useCallback(async () => {
    // If a cart request is already in-flight, return the existing promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    setLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const data = await apiGetCart();
        if (data && data.success && Array.isArray(data.cart)) {
          setCartItems(data.cart);
          return data.cart;
        }
        return [];
      } catch (err) {
        if (err.response?.status === 401) {
          // User not logged in, keep empty cart without showing error
          setCartItems([]);
        } else {
          setError('Unable to load your cart.');
        }
        return [];
      } finally {
        setLoading(false);
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, []);

  // Fetch cart on initial mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(
    async (productId) => {
      const data = await apiAddToCart(productId);
      if (data && data.success && Array.isArray(data.cart)) {
        setCartItems(data.cart);
      } else {
        await fetchCart();
      }
      return data;
    },
    [fetchCart]
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      const data = await apiUpdateCartQuantity(productId, quantity);
      if (data && data.success && Array.isArray(data.cart)) {
        setCartItems(data.cart);
      } else {
        await fetchCart();
      }
      return data;
    },
    [fetchCart]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      const data = await apiRemoveFromCart(productId);
      if (data && data.success && Array.isArray(data.cart)) {
        setCartItems(data.cart);
      } else {
        await fetchCart();
      }
      return data;
    },
    [fetchCart]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
    setError(null);
  }, []);

  // Derived values calculated from the shared cart state
  const totalUnits = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = item.product?.price || 0;
      const qty = Number(item.quantity) || 0;
      return acc + price * qty;
    }, 0);
  }, [cartItems]);

  const value = useMemo(
    () => ({
      cartItems,
      loading,
      error,
      totalUnits,
      subtotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      fetchCart,
      refreshCart: fetchCart,
      clearCart,
    }),
    [
      cartItems,
      loading,
      error,
      totalUnits,
      subtotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      fetchCart,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
