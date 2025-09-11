import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCart } from "../api/carts";
import { useAuth } from "./AuthContext";

const ActiveCartContext = createContext();

export const ActiveCartProvider = ({ children }) => {
  const [activeCart, setActiveCart] = useState(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const { token } = useAuth();
  const tokenValue = typeof token === "string" ? token : token?.token;

  // Load the active cart from AsyncStorage or server on startup or when token changes
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedId = await AsyncStorage.getItem("activeCartId");
        if (savedId && tokenValue) {
          try {
            const cartData = await getCart(savedId, tokenValue); // ✅ Fetch full cart from server
            if (cartData) {
              setActiveCart(cartData);
            } else {
              await AsyncStorage.removeItem("activeCartId");
              setActiveCart(null);
            }
          } catch (err) {
            console.log("❌ נכשל בטעינת העגלה מהשרת", err);
            setActiveCart(null);
          }
        } else {
          setActiveCart(null);
        }
      } catch (err) {
        console.log("❌ נכשל בטעינת העגלה", err);
        setActiveCart(null);
      } finally {
        setLoadingCart(false);
      }
    };

    loadCart();
  }, [tokenValue]);

  // Change the active cart and persist its ID in AsyncStorage
  const changeActiveCart = async (cart) => {
    try {
      setActiveCart(cart);
      if (cart?._id) {
        await AsyncStorage.setItem("activeCartId", cart._id);
      } else {
        await AsyncStorage.removeItem("activeCartId");
      }
    } catch (err) {
      console.log("❌ נכשל בשמירת העגלה הפעילה", err);
    }
  };

  return (
    <ActiveCartContext.Provider value={{ activeCart, changeActiveCart, loadingCart }}>
      {children}
    </ActiveCartContext.Provider>
  );
};

// Custom hook to access the active cart context
export const useActiveCart = () => useContext(ActiveCartContext);
